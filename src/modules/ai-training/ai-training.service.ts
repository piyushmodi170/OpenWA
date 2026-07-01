import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
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
  private readonly logger = new Logger(AiTrainingService.name);

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

  // ─── URL Fetch ────────────────────────────────────────────────────────────────

  async fetchUrlDocument(dto: { url: string; title?: string; employeeId?: string }): Promise<KnowledgeDocument> {
    const { url, title, employeeId } = dto;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only HTTP/HTTPS URLs are supported');
    }

    this.logger.log(`Fetching URL for knowledge base: ${url}`);

    let raw = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(15_000),
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch URL: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      raw = await response.text();

      if (!contentType.includes('text/html')) {
        const plain = raw.trim();
        if (plain.length < 50) throw new BadRequestException('Page content is too short or could not be extracted');
        return this.createDocument({
          title: (title?.trim() || parsed.hostname).slice(0, 199),
          content: plain.slice(0, 50_000),
          type: 'text',
          source: url,
          employeeId: employeeId || undefined,
        });
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Could not fetch URL: ${(err as Error).message}`);
    }

    const content = this.extractHtmlContent(raw);

    if (content.trim().length < 50) {
      throw new BadRequestException(
        'Page content is too short or could not be extracted. ' +
        'This may be a JavaScript-rendered site. Try pasting the text content directly instead.',
      );
    }

    const pageTitle = title?.trim() || this.extractHtmlTitle(raw) || parsed.hostname + parsed.pathname;

    return this.createDocument({
      title: pageTitle.slice(0, 199),
      content: content.slice(0, 50_000),
      type: 'text',
      source: url,
      employeeId: employeeId || undefined,
    });
  }

  private extractHtmlTitle(html: string): string {
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    if (og) return og.trim();
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    return t ? t.replace(/\s+/g, ' ').trim() : '';
  }

  private extractHtmlContent(html: string): string {
    const parts: string[] = [];

    // 1. JSON-LD structured data (richest machine-readable content)
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const obj = JSON.parse(m[1]) as Record<string, unknown>;
        const texts = this.extractJsonLdText(obj);
        if (texts) parts.push(texts);
      } catch { /* skip malformed */ }
    }

    // 2. Open Graph / meta tags
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const keywords = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';

    const meta: string[] = [];
    if (title) meta.push(`Title: ${title}`);
    if (ogTitle && ogTitle !== title) meta.push(`Page Title: ${ogTitle}`);
    if (ogDesc) meta.push(`Description: ${ogDesc}`);
    else if (metaDesc) meta.push(`Description: ${metaDesc}`);
    if (keywords) meta.push(`Keywords: ${keywords}`);
    if (meta.length) parts.push(meta.join('\n'));

    // 3. Remove noise tags entirely
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // 4. Prefer semantic content containers
    const semantic = (
      cleaned.match(/<article[\s\S]*?<\/article>/gi)?.[0] ||
      cleaned.match(/<main[\s\S]*?<\/main>/gi)?.[0] ||
      cleaned.match(/<section[\s\S]*?<\/section>/gi)?.[0]
    );
    if (semantic) {
      const semText = this.stripHtml(semantic);
      if (semText.trim().length > 100) {
        parts.push(semText);
        return this.collapseWhitespace(parts.join('\n\n'));
      }
    }

    // 5. Extract all <p> and heading tags
    const paragraphMatches = cleaned.matchAll(/<(p|h[1-6]|li|td|th|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi);
    const paragraphs: string[] = [];
    for (const m of paragraphMatches) {
      const text = this.stripHtml(m[2]).trim();
      if (text.length > 20) paragraphs.push(text);
    }
    if (paragraphs.length > 0) {
      parts.push(paragraphs.join('\n'));
      return this.collapseWhitespace(parts.join('\n\n'));
    }

    // 6. Last resort: strip all HTML tags from the whole body
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = this.stripHtml(bodyMatch ? bodyMatch[1] : cleaned);
    if (bodyText.trim().length > 0) parts.push(bodyText);

    return this.collapseWhitespace(parts.join('\n\n'));
  }

  private extractJsonLdText(obj: Record<string, unknown>, depth = 0): string {
    if (depth > 3) return '';
    const interesting = ['name', 'description', 'headline', 'text', 'articleBody', 'about',
      'contentUrl', 'caption', 'alternateName', 'slogan', 'disambiguatingDescription'];
    const parts: string[] = [];
    for (const key of interesting) {
      if (typeof obj[key] === 'string' && (obj[key] as string).length > 10) {
        parts.push(`${key}: ${obj[key]}`);
      }
    }
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const sub = this.extractJsonLdText(val as Record<string, unknown>, depth + 1);
        if (sub) parts.push(sub);
      }
    }
    return parts.join('\n');
  }

  private collapseWhitespace(text: string): string {
    return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  async uploadFileDocument(file: Express.Multer.File, employeeId?: string): Promise<KnowledgeDocument> {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.pdf', '.doc', '.docx', '.txt'];
    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(`Unsupported file type "${ext}". Allowed: PDF, DOC, DOCX, TXT`);
    }

    this.logger.log(`Processing uploaded file: ${file.originalname} (${file.mimetype})`);

    let content = '';
    try {
      if (ext === '.pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ verbosity: 0, data: new Uint8Array(file.buffer) });
        const result = await parser.getText();
        content = typeof result === 'object' && result !== null && 'text' in result
          ? (result as { text: string }).text
          : String(result);
        await parser.destroy();
      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        content = result.value;
      } else {
        content = file.buffer.toString('utf-8');
      }
    } catch (err) {
      throw new BadRequestException(`Could not parse file: ${(err as Error).message}`);
    }

    content = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (content.length > 50_000) {
      content = content.slice(0, 50_000) + '\n\n[Content truncated at 50,000 characters]';
    }
    if (content.trim().length < 10) {
      throw new BadRequestException('File appears to be empty or could not extract text');
    }

    const title = path.basename(file.originalname, ext);
    return this.createDocument({
      title: title.slice(0, 199),
      content,
      type: 'text',
      source: `file:${file.originalname}`,
      employeeId: employeeId || undefined,
    });
  }

  private stripHtml(html: string): string {
    // Remove scripts and styles
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text;
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
