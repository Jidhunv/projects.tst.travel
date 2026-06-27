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
import { Contract } from './Contract';
import { User } from './User';
import { Invoice } from './Invoice';
import { ProjectMilestone } from './ProjectMilestone';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectName: string;

  // Project status: Planning, In Progress, UAT, Deployed, On Hold, Closed
  @Column({ default: 'Planning' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ nullable: true })
  goLiveDate: Date;

  // Budget and revenue
  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  revenue: number;

  // Progress tracking
  @Column({ default: 0 })
  progressPercent: number;

  // Links
  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Column({ nullable: true })
  contractId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'projectManagerId' })
  projectManager: User;

  @Column({ nullable: true })
  projectManagerId: string;

  // Deployment & UAT tracking
  @Column({ default: false })
  isLoaded: boolean;

  @Column({ type: 'timestamp', nullable: true })
  loadedDate: Date;

  @Column({ nullable: true })
  loadedBy: string;

  @Column({ default: false })
  demoConducted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  demoDate: Date;

  @Column({ nullable: true })
  conductedBy: string;

  @Column({ default: false })
  clientDemoApproval: boolean;

  // UAT status: Pending, In Progress, Approved, Rejected
  @Column({ default: 'Pending' })
  uatStatus: string;

  @Column({ type: 'timestamp', nullable: true })
  uatStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  uatCompletedDate: Date;

  @Column({ nullable: true })
  uatSignoffBy: string;

  @Column({ nullable: true, type: 'text' })
  uatRemarks: string;

  // Production deployment
  @Column({ default: 'Not Started' })
  prodDeploymentStatus: string; // Not Started, Scheduled, Deployed, Rolled Back

  @Column({ type: 'timestamp', nullable: true })
  prodDeploymentDate: Date;

  @Column({ nullable: true })
  prodDeploymentBy: string;

  @Column({ default: false })
  goLiveApproval: boolean;

  // Project signoffs
  @Column({ default: false })
  projectClosureSigned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  projectClosureSignDate: Date;

  @Column({ nullable: true })
  projectClosureSignedBy: string;

  @Column({ nullable: true, type: 'text' })
  closureRemarks: string;

  // Milestones
  @OneToMany(() => ProjectMilestone, (milestone) => milestone.project, { cascade: true })
  milestones: ProjectMilestone[];

  // Invoices linked to this project
  @OneToMany(() => Invoice, (invoice) => invoice.project)
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
