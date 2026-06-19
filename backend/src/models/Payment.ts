import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './Invoice';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  invoiceId: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: number;

  @Column()
  paymentDate: Date;

  // Payment method: Bank Transfer, Check, Credit Card, Wire Transfer, Cash, Other
  @Column()
  paymentMethod: string;

  @Column({ nullable: true })
  transactionReference: string;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;
}
