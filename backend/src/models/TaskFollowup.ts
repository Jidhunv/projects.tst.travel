import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './Task';
import { User } from './User';

// One entry in the follow-up conversation of a task: what was discussed and when to follow up next.
@Entity('task_followups')
export class TaskFollowup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column()
  taskId: string;

  @Column('text')
  note: string;

  @Column({ type: 'date', nullable: true })
  nextFollowupDate: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;
}
