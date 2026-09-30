import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Account } from './Account';
import { Designation } from './Designation';

// One row per (account, buying-committee role) - see STAKEHOLDER_ROLES in
// utils/constants.ts for the fixed set of 8 roles. An account's "onboarding"
// is complete once it has a row for every role, each with a name and a
// designation. Enforced before a lead can be created against the account
// (see lead.controller.ts#createLead).
@Entity('account_stakeholders')
@Unique(['accountId', 'role'])
export class AccountStakeholder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  @Column()
  role: string; // one of STAKEHOLDER_ROLES

  @Column({ nullable: true })
  name: string;

  @ManyToOne(() => Designation)
  @JoinColumn({ name: 'designationId' })
  designation: Designation;

  @Column({ nullable: true })
  designationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
