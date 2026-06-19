import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './Project';
import { User } from './User';

@Entity('project_milestones')
export class ProjectMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  // Milestone type: Created, Requirements, Dev Started, Testing, Demo, UAT Started, UAT Completed, Production Deployment, Hypercare, Closure
  @Column()
  milestoneType: string;

  @Column()
  milestoneName: string;

  @Column({ type: 'timestamp' })
  completedDate: Date;

  @Column({ nullable: true })
  completedTime: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsibleUserId' })
  responsibleUser: User;

  @Column({ nullable: true })
  responsibleUserId: string;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  // Approval status: Pending, Approved, Rejected
  @Column({ default: 'Pending' })
  approvalStatus: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
