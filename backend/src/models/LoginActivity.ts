import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// One row per login attempt, lockout or logout. See migrations/030_login_activity.sql.
@Entity('login_activity')
@Index(['userId', 'createdAt'])
export class LoginActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailTried: string | null;

  @Column({ type: 'varchar', length: 30 })
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT';

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: { to: (v: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) } })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: { to: (v: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) } })
  longitude: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
