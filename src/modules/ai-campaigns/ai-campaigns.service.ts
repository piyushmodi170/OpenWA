import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiCampaign } from './entities/ai-campaign.entity';
import { CampaignLead } from './entities/campaign-lead.entity';
import { CreateAiCampaignDto, UpdateAiCampaignDto, ImportLeadsDto } from './dto/ai-campaign.dto';

@Injectable()
export class AiCampaignsService {
  private readonly logger = new Logger(AiCampaignsService.name);

  constructor(
    @InjectRepository(AiCampaign, 'data')
    private readonly campaignRepo: Repository<AiCampaign>,
    @InjectRepository(CampaignLead, 'data')
    private readonly leadRepo: Repository<CampaignLead>,
  ) {}

  // ─── Campaigns ────────────────────────────────────────────────────────────

  async findAll(): Promise<AiCampaign[]> {
    return this.campaignRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AiCampaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async create(dto: CreateAiCampaignDto): Promise<AiCampaign> {
    const campaign = this.campaignRepo.create({
      name: dto.name,
      goal: dto.goal || '',
      sessionId: dto.sessionId || '*',
      messageTemplate: dto.messageTemplate,
      useAiPersonalization: dto.useAiPersonalization ?? true,
      aiProvider: dto.aiProvider || 'openai',
      aiModel: dto.aiModel || 'gpt-4o-mini',
      followUpSequence: dto.followUpSequence || '[]',
      delayBetweenMessages: dto.delayBetweenMessages || 3000,
      stopOnReply: dto.stopOnReply ?? true,
      scheduledAt: dto.scheduledAt || null,
      status: 'draft',
    });
    return this.campaignRepo.save(campaign);
  }

  async update(id: string, dto: UpdateAiCampaignDto): Promise<AiCampaign> {
    const campaign = await this.findOne(id);
    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async delete(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    await this.leadRepo.delete({ campaignId: id });
    await this.campaignRepo.remove(campaign);
  }

  // ─── Leads ────────────────────────────────────────────────────────────────

  async getLeads(campaignId: string): Promise<CampaignLead[]> {
    return this.leadRepo.find({ where: { campaignId }, order: { createdAt: 'ASC' } });
  }

  async importLeads(campaignId: string, dto: ImportLeadsDto): Promise<{ imported: number; skipped: number }> {
    const campaign = await this.findOne(campaignId);
    let imported = 0;
    let skipped = 0;

    for (const lead of dto.leads) {
      const phone = lead.phone.replace(/\D/g, '');
      if (!phone) { skipped++; continue; }
      const existing = await this.leadRepo.findOne({ where: { campaignId, phone } });
      if (existing) { skipped++; continue; }
      await this.leadRepo.save(this.leadRepo.create({
        campaignId,
        phone,
        name: lead.name || '',
        customData: lead.customData || '{}',
        status: 'pending',
      }));
      imported++;
    }

    campaign.totalLeads = await this.leadRepo.count({ where: { campaignId } });
    await this.campaignRepo.save(campaign);
    return { imported, skipped };
  }

  async deleteLead(campaignId: string, leadId: string): Promise<void> {
    await this.leadRepo.delete({ id: leadId, campaignId });
    const campaign = await this.findOne(campaignId);
    campaign.totalLeads = await this.leadRepo.count({ where: { campaignId } });
    await this.campaignRepo.save(campaign);
  }

  // ─── AI Personalization ───────────────────────────────────────────────────

  async personalizeLeads(campaignId: string, apiKey?: string): Promise<{ personalized: number; failed: number }> {
    const campaign = await this.findOne(campaignId);
    const leads = await this.leadRepo.find({ where: { campaignId, status: 'pending' } });
    const key = apiKey || process.env.OPENAI_API_KEY || '';
    let personalized = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        lead.status = 'personalizing';
        await this.leadRepo.save(lead);
        const message = await this.generatePersonalizedMessage(campaign, lead, key);
        lead.personalizedMessage = message;
        lead.status = 'ready';
        await this.leadRepo.save(lead);
        personalized++;
      } catch (err) {
        this.logger.error(`Failed to personalize lead ${lead.id}`, err);
        const simpleMsg = campaign.messageTemplate
          .replace(/\{\{name\}\}/gi, lead.name || 'there')
          .replace(/\{\{phone\}\}/gi, lead.phone);
        lead.personalizedMessage = simpleMsg;
        lead.status = 'ready';
        await this.leadRepo.save(lead);
        failed++;
      }
    }

    return { personalized, failed };
  }

  private async generatePersonalizedMessage(campaign: AiCampaign, lead: CampaignLead, apiKey: string): Promise<string> {
    const customData = JSON.parse(lead.customData || '{}') as Record<string, string>;
    const customContext = Object.entries(customData).map(([k, v]) => `${k}: ${v}`).join(', ');
    const prompt = `You are a messaging expert. Personalize this message template for a specific lead.

Template: "${campaign.messageTemplate}"
Campaign Goal: "${campaign.goal}"
Lead Name: "${lead.name || 'Unknown'}"
Lead Phone: "${lead.phone}"
${customContext ? `Lead Info: ${customContext}` : ''}

Instructions:
- Keep the core message but make it feel personal and relevant to this specific lead
- Use their name naturally if appropriate
- Keep roughly the same length as the template
- Make it feel human, not automated
- Return ONLY the personalized message text, nothing else`;

    if (campaign.aiProvider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: campaign.aiModel || 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: campaign.aiModel || 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    return completion.choices[0]?.message?.content?.trim() || campaign.messageTemplate;
  }

  async getAnalytics(campaignId: string): Promise<{
    total: number; sent: number; delivered: number;
    replied: number; failed: number; pending: number; ready: number;
    deliveryRate: number; replyRate: number;
  }> {
    const leads = await this.getLeads(campaignId);
    const total = leads.length;
    const sent = leads.filter(l => ['sent', 'delivered', 'read', 'replied'].includes(l.status)).length;
    const delivered = leads.filter(l => ['delivered', 'read', 'replied'].includes(l.status)).length;
    const replied = leads.filter(l => l.status === 'replied').length;
    const failed = leads.filter(l => l.status === 'failed').length;
    const pending = leads.filter(l => l.status === 'pending').length;
    const ready = leads.filter(l => l.status === 'ready').length;
    return {
      total, sent, delivered, replied, failed, pending, ready,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    };
  }
}
