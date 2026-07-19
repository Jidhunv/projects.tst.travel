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
import { Contract } from './Contract';
import { Project } from './Project';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  industry: string;

  // Company information
  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  size: string; // 1-10, 11-50, 51-200, 201-500, 500+

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  alternatePhoneNumber: string;

  @Column({ unique: true, nullable: true })
  email: string;

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
  remark: string;

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

  // Onboarding tracking
  @Column({ default: 'Not Started' })
  onboardingStatus: string; // Not Started, In Progress, Completed, On Hold

  @Column({ type: 'timestamp', nullable: true })
  onboardingDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  onboardingCompletedDate: Date;

  @Column({ nullable: true })
  onboardingNotes: string;

  @Column({ nullable: true })
  contractSignedDate: Date;

  @Column({ nullable: true })
  goLiveDate: Date;

  @Column({ nullable: true })
  accountManager: string;

  @Column({ nullable: true })
  billingContact: string;

  @Column({ nullable: true })
  technicalContact: string;

  @OneToMany(() => Contact, (contact) => contact.account, { cascade: true })
  contacts: Contact[];

  @OneToMany(() => Opportunity, (opp) => opp.account)
  opportunities: Opportunity[];

  @OneToMany(() => Contract, (contract) => contract.account)
  contracts: Contract[];

  @OneToMany(() => Project, (project) => project.account)
  projects: Project[];

  // Notes & activities are polymorphic; accessed via their own services.

  @Column({ nullable: true })
  tags: string;

  // Additional users this record is assigned to (multi-assign).
  @Column('simple-array', { nullable: true })
  assigneeIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
