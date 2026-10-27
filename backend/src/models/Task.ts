import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

// A task one person (owner) assigns to another (assignee). Only those two see it,
// unless the role has read:all.
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ default: 'Open' })
  status: string; // Open, In Progress, Completed, Cancelled

  @Column({ default: 'Medium' })
  priority: string; // Low, Medium, High

  @Column({ type: 'date', nullable: true })
  followupDate: string | null; // the day to check back on the task

  @Column('text', { nullable: true })
  actionsTaken: string | null; // what the assignee has done so far

  // The person who assigned the task.
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  // The person the task is assigned to.
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @Column()
  assigneeId: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
