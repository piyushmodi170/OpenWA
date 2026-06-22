import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('conversation_analyses')
export class ConversationAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  sessionId: string;

  @Column({ type: 'varchar', length: 200 })
  chatId: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  contactName: string;

  @Column({ type: 'varchar', length: 20, default: 'neutral' })
  sentiment: string;

  @Column({ type: 'float', default: 0 })
  sentimentScore: number;

  @Column({ type: 'int', default: 5 })
  interestLevel: number;

  @Column({ type: 'int', default: 0 })
  purchaseIntent: number;

  @Column({ type: 'int', default: 5 })
  relationshipScore: number;

  @Column({ type: 'text', default: '[]' })
  keyInfo: string;

  @Column({ type: 'text', default: '[]' })
  suggestedActions: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ type: 'text', default: '' })
  lastMessageAnalyzed: string;

  @Column({ type: 'int', default: 0 })
  messageCount: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  stage: string;

  @CreateDateColumn()
  analyzedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
