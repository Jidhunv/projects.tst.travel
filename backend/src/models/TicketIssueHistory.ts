import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Append-only: one row per stage change of an issue.
@Entity('ticket_issue_history')
export class TicketIssueHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  issueId: string;

  @Column({ type: 'varchar', nullable: true })
  fromStage: string | null;

  @Column()
  toStage: string;

  @Column('text', { nullable: true })
  note: string | null;

  // The customer who approved (set when an issue is approved for deployment).
  @Column({ type: 'varchar', nullable: true })
  customerContact: string | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
