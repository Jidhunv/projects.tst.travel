import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

// Travel/expense claim with an approval workflow.
@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  location: string; // Travel location ("Where are you?")

  @Column({ type: 'int', default: 1 })
  days: number; // Number of days

  // Companies visited (multi-select of account ids) with a name snapshot.
  @Column('simple-array', { nullable: true })
  accountIds: string[];

  @Column('simple-array', { nullable: true })
  companyNames: string[];

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  travelCost: number; // Cost of travel

  @Column('text', { nullable: true })
  reason: string; // Reason for travel

  @Column({ default: 'Pending' })
  status: string; // Pending, Approved, Rejected

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedById: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column('text', { nullable: true })
  approvalNotes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
