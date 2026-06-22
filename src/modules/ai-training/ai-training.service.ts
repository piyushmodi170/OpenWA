import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { TrainingExample } from './entities/training-example.entity';
import { TrainingRule } from './entities/training-rule.entity';
import {
  CreateKnowledgeDocumentDto, UpdateKnowledgeDocumentDto,
  CreateTrainingExampleDto, UpdateTrainingExampleDto,
  CreateTrainingRuleDto, UpdateTrainingRuleDto,
} from './dto/ai-training.dto';

@Injectable()
export class AiTrainingService {
  constructor(
    @InjectRepository(KnowledgeDocument, 'data')
    private readonly docRepo: Repository<KnowledgeDocument>,
    @InjectRepository(TrainingExample, 'data')
    private readonly exampleRepo: Repository<TrainingExample>,
    @InjectRepository(TrainingRule, 'data')
    private readonly ruleRepo: Repository<TrainingRule>,
  ) {}

  // ─── Knowledge Documents ─────────────────────────────────────────────────────

  async findAllDocuments(employeeId?: string): Promise<KnowledgeDocument[]> {
    const where = employeeId ? [{ employeeId }, { employeeId: null as unknown as string }] : {};
    return this.docRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOneDocument(id: string): Promise<KnowledgeDocument> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Knowledge document ${id} not found`);
    return doc;
  }

  async createDocument(dto: CreateKnowledgeDocumentDto): Promise<KnowledgeDocument> {
    const wordCount = dto.content.trim().split(/\s+/).length;
    const qualityScore = this.calculateQualityScore(dto.content);
    const doc = this.docRepo.create({
      employeeId: dto.employeeId || null,
      title: dto.title,
      content: dto.content,
      type: dto.type || 'text',
      source: dto.source || '',
      wordCount,
      qualityScore,
      tags: dto.tags || '[]',
      enabled: dto.enabled ?? true,
    });
    return this.docRepo.save(doc);
  }

  async updateDocument(id: string, dto: UpdateKnowledgeDocumentDto): Promise<KnowledgeDocument> {
    const doc = await this.findOneDocument(id);
    Object.assign(doc, dto);
    if (dto.content) {
      doc.wordCount = dto.content.trim().split(/\s+/).length;
      doc.qualityScore = this.calculateQualityScore(dto.content);
    }
    return this.docRepo.save(doc);
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await this.findOneDocument(id);
    await this.docRepo.remove(doc);
  }

  // ─── Training Examples ────────────────────────────────────────────────────────

  async findAllExamples(employeeId?: string): Promise<TrainingExample[]> {
    const where = employeeId ? [{ employeeId }, { employeeId: null as unknown as string }] : {};
    return this.exampleRepo.find({ where, order: { priority: 'DESC', createdAt: 'DESC' } });
  }

  async findOneExample(id: string): Promise<TrainingExample> {
    const ex = await this.exampleRepo.findOne({ where: { id } });
    if (!ex) throw new NotFoundException(`Training example ${id} not found`);
    return ex;
  }

  async createExample(dto: CreateTrainingExampleDto): Promise<TrainingExample> {
    const ex = this.exampleRepo.create({
      employeeId: dto.employeeId || null,
      trigger: dto.trigger,
      response: dto.response,
      category: dto.category || 'general',
      priority: dto.priority || 5,
      enabled: dto.enabled ?? true,
    });
    return this.exampleRepo.save(ex);
  }

  async updateExample(id: string, dto: UpdateTrainingExampleDto): Promise<TrainingExample> {
    const ex = await this.findOneExample(id);
    Object.assign(ex, dto);
    return this.exampleRepo.save(ex);
  }

  async deleteExample(id: string): Promise<void> {
    const ex = await this.findOneExample(id);
    await this.exampleRepo.remove(ex);
  }

  // ─── Training Rules ───────────────────────────────────────────────────────────

  async findAllRules(employeeId?: string): Promise<TrainingRule[]> {
    const where = employeeId ? [{ employeeId }, { employeeId: null as unknown as string }] : {};
    return this.ruleRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOneRule(id: string): Promise<TrainingRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Training rule ${id} not found`);
    return rule;
  }

  async createRule(dto: CreateTrainingRuleDto): Promise<TrainingRule> {
    const rule = this.ruleRepo.create({
      employeeId: dto.employeeId || null,
      rule: dto.rule,
      type: dto.type || 'never',
      enabled: dto.enabled ?? true,
    });
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: string, dto: UpdateTrainingRuleDto): Promise<TrainingRule> {
    const rule = await this.findOneRule(id);
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.findOneRule(id);
    await this.ruleRepo.remove(rule);
  }

  // ─── Context Building ─────────────────────────────────────────────────────────

  async buildKnowledgeContext(employeeId?: string, maxChars = 3000): Promise<string> {
    const docs = await this.findAllDocuments(employeeId);
    const enabled = docs.filter(d => d.enabled);
    if (enabled.length === 0) return '';
    let context = '';
    for (const doc of enabled) {
      const chunk = `[${doc.title}]\n${doc.content}\n\n`;
      if (context.length + chunk.length > maxChars) break;
      context += chunk;
    }
    return context.trim();
  }

  async buildExamplesContext(employeeId?: string): Promise<string> {
    const examples = await this.findAllExamples(employeeId);
    const enabled = examples.filter(e => e.enabled);
    if (enabled.length === 0) return '';
    return enabled
      .slice(0, 10)
      .map(e => `User: "${e.trigger}"\nYou: "${e.response}"`)
      .join('\n\n');
  }

  async buildRulesContext(employeeId?: string): Promise<string> {
    const rules = await this.findAllRules(employeeId);
    const enabled = rules.filter(r => r.enabled);
    if (enabled.length === 0) return '';
    return enabled.map(r => `- [${r.type.toUpperCase()}] ${r.rule}`).join('\n');
  }

  async getTrainingStats(employeeId?: string): Promise<{
    documentCount: number;
    wordCount: number;
    averageQualityScore: number;
    exampleCount: number;
    ruleCount: number;
    overallScore: number;
  }> {
    const docs = await this.findAllDocuments(employeeId);
    const examples = await this.findAllExamples(employeeId);
    const rules = await this.findAllRules(employeeId);
    const enabledDocs = docs.filter(d => d.enabled);
    const wordCount = enabledDocs.reduce((sum, d) => sum + d.wordCount, 0);
    const avgQuality = enabledDocs.length > 0 ? enabledDocs.reduce((sum, d) => sum + d.qualityScore, 0) / enabledDocs.length : 0;
    const overallScore = Math.min(100, Math.round(
      (Math.min(enabledDocs.length, 10) / 10) * 40 +
      (Math.min(examples.filter(e => e.enabled).length, 20) / 20) * 30 +
      (avgQuality / 100) * 20 +
      (Math.min(rules.filter(r => r.enabled).length, 5) / 5) * 10
    ));
    return { documentCount: enabledDocs.length, wordCount, averageQualityScore: Math.round(avgQuality), exampleCount: examples.filter(e => e.enabled).length, ruleCount: rules.filter(r => r.enabled).length, overallScore };
  }

  private calculateQualityScore(content: string): number {
    const words = content.trim().split(/\s+/).length;
    if (words < 10) return 20;
    if (words < 50) return 50;
    if (words < 200) return 70;
    if (words < 500) return 85;
    return 95;
  }
}
