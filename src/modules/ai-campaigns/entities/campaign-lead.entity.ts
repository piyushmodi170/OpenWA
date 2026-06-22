import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus {
  PENDING = 'pending',
  PERSONALIZING = 'personalizing',
  READY = 'ready',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  REPLIED = 'replied',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('campaign_leads')
export class CampaignLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  campaignId: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  name: string;

  @Column({ type: 'text', default: '{}' })
  customData: string;

  @Column({ type: 'text', default: '' })
  personalizedMessage: string;

  @Column({ type: 'varchar', length: 20, default: LeadStatus.PENDING })
  status: string;

  @Column({ type: 'int', default: 0 })
  followUpStep: number;

  @Column({ type: 'text', nullable: true })
  sentAt: string | null;

  @Column({ type: 'text', nullable: true })
  repliedAt: string | null;

  @Column({ type: 'text', default: '' })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
