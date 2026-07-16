import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './Product';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Category name (e.g., "Software", "Hardware", "Services")
  @Column({ unique: true })
  name: string;

  // Category description
  @Column({ nullable: true })
  description: string;

  // Category code (e.g., "SW", "HW", "SVC")
  @Column({ nullable: true, unique: true })
  code: string;

  // Active/Inactive status
  @Column({ default: true })
  isActive: boolean;

  // Display order for sorting in dropdowns
  @Column({ default: 0 })
  displayOrder: number;

  // One-to-many relationship: A category has many products
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
