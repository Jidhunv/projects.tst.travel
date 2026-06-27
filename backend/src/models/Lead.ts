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
import { Account } from './Account';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ nullable: true })
  source: string; // inbound, referral, cold outreach, website, event, etc.

  @Column({ default: 'Open' })
  status: string; // Open, Qualified, Disqualified, Converted

  @Column({ default: 0 })
  score: number; // Lead score

  // Estimated deal value (dollars) and expected close date
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'timestamp', nullable: true })
  expectedCloseDate: Date;

  // Product of interest (optional link to the catalog; name kept as snapshot)
  @Column({ nullable: true })
  productId: string;

  @Column({ nullable: true })
  productName: string;

  // Multiple products (JSON array of IDs)
  @Column('simple-array', { nullable: true, default: null })
  productIds: string[];

  // Multiple product names (JSON array of names)
  @Column('simple-array', { nullable: true, default: null })
  productNames: string[];

  // Reason captured when a lead is closed as lost
  @Column({ nullable: true })
  lostReason: string;

  // General remarks on the lead
  @Column('text', { nullable: true })
  remark: string;

  @ManyToOne(() => User, (user) => user.leads)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ nullable: true })
  accountId: string;

  // Notes & activities are polymorphic; accessed via their own services.

  @Column({ nullable: true })
  tags: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
