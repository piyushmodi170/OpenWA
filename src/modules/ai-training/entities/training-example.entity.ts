import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('training_examples')
export class TrainingExample {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  employeeId: string | null;

  @Column({ type: 'text' })
  trigger: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ type: 'varchar', length: 100, default: 'general' })
  category: string;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
