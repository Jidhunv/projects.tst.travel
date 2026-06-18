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
import { Account } from './Account';
import { Activity } from './Activity';
import { Note } from './Note';

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

  @OneToMany(() => Activity, (activity) => activity.resource, { cascade: true })
  activities: Activity[];

  @OneToMany(() => Note, (note) => note.resource, { cascade: true })
  notes: Note[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
