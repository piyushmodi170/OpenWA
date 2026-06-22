import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('ai_campaigns')
export class AiCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', default: '' })
  goal: string;

  @Column({ type: 'varchar', length: 100, default: '*' })
  sessionId: string;

  @Column({ type: 'varchar', length: 20, default: CampaignStatus.DRAFT })
  status: string;

  @Column({ type: 'text', default: '' })
  messageTemplate: string;

  @Column({ type: 'boolean', default: true })
  useAiPersonalization: boolean;

  @Column({ type: 'varchar', length: 50, default: 'gpt-4o-mini' })
  aiModel: string;

  @Column({ type: 'varchar', length: 20, default: 'openai' })
  aiProvider: string;

  @Column({ type: 'text', default: '[]' })
  followUpSequence: string;

  @Column({ type: 'int', default: 0 })
  totalLeads: number;

  @Column({ type: 'int', default: 0 })
  sent: number;

  @Column({ type: 'int', default: 0 })
  delivered: number;

  @Column({ type: 'int', default: 0 })
  replied: number;

  @Column({ type: 'int', default: 0 })
  failed: number;

  @Column({ type: 'int', default: 3000 })
  delayBetweenMessages: number;

  @Column({ type: 'boolean', default: true })
  stopOnReply: boolean;

  @Column({ type: 'text', nullable: true })
  scheduledAt: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
