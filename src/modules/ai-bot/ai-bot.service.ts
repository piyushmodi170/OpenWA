import { Injectable, OnModuleInit, NotFoundException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { AiBotConfig } from './entities/ai-bot-config.entity';
import { CreateAiBotConfigDto, UpdateAiBotConfigDto } from './dto/ai-bot.dto';
import { HookManager } from '../../core/hooks/hook-manager.service';
import { HookContext, HookResult } from '../../core/hooks';
import { IncomingMessage } from '../../engine/interfaces/whatsapp-engine.interface';
import { MessageService } from '../message/message.service';

@Injectable()
export class AiBotService implements OnModuleInit {
  private readonly logger = new Logger(AiBotService.name);
  private openai: OpenAI | null = null;

  constructor(
    @InjectRepository(AiBotConfig, 'data')
    private readonly repo: Repository<AiBotConfig>,
    private readonly hookManager: HookManager,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
  ) {}

  onModuleInit(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI bot will not respond (set key to activate)');
    }

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
      if (!this.openai) {
        this.logger.warn('AI Bot triggered but OPENAI_API_KEY is missing');
        return { continue: true };
      }

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
    if (!this.openai) throw new Error('OpenAI not configured');

    const systemPrompt = config.systemPromptOverride?.trim() || this.buildSystemPrompt(config);

    try {
      const completion = await this.openai.chat.completions.create({
        model: config.openaiModel || 'gpt-4o-mini',
        max_tokens: config.maxTokens || 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
      return completion.choices[0]?.message?.content?.trim() || config.fallbackMessage || '';
    } catch (err) {
      this.logger.error('OpenAI request failed', err);
      return config.fallbackMessage || 'Sorry, I am unable to respond right now. Please try again later.';
    }
  }

  private buildSystemPrompt(config: AiBotConfig): string {
    const services: string[] = JSON.parse(config.companyServices || '[]');
    const faqs: { q: string; a: string }[] = JSON.parse(config.companyFaqs || '[]');

    const toneMap: Record<string, string> = {
      friendly: 'You are friendly, warm, and approachable.',
      professional: 'You are professional and courteous.',
      formal: 'You are formal and precise.',
    };

    const parts: string[] = [
      `You are a customer service assistant for ${config.companyName || 'our company'}.`,
      toneMap[config.tone] || toneMap['friendly'],
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
      companyName: dto.companyName,
      companyDescription: dto.companyDescription,
      companyServices: dto.companyServices || '[]',
      companyFaqs: dto.companyFaqs || '[]',
      tone: dto.tone || 'friendly',
      responseLanguage: dto.responseLanguage || 'auto',
      systemPromptOverride: dto.systemPromptOverride || null,
      openaiModel: dto.openaiModel || 'gpt-4o-mini',
      maxTokens: dto.maxTokens || 500,
      fallbackMessage: dto.fallbackMessage || null,
      greetingMessage: dto.greetingMessage || null,
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

  isOpenAiConfigured(): boolean {
    return this.openai !== null;
  }
}
