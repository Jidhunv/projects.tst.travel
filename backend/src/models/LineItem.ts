import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Opportunity } from './Opportunity';

@Entity('line_items')
export class LineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Optional link to a catalog Product. productName is kept as a snapshot
  // so historical line items stay accurate even if the product changes.
  @Column({ nullable: true })
  productId: string;

  @Column()
  productName: string;

  @Column()
  quantity: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  discountPercent: number;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Opportunity, (opp) => opp.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunityId' })
  opportunity: Opportunity;

  @Column()
  opportunityId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
