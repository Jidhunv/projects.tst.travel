import crypto from 'crypto';
import { LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { RevokedToken } from '../models/RevokedToken';

// DB-backed JWT blacklist. Lets logout genuinely revoke a token before its
// natural expiry, without requiring Redis or any external infrastructure.
class TokenBlacklistService {
  private repo = () => AppDataSource.getRepository(RevokedToken);

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Revoke a token until its own expiry. `exp` is the JWT exp claim (seconds).
  async revoke(token: string, exp?: number, userId?: string): Promise<void> {
    const tokenHash = this.hash(token);
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);

    // Ignore duplicate revocations (unique index on tokenHash).
    const existing = await this.repo().findOne({ where: { tokenHash } });
    if (existing) return;

    await this.repo().save(this.repo().create({ tokenHash, userId, expiresAt }));

    // Opportunistic cleanup of expired rows so the table stays small.
    this.purgeExpired().catch(() => undefined);
  }

  // True if the token has been revoked and its revocation is still in effect.
  async isRevoked(token: string): Promise<boolean> {
    const tokenHash = this.hash(token);
    const row = await this.repo().findOne({ where: { tokenHash } });
    if (!row) return false;
    // If the underlying token already expired, revocation no longer matters.
    return row.expiresAt.getTime() > Date.now();
  }

  async purgeExpired(): Promise<void> {
    await this.repo().delete({ expiresAt: LessThan(new Date()) });
  }
}

export default new TokenBlacklistService();
