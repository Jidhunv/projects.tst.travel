export type LoginEvent = 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT';
export interface LoginActivityInput {
    userId?: string | null;
    emailTried?: string | null;
    event: LoginEvent;
    success: boolean;
    reason?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}
declare class LoginActivityService {
    record(input: LoginActivityInput): Promise<void>;
    list(filters: {
        userId?: string;
        event?: string;
        from?: string;
        to?: string;
        page: number;
        limit: number;
    }): Promise<{
        data: any;
        total: any;
    }>;
    purgeExpired(): Promise<number>;
}
export declare const loginActivityRetentionDays: number;
declare const _default: LoginActivityService;
export default _default;
//# sourceMappingURL=loginActivity.service.d.ts.map