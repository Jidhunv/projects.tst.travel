import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Append-only history of KPI entries and projections. No foreign keys on
// purpose: the trail must survive deletion of the thing it describes.
@Entity('kpi_audit_trail')
export class KpiAuditTrail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // kpi_entry | projection

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'uuid' })
  subjectUserId: string;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column()
  action: string; // created | updated | deleted

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
