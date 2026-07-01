import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationAnalysis } from './entities/conversation-analysis.entity';
import { AnalyzeConversationDto } from './dto/conversation-intelligence.dto';
import { AiBotService } from '../ai-bot/ai-bot.service';

@Injectable()
export class ConversationIntelligenceService {
  private readonly logger = new Logger(ConversationIntelligenceService.name);

  constructor(
    @InjectRepository(ConversationAnalysis, 'data')
    private readonly repo: Repository<ConversationAnalysis>,
    @Optional() private readonly aiBotService: AiBotService,
  ) {}

  async findAll(sessionId?: string): Promise<ConversationAnalysis[]> {
    const where = sessionId ? { sessionId } : {};
    return this.repo.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findByChatId(sessionId: string, chatId: string): Promise<ConversationAnalysis | null> {
    return this.repo.findOne({ where: { sessionId, chatId } });
  }

  async analyze(dto: AnalyzeConversationDto): Promise<ConversationAnalysis> {
    const provider = dto.aiProvider || 'openai';
    const apiKey = this.aiBotService
      ? await this.aiBotService.getProviderApiKey(provider)
      : (process.env.OPENAI_API_KEY || '');
    const model = dto.model || 'gpt-4o-mini';

    let analysis: {
      sentiment: string;
      sentimentScore: number;
      interestLevel: number;
      purchaseIntent: number;
      relationshipScore: number;
      keyInfo: string[];
      suggestedActions: string[];
      summary: string;
      stage: string;
    };

    try {
      analysis = await this.runAnalysis(dto.conversationText, provider, model, apiKey);
    } catch (err) {
      this.logger.error('Conversation analysis failed', err);
      analysis = {
        sentiment: 'neutral', sentimentScore: 0, interestLevel: 5,
        purchaseIntent: 0, relationshipScore: 5, keyInfo: [],
        suggestedActions: ['Continue conversation naturally'],
        summary: 'Analysis unavailable — check AI provider key.',
        stage: 'active',
      };
    }

    const existing = await this.findByChatId(dto.sessionId, dto.chatId);
    if (existing) {
      Object.assign(existing, {
        contactName: dto.contactName || existing.contactName,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        interestLevel: analysis.interestLevel,
        purchaseIntent: analysis.purchaseIntent,
        relationshipScore: analysis.relationshipScore,
        keyInfo: JSON.stringify(analysis.keyInfo),
        suggestedActions: JSON.stringify(analysis.suggestedActions),
        summary: analysis.summary,
        stage: analysis.stage,
        lastMessageAnalyzed: dto.conversationText.slice(-200),
        messageCount: existing.messageCount + 1,
      });
      return this.repo.save(existing);
    }

    const record = this.repo.create({
      sessionId: dto.sessionId,
      chatId: dto.chatId,
      contactName: dto.contactName || '',
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      interestLevel: analysis.interestLevel,
      purchaseIntent: analysis.purchaseIntent,
      relationshipScore: analysis.relationshipScore,
      keyInfo: JSON.stringify(analysis.keyInfo),
      suggestedActions: JSON.stringify(analysis.suggestedActions),
      summary: analysis.summary,
      stage: analysis.stage,
      lastMessageAnalyzed: dto.conversationText.slice(-200),
      messageCount: 1,
    });
    return this.repo.save(record);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private async runAnalysis(conversationText: string, provider: string, model: string, apiKey: string) {
    const prompt = `Analyze this WhatsApp conversation and return a JSON object with these exact fields:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number between -1.0 and 1.0,
  "interestLevel": integer 0-10 (how interested is the customer),
  "purchaseIntent": integer 0-10 (likelihood to purchase/convert),
  "relationshipScore": integer 0-10 (quality of relationship),
  "keyInfo": ["list", "of", "key", "facts", "extracted"],
  "suggestedActions": ["action 1", "action 2"],
  "summary": "One sentence summary of this conversation",
  "stage": "new_lead" | "interested" | "negotiating" | "converted" | "lost" | "support" | "active"
}

Conversation:
${conversationText.slice(-3000)}

Return ONLY valid JSON, no markdown.`;

    let raw = '';
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });
      const result = await geminiModel.generateContent(prompt);
      raw = result.response.text().trim();
    } else {
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      raw = completion.choices[0]?.message?.content?.trim() || '{}';
    }

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned);
  }
}
