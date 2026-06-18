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
import { Role } from './Role';
import { Lead } from './Lead';
import { Account } from './Account';
import { Opportunity } from './Opportunity';
import { Activity } from './Activity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  resetToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column()
  roleId: string;

  @OneToMany(() => Lead, (lead) => lead.owner)
  leads: Lead[];

  @OneToMany(() => Account, (account) => account.owner)
  accounts: Account[];

  @OneToMany(() => Opportunity, (opp) => opp.owner)
  opportunities: Opportunity[];

  @OneToMany(() => Activity, (activity) => activity.createdBy)
  activities: Activity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
