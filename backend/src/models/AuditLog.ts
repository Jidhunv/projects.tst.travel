import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column({
    type: 'enum',
    enum: ['CREATE', 'UPDATE', 'DELETE'],
  })
  action: 'CREATE' | 'UPDATE' | 'DELETE';

  @Column('jsonb', { nullable: true })
  oldValues?: Record<string, any>;

  @Column('jsonb')
  newValues: Record<string, any>;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;
}
