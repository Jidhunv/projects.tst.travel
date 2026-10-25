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

@Entity('leads')
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

  @Column({ nullable: true })
  tier: string; // Client tier (Premium, Standard, Basic, etc.) - can be imported from MIDT

  @ManyToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: true })
  createdBy: string;

  // The team this account is assigned to. With "team" scope, any member of
  // this team or an ancestor team can see the account. Null = unassigned
  // (visible only via ownerId/assigneeIds as before).
  @Column({ nullable: true })
  teamId: string;

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

  @Column({ nullable: true })
  onboardingNotes: string;

  // Prospecting questionnaire answers, keyed q1..q10 (see utils/prospecting.ts).
  @Column({ type: 'jsonb', nullable: true })
  prospectingAnswers: Record<string, any> | null;

  // Lead qualification answers, lq1..lq10 (see utils/prospectQualification.ts).
  @Column({ type: 'jsonb', nullable: true })
  leadQualification: Record<string, string> | null;

  // UTC timestamps (timestamptz): when the account first became a prospect, and when its answers were last saved.
  @Column({ type: 'timestamptz', nullable: true })
  prospectedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  prospectingUpdatedAt: Date | null;

  // Onboarding profile (asked when the customer is onboarded).
  // Columns are added by migrations/028_account_onboarding_profile.sql.
  @Column({ type: 'uuid', nullable: true })
  companyTypeId: string | null; // what kind of company it is (Company Type master)

  @Column({ type: 'boolean', nullable: true })
  isB2B: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  isRetail: boolean | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  primaryBusiness: string | null;

  @Column({ type: 'integer', nullable: true })
  employeeCount: number | null;

  @Column({ type: 'text', array: true, nullable: true })
  branchLocations: string[] | null;

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
