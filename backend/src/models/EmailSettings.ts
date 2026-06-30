import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('email_settings')
export class EmailSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  smtpHost: string;

  @Column({ type: 'integer' })
  smtpPort: number;

  @Column({ type: 'varchar', length: 255 })
  smtpUser: string;

  @Column({ type: 'varchar', length: 255 })
  smtpPassword: string;

  @Column({ type: 'varchar', length: 255 })
  fromEmail: string;

  @Column({ type: 'varchar', length: 255 })
  fromName: string;

  @Column({ type: 'boolean', default: false })
  isConfigured: boolean;

  @Column({ type: 'boolean', default: true })
  enableNotifications: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  updatedBy: User;
}
