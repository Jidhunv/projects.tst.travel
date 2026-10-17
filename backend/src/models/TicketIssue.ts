import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Ticket } from './Ticket';

// One issue inside a client ticket. It moves through the stages in
// utils/issueWorkflow.ts; the ticket closes when all of its issues are closed.
@Entity('ticket_issues')
@Unique(['ticketId', 'issueNumber'])
export class TicketIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  ticketId: string;

  @Column()
  issueNumber: number; // 1, 2, 3 ... within the ticket

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ default: 'Medium' })
  priority: string; // Critical | High | Medium | Low

  @Column({ default: 'Logged' })
  stage: string;

  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
