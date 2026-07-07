import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

// Brute-force protection state, kept separate from the users table so it can be
// owned/managed by the application DB role. Keyed by the user's id.
@Entity('login_security')
export class LoginSecurity {
  @PrimaryColumn()
  userId: string;

  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
