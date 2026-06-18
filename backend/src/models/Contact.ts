import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from './Account';

@Entity('contacts')
export class Contact {
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
  jobTitle: string;

  @Column({ nullable: true })
  role: string; // Decision Maker, Champion, Influencer, etc.

  @Column({ default: false })
  isPrimary: boolean;

  @ManyToOne(() => Account, (account) => account.contacts)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  @Column({ nullable: true })
  reportsTo: string; // Contact ID of the person they report to

  @Column({ nullable: true })
  linkedinUrl: string;

  @Column({ nullable: true })
  birthday: Date;

  // Notes & activities are polymorphic; accessed via their own services.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
