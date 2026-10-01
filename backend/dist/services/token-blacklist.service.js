"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const RevokedToken_1 = require("../models/RevokedToken");
// DB-backed JWT blacklist. Lets logout genuinely revoke a token before its
// natural expiry, without requiring Redis or any external infrastructure.
class TokenBlacklistService {
    constructor() {
        this.repo = () => database_1.AppDataSource.getRepository(RevokedToken_1.RevokedToken);
    }
    hash(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    // Revoke a token until its own expiry. `exp` is the JWT exp claim (seconds).
    async revoke(token, exp, userId) {
        const tokenHash = this.hash(token);
        const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);
        // Ignore duplicate revocations (unique index on tokenHash).
        const existing = await this.repo().findOne({ where: { tokenHash } });
        if (existing)
            return;
        await this.repo().save(this.repo().create({ tokenHash, userId, expiresAt }));
        // Opportunistic cleanup of expired rows so the table stays small.
        this.purgeExpired().catch(() => undefined);
    }
    // True if the token has been revoked and its revocation is still in effect.
    async isRevoked(token) {
        const tokenHash = this.hash(token);
        const row = await this.repo().findOne({ where: { tokenHash } });
        if (!row)
            return false;
        // If the underlying token already expired, revocation no longer matters.
        return row.expiresAt.getTime() > Date.now();
    }
    async purgeExpired() {
        await this.repo().delete({ expiresAt: (0, typeorm_1.LessThan)(new Date()) });
    }
}
exports.default = new TokenBlacklistService();
//# sourceMappingURL=token-blacklist.service.js.map