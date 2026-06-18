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
import { Account } from './Account';
import { Activity } from './Activity';
import { Note } from './Note';

@Entity('leads')
export class Lead {
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
  company: string;

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ nullable: true })
  source: string; // inbound, referral, cold outreach, website, event, etc.

  @Column({ default: 'Open' })
  status: string; // Open, Qualified, Disqualified, Converted

  @Column({ default: 0 })
  score: number; // Lead score

  @ManyToOne(() => User, (user) => user.leads)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ nullable: true })
  accountId: string;

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
