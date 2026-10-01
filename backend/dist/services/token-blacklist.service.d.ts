declare class TokenBlacklistService {
    private repo;
    private hash;
    revoke(token: string, exp?: number, userId?: string): Promise<void>;
    isRevoked(token: string): Promise<boolean>;
    purgeExpired(): Promise<void>;
}
declare const _default: TokenBlacklistService;
export default _default;
//# sourceMappingURL=token-blacklist.service.d.ts.map