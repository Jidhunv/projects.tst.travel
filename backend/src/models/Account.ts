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
import { Contact } from './Contact';
import { Opportunity } from './Opportunity';
import { Activity } from './Activity';
import { Note } from './Note';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  size: string; // 1-10, 11-50, 51-200, 201-500, 500+

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ default: 'Prospect' })
  type: string; // Prospect, Customer, Inactive

  @Column({ default: 'Prospect' })
  status: string; // Prospect, Customer, Inactive

  @ManyToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @Column({ nullable: true })
  billingStreet: string;

  @Column({ nullable: true })
  billingCity: string;

  @Column({ nullable: true })
  billingState: string;

  @Column({ nullable: true })
  billingZip: string;

  @Column({ nullable: true })
  billingCountry: string;

  @Column({ nullable: true })
  shippingStreet: string;

  @Column({ nullable: true })
  shippingCity: string;

  @Column({ nullable: true })
  shippingState: string;

  @Column({ nullable: true })
  shippingZip: string;

  @Column({ nullable: true })
  shippingCountry: string;

  @OneToMany(() => Contact, (contact) => contact.account, { cascade: true })
  contacts: Contact[];

  @OneToMany(() => Opportunity, (opp) => opp.account)
  opportunities: Opportunity[];

  @OneToMany(() => Activity, (activity) => activity.resource, { cascade: true })
  activities: Activity[];

  @OneToMany(() => Note, (note) => note.resource, { cascade: true })
  notes: Note[];

  @Column({ nullable: true })
  tags: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
