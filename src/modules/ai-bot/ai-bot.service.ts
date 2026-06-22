import { Injectable, OnModuleInit, NotFoundException, Logger, forwardRef, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiBotConfig } from './entities/ai-bot-config.entity';
import { AiProviderKey } from './entities/ai-provider-key.entity';
import { CreateAiBotConfigDto, UpdateAiBotConfigDto, SaveProviderKeyDto } from './dto/ai-bot.dto';
import { HookManager } from '../../core/hooks/hook-manager.service';
import { HookContext, HookResult } from '../../core/hooks';
import { IncomingMessage } from '../../engine/interfaces/whatsapp-engine.interface';
import { MessageService } from '../message/message.service';
import { AiEmployeesService } from '../ai-employees/ai-employees.service';
import { AiTrainingService } from '../ai-training/ai-training.service';

@Injectable()
export class AiBotService implements OnModuleInit {
  private readonly logger = new Logger(AiBotService.name);

  constructor(
    @InjectRepository(AiBotConfig, 'data')
    private readonly repo: Repository<AiBotConfig>,
    @InjectRepository(AiProviderKey, 'data')
    private readonly providerKeyRepo: Repository<AiProviderKey>,
    private readonly hookManager: HookManager,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Optional() private readonly employeesService: AiEmployeesService,
    @Optional() private readonly trainingService: AiTrainingService,
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
    const provider = config.aiProvider || 'openai';

    // Resolve API key: per-config → saved provider key → env fallback
    const apiKey = config.apiKey || await this.getProviderApiKey(provider);

    if (!apiKey) {
      throw new Error(`No API key configured for provider "${provider}". Add one in Provider Keys.`);
    }

    // Build system prompt — employee-mode takes priority over legacy bot config
    let systemPrompt: string;
    if (config.employeeId && this.employeesService && this.trainingService) {
      systemPrompt = await this.buildEmployeeSystemPrompt(config.employeeId);
    } else {
      systemPrompt = config.systemPrompt?.trim() || this.buildSystemPrompt(config);
    }

    if (provider === 'gemini') {
      return this.callGemini(apiKey, config.model || 'gemini-2.0-flash', systemPrompt, userMessage, config.maxTokens || 500);
    }
    return this.callOpenAI(apiKey, config.model || 'gpt-4o-mini', systemPrompt, userMessage, config.maxTokens || 500);
  }

  private async buildEmployeeSystemPrompt(employeeId: string): Promise<string> {
    try {
      const [employee, knowledge, examples, rules] = await Promise.all([
        this.employeesService!.findOne(employeeId),
        this.trainingService!.buildKnowledgeContext(employeeId),
        this.trainingService!.buildExamplesContext(employeeId),
        this.trainingService!.buildRulesContext(employeeId),
      ]);
      return this.employeesService!.buildSystemPrompt(employee, knowledge, examples, rules);
    } catch (err) {
      this.logger.warn(`Failed to build employee prompt for ${employeeId}, falling back to default`, err);
      return 'You are a helpful AI assistant. Keep responses concise and friendly.';
    }
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

  // ─── Bot Config CRUD ────────────────────────────────────────────────────────

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

  // ─── Provider Keys ──────────────────────────────────────────────────────────

  async listProviderKeys(): Promise<{ id: string; provider: string; label: string; maskedKey: string; createdAt: Date }[]> {
    const keys = await this.providerKeyRepo.find({ order: { createdAt: 'ASC' } });
    return keys.map(k => ({
      id: k.id,
      provider: k.provider,
      label: k.label,
      maskedKey: this.maskKey(k.apiKey),
      createdAt: k.createdAt,
    }));
  }

  async saveProviderKey(dto: SaveProviderKeyDto): Promise<{ id: string; provider: string; label: string; maskedKey: string }> {
    // One key per provider — upsert
    let existing = await this.providerKeyRepo.findOne({ where: { provider: dto.provider } });
    if (existing) {
      existing.apiKey = dto.apiKey;
      existing.label = dto.label || existing.label;
      existing = await this.providerKeyRepo.save(existing);
      return { id: existing.id, provider: existing.provider, label: existing.label, maskedKey: this.maskKey(existing.apiKey) };
    }
    const created = await this.providerKeyRepo.save(
      this.providerKeyRepo.create({ provider: dto.provider, label: dto.label || dto.provider, apiKey: dto.apiKey }),
    );
    return { id: created.id, provider: created.provider, label: created.label, maskedKey: this.maskKey(created.apiKey) };
  }

  async deleteProviderKey(id: string): Promise<void> {
    const key = await this.providerKeyRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException(`Provider key ${id} not found`);
    await this.providerKeyRepo.remove(key);
  }

  async getProviderApiKey(provider: string): Promise<string> {
    const key = await this.providerKeyRepo.findOne({ where: { provider } });
    if (key) return key.apiKey;
    if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
    return '';
  }

  private maskKey(key: string): string {
    if (!key || key.length < 8) return '••••••••';
    return key.slice(0, 6) + '••••••••' + key.slice(-4);
  }

  // ─── Model Listing ──────────────────────────────────────────────────────────

  async listModels(provider: string, apiKey: string): Promise<{ id: string; label: string }[]> {
    if (provider === 'gemini') {
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
