import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// A target for a date range. ownerId null = the whole team. Dates are
// calendar dates (YYYY-MM-DD strings), not instants.
@Entity('sales_targets')
export class SalesTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 'won_value' })
  metric: string; // won_value | opportunity_value

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  targetValue: number;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
