import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './User';

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['ContractExpiry', 'InvoiceDue', 'UATApproval', 'PaymentReminder', 'ProjectMilestone', 'TicketUpdate'],
  })
  type: 'ContractExpiry' | 'InvoiceDue' | 'UATApproval' | 'PaymentReminder' | 'ProjectMilestone' | 'TicketUpdate';

  @Column()
  title: string;

  @Column('text')
  message: string;

  @ManyToOne(() => User)
  recipient: User;

  @Column({ nullable: true })
  relatedEntityType?: string;

  @Column({ nullable: true })
  relatedEntityId?: string;

  @Column({ nullable: true })
  relatedEntityName?: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  readAt?: Date;

  @Column({ nullable: true })
  actionUrl?: string;

  @Column({ nullable: true })
  actionLabel?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
