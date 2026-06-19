import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Account } from './Account';
import { Opportunity } from './Opportunity';
import { Project } from './Project';
import { Invoice } from './Invoice';
import { User } from './User';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  contractNumber: string;

  @Column()
  title: string;

  // Contract type: NDA, MSA, SOW, License Agreement, Support Agreement
  @Column()
  type: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  value: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ nullable: true })
  renewalDate: Date;

  // Payment terms: Net 30, Net 60, Net 90, etc.
  @Column({ nullable: true })
  paymentTerms: string;

  // SLA terms: 99.9% uptime, 24-hour response, etc.
  @Column({ nullable: true, type: 'text' })
  slaTerms: string;

  // Contract status: Draft, Sent for Approval, Approved, Active, Expired, Terminated
  @Column({ default: 'Draft' })
  status: string;

  // Approval workflow
  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedDate: Date;

  // Document upload path
  @Column({ nullable: true })
  documentPath: string;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  // Links to other entities
  @ManyToOne(() => Account, (account) => account.contracts)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: 'opportunityId' })
  opportunity: Opportunity;

  @Column({ nullable: true })
  opportunityId: string;

  @OneToMany(() => Project, (project) => project.contract)
  projects: Project[];

  @OneToMany(() => Invoice, (invoice) => invoice.contract)
  invoices: Invoice[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
