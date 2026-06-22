import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum KnowledgeDocumentType {
  TEXT = 'text',
  FAQ = 'faq',
  CHAT_HISTORY = 'chat_history',
  SOP = 'sop',
  PRODUCT_CATALOG = 'product_catalog',
  SALES_SCRIPT = 'sales_script',
  POLICY = 'policy',
  CUSTOM = 'custom',
}

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  employeeId: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 30, default: KnowledgeDocumentType.TEXT })
  type: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  source: string;

  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'float', default: 0 })
  qualityScore: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'text', default: '[]' })
  tags: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
