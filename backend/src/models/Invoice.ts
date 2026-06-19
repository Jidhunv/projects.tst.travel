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
import { Contract } from './Contract';
import { Project } from './Project';
import { Account } from './Account';
import { Payment } from './Payment';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Column()
  contractId: string;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  totalAmount: number;

  @Column()
  invoiceDate: Date;

  @Column()
  dueDate: Date;

  // Invoice status: Draft, Sent, Partially Paid, Paid, Overdue, Cancelled
  @Column({ default: 'Draft' })
  status: string;

  // Billing cycle: Monthly, Quarterly, Semi-Annual, Annual, Milestone-Based
  @Column({ default: 'Monthly' })
  billingCycle: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  // Document path
  @Column({ nullable: true })
  documentPath: string;

  // Payments linked to this invoice
  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
