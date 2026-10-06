import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

// A staff member's projected figure for one month and metric. `month` is the
// first day of the month (YYYY-MM-01). Every change is also appended to
// kpi_audit_trail, so revisions are never lost.
@Entity('kpi_projections')
@Unique(['userId', 'month', 'metric'])
export class KpiProjection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'date' })
  month: string;

  @Column()
  metric: string; // won_value | opportunity_value

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: number;

  @Column('text', { nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
