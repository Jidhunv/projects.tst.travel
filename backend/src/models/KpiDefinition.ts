import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// A question/figure an admin asks one staff member to report on a schedule.
@Entity('kpi_definitions')
export class KpiDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // the question, e.g. "Prospect calls made"

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ default: 'number' })
  type: string; // number | yes_no | text

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  // The master question this assignment comes from.
  @Column({ type: 'uuid', nullable: true })
  masterId: string | null;

  @Column({ type: 'uuid' })
  userId: string; // the staff member who answers it

  // First day this KPI applies (YYYY-MM-DD). Nothing is expected, or accepted, before it.
  @Column({ type: 'date' })
  startDate: string;

  @Column({ default: 'weekly' })
  frequency: string; // daily | weekly | monthly

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  targetValue: number | null; // per frequency period

  // Percent of this person's score this KPI carries (see migrations/029_kpi_weightage.sql).
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  weightage: number | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
