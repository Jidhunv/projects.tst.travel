import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  sku: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  // one-time | subscription
  @Column({ default: 'one-time' })
  billingType: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
