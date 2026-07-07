import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Account } from './Account';
import { User } from './User';
import { FollowupEntry } from './FollowupEntry';

// A logged sales visit or call. Powers the Sales Report.
@Entity('sales_visits')
export class SalesVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ nullable: true })
  accountId: string;

  // Snapshot of the company name so the report reads well even if the
  // account is later renamed or removed.
  @Column({ nullable: true })
  companyName: string;

  @Column({ default: 'Visit' })
  visitType: string; // Visit, Call

  @Column('text', { nullable: true })
  discussion: string; // What was discussed

  @Column({ type: 'timestamp', nullable: true })
  visitDate: Date; // Date of visit/call

  // Relationship to followup entries for this visit
  @OneToMany(() => FollowupEntry, (entry) => entry.visit, { cascade: true })
  followups: FollowupEntry[];

  // DEPRECATED: Use followups relationship instead
  // Kept for backward compatibility
  @Column({ type: 'timestamp', nullable: true })
  followupDate: Date;

  @Column({ default: false })
  followupCompleted: boolean;

  @Column('text', { nullable: true })
  followupNotes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date; // Auto-generated timestamp

  @UpdateDateColumn()
  updatedAt: Date;
}
