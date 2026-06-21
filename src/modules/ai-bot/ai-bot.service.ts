import { Injectable, OnModuleInit, NotFoundException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiBotConfig } from './entities/ai-bot-config.entity';
import { CreateAiBotConfigDto, UpdateAiBotConfigDto } from './dto/ai-bot.dto';
import { HookManager } from '../../core/hooks/hook-manager.service';
import { HookContext, HookResult } from '../../core/hooks';
import { IncomingMessage } from '../../engine/interfaces/whatsapp-engine.interface';
import { MessageService } from '../message/message.service';

@Injectable()
export class AiBotService implements OnModuleInit {
  private readonly logger = new Logger(AiBotService.name);

  constructor(
    @InjectRepository(AiBotConfig, 'data')
    private readonly repo: Repository<AiBotConfig>,
    private readonly hookManager: HookManager,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
  ) {}

  onModuleInit(): void {
    this.hookManager.register('ai-bot', 'message:received', ctx =>
      this.onMessage(ctx as HookContext<IncomingMessage>),
    );
    this.logger.log('AI Bot message hook registered');
  }

  private async onMessage(ctx: HookContext<IncomingMessage>): Promise<HookResult> {
    const message = ctx.data;
    if (ctx.source !== 'Engine' || !ctx.sessionId || message.fromMe || message.isGroup) {
      return { continue: true };
    }
    if (!message.body?.trim()) return { continue: true };

    try {
      const config = await this.findConfigForSession(ctx.sessionId);
      if (!config || !config.enabled) return { continue: true };

      const reply = await this.generateReply(config, message.body);
      if (reply && ctx.sessionId) {
        await this.messageService.sendText(ctx.sessionId, { chatId: message.chatId, text: reply });
      }
    } catch (err) {
      this.logger.error('AI Bot error', err);
    }

    return { continue: true };
  }

  async generateReply(config: AiBotConfig, userMessage: string): Promise<string> {
    const fallback = config.fallbackMessage || 'Sorry, I am unable to respond right now. Please try again later.';
    try {
      return await this.generateReplyRaw(config, userMessage);
    } catch (err) {
      const provider = config.aiProvider || 'openai';
      this.logger.error(`${provider} request failed`, err);
      return fallback;
    }
  }

  async generateReplyRaw(config: AiBotConfig, userMessage: string): Promise<string> {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    const provider = config.aiProvider || 'openai';
    const systemPrompt = config.systemPrompt?.trim() || this.buildSystemPrompt(config);

    if (!apiKey) {
      throw new Error(`No API key configured for provider "${provider}"`);
    }

    if (provider === 'gemini') {
      return this.callGemini(apiKey, config.model || 'gemini-2.0-flash', systemPrompt, userMessage, config.maxTokens || 500);
    }
    return this.callOpenAI(apiKey, config.model || 'gpt-4o-mini', systemPrompt, userMessage, config.maxTokens || 500);
  }

  private async callOpenAI(apiKey: string, model: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  }

  private async callGemini(apiKey: string, model: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    });
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return result.response.text()?.trim() || '';
  }

  private buildSystemPrompt(config: AiBotConfig): string {
    const toneMap: Record<string, string> = {
      friendly: 'You are friendly, warm, and approachable.',
      professional: 'You are professional and courteous.',
      formal: 'You are formal and precise.',
    };
    const toneLine = toneMap[config.tone] || toneMap['friendly'];

    if (config.botType === 'casual') {
      const parts: string[] = [
        'You are a helpful and conversational AI assistant.',
        toneLine,
        'Engage naturally with the user, answer their questions, and have a pleasant conversation.',
      ];
      if (config.responseLanguage && config.responseLanguage !== 'auto') {
        parts.push(`Always respond in ${config.responseLanguage}.`);
      }
      parts.push('Keep responses concise and helpful.');
      return parts.join('\n\n');
    }

    const services: string[] = JSON.parse(config.companyServices || '[]');
    const faqs: { q: string; a: string }[] = JSON.parse(config.companyFaqs || '[]');

    const parts: string[] = [
      `You are a customer service assistant for ${config.companyName || 'our company'}.`,
      toneLine,
    ];

    if (config.companyDescription) {
      parts.push(`About us: ${config.companyDescription}`);
    }
    if (services.length > 0) {
      parts.push(`Our services: ${services.join(', ')}.`);
    }
    if (faqs.length > 0) {
      const faqText = faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
      parts.push(`Frequently asked questions:\n${faqText}`);
    }
    if (config.responseLanguage && config.responseLanguage !== 'auto') {
      parts.push(`Always respond in ${config.responseLanguage}.`);
    }
    parts.push('Keep responses concise and helpful. Only answer questions relevant to the company and its services.');

    return parts.join('\n\n');
  }

  async findAll(): Promise<AiBotConfig[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AiBotConfig> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`AI Bot config ${id} not found`);
    return config;
  }

  async findConfigForSession(sessionId: string): Promise<AiBotConfig | null> {
    const specific = await this.repo.findOne({ where: { sessionId, enabled: true } });
    if (specific) return specific;
    return this.repo.findOne({ where: { sessionId: '*', enabled: true } });
  }

  async create(dto: CreateAiBotConfigDto): Promise<AiBotConfig> {
    const config = this.repo.create({
      sessionId: dto.sessionId || '*',
      aiProvider: dto.aiProvider || 'openai',
      apiKey: dto.apiKey || null,
      botType: dto.botType || 'company',
      companyName: dto.companyName || '',
      companyDescription: dto.companyDescription || '',
      companyServices: dto.companyServices || '[]',
      companyFaqs: dto.companyFaqs || '[]',
      tone: dto.tone || 'friendly',
      responseLanguage: dto.responseLanguage || 'auto',
      systemPrompt: dto.systemPrompt || null,
      model: dto.model || 'gpt-4o-mini',
      maxTokens: dto.maxTokens || 500,
      fallbackMessage: dto.fallbackMessage || null,
      enabled: dto.enabled ?? false,
    });
    return this.repo.save(config);
  }

  async update(id: string, dto: UpdateAiBotConfigDto): Promise<AiBotConfig> {
    const config = await this.findOne(id);
    Object.assign(config, dto);
    return this.repo.save(config);
  }

  async delete(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.repo.remove(config);
  }

  async listModels(provider: string, apiKey: string): Promise<{ id: string; label: string }[]> {
    if (provider === 'gemini') {
      // Use the Gemini REST API directly — the SDK does not expose listModels
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${body}`);
      }
      const data = await res.json() as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
      return (data.models ?? [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({ id: m.name.replace('models/', ''), label: m.displayName || m.name.replace('models/', '') }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    // OpenAI — filter to chat-capable models only
    const client = new OpenAI({ apiKey });
    const res = await client.models.list();
    return res.data
      .filter(m => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.startsWith('chatgpt'))
      .sort((a, b) => b.created - a.created)
      .map(m => ({ id: m.id, label: m.id }));
  }

  hasEnvFallbackKey(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}
