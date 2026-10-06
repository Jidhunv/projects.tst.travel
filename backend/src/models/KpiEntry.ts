import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KpiDefinition } from './KpiDefinition';

// One dated answer to a KpiDefinition, optionally tied to a prospect/account.
@Entity('kpi_entries')
export class KpiEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => KpiDefinition, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpiId' })
  kpi: KpiDefinition;

  @Column({ type: 'uuid' })
  kpiId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'date' })
  entryDate: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  numberValue: number | null;

  @Column('text', { nullable: true })
  textValue: string | null;

  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
