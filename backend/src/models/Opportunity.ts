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
import { User } from './User';
import { Account } from './Account';
import { Contact } from './Contact';
import { LineItem } from './LineItem';

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: number;

  @Column({
    default: 'Prospecting',
  })
  stage: string; // Prospecting, Qualification, Proposal, Negotiation, Closed-Won, Closed-Lost

  @Column({ default: 'Open' })
  status: string; // Open, Won, Lost

  @Column({ nullable: true })
  description: string;

  @Column()
  forecastedCloseDate: Date;

  @Column({ default: 0 })
  probability: number; // 0-100

  @ManyToOne(() => Account, (account) => account.opportunities)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'primaryContactId' })
  primaryContact: Contact;

  @Column({ nullable: true })
  primaryContactId: string;

  @ManyToOne(() => User, (user) => user.opportunities)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => LineItem, (item) => item.opportunity, { cascade: true })
  lineItems: LineItem[];

  // Notes & activities are polymorphic (linked by resourceType + resourceId)
  // and are accessed via the note/activity services, not as ORM relations.

  @Column({ nullable: true })
  tags: string;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  closedReason: string; // Won, Lost

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
