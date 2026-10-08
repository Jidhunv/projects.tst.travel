import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// The approved list of KPI questions. Staff KPIs (KpiDefinition) are assigned
// from here; the master owns the wording, answer type and unit.
@Entity('kpi_master')
export class KpiMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ default: 'number' })
  type: string; // number | yes_no | text

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  // Allowed answers for a 'choice' question; null for every other type.
  @Column({ type: 'jsonb', nullable: true })
  answerOptions: string[] | null;

  @Column({ default: 'daily' })
  defaultFrequency: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  defaultTarget: number | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
