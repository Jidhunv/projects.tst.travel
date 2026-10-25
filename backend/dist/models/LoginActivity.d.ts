export declare class LoginActivity {
    id: string;
    userId: string | null;
    emailTried: string | null;
    event: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT';
    success: boolean;
    reason: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
}
//# sourceMappingURL=LoginActivity.d.ts.map