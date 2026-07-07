import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// A revoked (blacklisted) JWT. On logout we store the SHA-256 hash of the token
// together with its natural expiry; verifyToken rejects any token whose hash is
// present and not yet expired. Rows past their expiry can be safely purged.
@Entity('revoked_tokens')
export class RevokedToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  tokenHash: string; // sha256 hex of the raw JWT

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date; // when the underlying JWT would expire anyway

  @CreateDateColumn()
  revokedAt: Date;
}
