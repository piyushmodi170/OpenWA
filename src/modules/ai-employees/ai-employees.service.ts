import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiEmployee } from './entities/ai-employee.entity';
import { CreateAiEmployeeDto, UpdateAiEmployeeDto } from './dto/ai-employee.dto';

@Injectable()
export class AiEmployeesService {
  constructor(
    @InjectRepository(AiEmployee, 'data')
    private readonly repo: Repository<AiEmployee>,
  ) {}

  async findAll(): Promise<AiEmployee[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AiEmployee> {
    const employee = await this.repo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException(`AI Employee ${id} not found`);
    return employee;
  }

  async create(dto: CreateAiEmployeeDto): Promise<AiEmployee> {
    const employee = this.repo.create({
      name: dto.name,
      avatar: dto.avatar || '🤖',
      role: dto.role || 'support_agent',
      roleDescription: dto.roleDescription || '',
      goals: dto.goals || '[]',
      personality: dto.personality || '',
      tone: dto.tone || 'friendly',
      responseLanguage: dto.responseLanguage || 'auto',
      systemPrompt: dto.systemPrompt || null,
      aiProvider: dto.aiProvider || 'openai',
      model: dto.model || 'gpt-4o-mini',
      maxTokens: dto.maxTokens || 600,
      allowedTopics: dto.allowedTopics || '[]',
      blockedTopics: dto.blockedTopics || '[]',
      kpis: dto.kpis || '[]',
      sessionId: dto.sessionId || '*',
      enabled: dto.enabled ?? true,
    });
    return this.repo.save(employee);
  }

  async update(id: string, dto: UpdateAiEmployeeDto): Promise<AiEmployee> {
    const employee = await this.findOne(id);
    Object.assign(employee, dto);
    return this.repo.save(employee);
  }

  async delete(id: string): Promise<void> {
    const employee = await this.findOne(id);
    await this.repo.remove(employee);
  }

  async incrementStats(id: string, messages: number = 1): Promise<void> {
    await this.repo.increment({ id }, 'totalMessages', messages);
    await this.repo.increment({ id }, 'totalConversations', 1);
  }

  buildSystemPrompt(employee: AiEmployee, knowledgeContext?: string, examples?: string, rules?: string): string {
    const toneMap: Record<string, string> = {
      friendly: 'You are friendly, warm, and approachable.',
      professional: 'You are professional, competent, and courteous.',
      formal: 'You are formal, precise, and structured.',
      casual: 'You are casual, relaxed, and conversational.',
      empathetic: 'You are empathetic, understanding, and patient.',
    };

    const roleLabels: Record<string, string> = {
      sales_rep: 'Sales Representative',
      support_agent: 'Customer Support Agent',
      appointment_setter: 'Appointment Setter',
      follow_up_manager: 'Follow-up Manager',
      marketing_assistant: 'Marketing Assistant',
      research_assistant: 'Research Assistant',
      custom: 'AI Assistant',
    };

    if (employee.systemPrompt?.trim()) return employee.systemPrompt.trim();

    const parts: string[] = [
      `You are ${employee.name}, an AI ${roleLabels[employee.role] || 'Assistant'}.`,
      toneMap[employee.tone] || toneMap['friendly'],
    ];

    if (employee.roleDescription) parts.push(`Your role: ${employee.roleDescription}`);
    if (employee.personality) parts.push(`Your personality: ${employee.personality}`);

    const goals: string[] = JSON.parse(employee.goals || '[]');
    if (goals.length > 0) parts.push(`Your goals:\n${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}`);

    const allowedTopics: string[] = JSON.parse(employee.allowedTopics || '[]');
    const blockedTopics: string[] = JSON.parse(employee.blockedTopics || '[]');
    if (allowedTopics.length > 0) parts.push(`Only discuss: ${allowedTopics.join(', ')}.`);
    if (blockedTopics.length > 0) parts.push(`Never discuss: ${blockedTopics.join(', ')}.`);

    if (rules) parts.push(`Rules to follow:\n${rules}`);
    if (knowledgeContext) parts.push(`Knowledge base:\n${knowledgeContext}`);
    if (examples) parts.push(`Response examples:\n${examples}`);

    if (employee.responseLanguage && employee.responseLanguage !== 'auto') {
      parts.push(`Always respond in ${employee.responseLanguage}.`);
    }

    parts.push('Keep responses concise, helpful, and in character.');
    return parts.join('\n\n');
  }
}
