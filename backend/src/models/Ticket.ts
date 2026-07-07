import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './Account';
import { Contact } from './Contact';
import { User } from './User';
import { Activity } from './Activity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ticketNumber: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
  })
  priority: 'Critical' | 'High' | 'Medium' | 'Low';

  @Column({
    type: 'enum',
    enum: ['Open', 'In Progress', 'Pending Customer', 'Resolved', 'Closed'],
    default: 'Open',
  })
  status: 'Open' | 'In Progress' | 'Pending Customer' | 'Resolved' | 'Closed';

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  source?: string;

  @ManyToOne(() => Account)
  account: Account;

  @Column({ nullable: true })
  productId?: string; // Reference to Product

  @Column({
    type: 'enum',
    enum: ['Bug', 'Feature Request', 'Enhancement Suggestion'],
    nullable: true,
  })
  moduleType?: 'Bug' | 'Feature Request' | 'Enhancement Suggestion';

  @Column('simple-array', { nullable: true })
  attachmentPaths?: string[]; // File paths for attachments

  @ManyToOne(() => Contact, { nullable: true })
  contact?: Contact;

  @ManyToOne(() => User)
  reporter: User;

  @ManyToOne(() => User, { nullable: true })
  assignee?: User;

  // Additional users this ticket is assigned to (multi-assign).
  @Column('simple-array', { nullable: true })
  assigneeIds?: string[];

  @Column({ nullable: true })
  slaResponseHours?: number;

  @Column({ nullable: true })
  slaResolutionHours?: number;

  @Column({ nullable: true, type: 'timestamp' })
  responseDeadline?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  resolutionDeadline?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  respondedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  resolvedAt?: Date;

  @Column({ nullable: true })
  resolutionNotes?: string;

  @OneToMany(() => Activity, (activity) => activity.resourceId, { eager: false })
  activities?: Activity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
