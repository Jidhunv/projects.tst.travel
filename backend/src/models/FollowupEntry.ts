import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesVisit } from './SalesVisit';
import { User } from './User';

// Each followup to a sales visit is recorded as a separate entry
// This allows tracking multiple followups over time for a single visit
@Entity('followup_entries')
export class FollowupEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalesVisit, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visitId' })
  visit: SalesVisit;

  @Column({ nullable: false })
  visitId: string;

  // Followup message/notes
  @Column('text', { nullable: true })
  notes: string;

  // Followup completion status
  @Column({ default: false })
  completed: boolean;

  // Who added this followup
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date; // Timestamp of when followup was added
}
