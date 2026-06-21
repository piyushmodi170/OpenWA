import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ai_bot_configs')
export class AiBotConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, default: '*' })
  sessionId: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'varchar', length: 20, default: 'openai' })
  aiProvider: string;

  @Column({ type: 'text', nullable: true })
  apiKey: string | null;

  @Column({ type: 'varchar', length: 20, default: 'company' })
  botType: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  companyName: string;

  @Column({ type: 'text', default: '' })
  companyDescription: string;

  @Column({ type: 'text', default: '[]' })
  companyServices: string;

  @Column({ type: 'text', default: '[]' })
  companyFaqs: string;

  @Column({ type: 'varchar', length: 20, default: 'friendly' })
  tone: string;

  @Column({ type: 'varchar', length: 20, default: 'auto' })
  responseLanguage: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string | null;

  @Column({ type: 'varchar', length: 50, default: 'gpt-4o-mini' })
  model: string;

  @Column({ type: 'int', default: 500 })
  maxTokens: number;

  @Column({ type: 'text', nullable: true })
  fallbackMessage: string | null;

  @Column({ type: 'text', nullable: true })
  greetingMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
