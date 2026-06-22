import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AiEmployeeRole {
  SALES_REP = 'sales_rep',
  SUPPORT_AGENT = 'support_agent',
  APPOINTMENT_SETTER = 'appointment_setter',
  FOLLOW_UP_MANAGER = 'follow_up_manager',
  MARKETING_ASSISTANT = 'marketing_assistant',
  RESEARCH_ASSISTANT = 'research_assistant',
  CUSTOM = 'custom',
}

@Entity('ai_employees')
export class AiEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, default: '🤖' })
  avatar: string;

  @Column({ type: 'varchar', length: 30, default: AiEmployeeRole.SUPPORT_AGENT })
  role: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  roleDescription: string;

  @Column({ type: 'text', default: '[]' })
  goals: string;

  @Column({ type: 'text', default: '' })
  personality: string;

  @Column({ type: 'varchar', length: 20, default: 'friendly' })
  tone: string;

  @Column({ type: 'varchar', length: 20, default: 'auto' })
  responseLanguage: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string | null;

  @Column({ type: 'varchar', length: 20, default: 'openai' })
  aiProvider: string;

  @Column({ type: 'varchar', length: 50, default: 'gpt-4o-mini' })
  model: string;

  @Column({ type: 'int', default: 600 })
  maxTokens: number;

  @Column({ type: 'text', default: '[]' })
  allowedTopics: string;

  @Column({ type: 'text', default: '[]' })
  blockedTopics: string;

  @Column({ type: 'text', default: '[]' })
  kpis: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 100, default: '*' })
  sessionId: string;

  @Column({ type: 'int', default: 0 })
  totalConversations: number;

  @Column({ type: 'int', default: 0 })
  totalMessages: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
