import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum TrainingRuleType {
  NEVER = 'never',
  ALWAYS = 'always',
  CONDITIONAL = 'conditional',
}

@Entity('training_rules')
export class TrainingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  employeeId: string | null;

  @Column({ type: 'text' })
  rule: string;

  @Column({ type: 'varchar', length: 20, default: TrainingRuleType.NEVER })
  type: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
