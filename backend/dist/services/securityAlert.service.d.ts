export type AlertSeverity = 'low' | 'medium' | 'high';
interface EvaluateInput {
    rowId: string;
    rowEvent: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT';
    userId: string | null;
    emailTried: string | null;
    ip: string | null;
    country: string | null;
}
declare class SecurityAlertService {
    evaluate(input: EvaluateInput): Promise<void>;
    private ipSpray;
    private accountAttack;
    private successAfterFailures;
    private newCountry;
    private newIp;
    private raise;
}
declare const _default: SecurityAlertService;
export default _default;
//# sourceMappingURL=securityAlert.service.d.ts.map