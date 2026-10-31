import { AuthUser } from '../middleware/auth';
export interface MetricSetting {
    metricKey: string;
    label: string;
    target: number;
    weight: number;
}
export interface MetricValue {
    target: number;
    auto: number;
    supervisor: number | null;
    note: string | null;
    updatedAt: string | null;
    names: string[];
}
export interface PersonDay {
    userId: string;
    name: string;
    approvedAt: string | null;
    approvedById: string | null;
    lastUpdatedAt: string | null;
    metrics: Record<string, MetricValue>;
    autoScore: number;
    supervisorScore: number;
}
export declare function listSettings(): Promise<MetricSetting[]>;
export declare function saveSettings(actor: AuthUser | undefined, items: Array<{
    metricKey: string;
    target: unknown;
    weight: unknown;
}>): Promise<MetricSetting[]>;
export declare function verificationDays(actor: AuthUser | undefined, input: {
    from?: string;
    to?: string;
    userId?: string;
}): Promise<{
    from: string;
    to: string;
    staff: {
        userId: any;
        name: string;
    }[];
    staffId: string | null;
    settings: MetricSetting[];
    canVerify: string | string[];
    canUnlock: boolean;
    days: {
        day: string;
        people: PersonDay[];
    }[];
}>;
export declare function setSupervisorValue(actor: AuthUser | undefined, input: {
    userId: string;
    day: string;
    metricKey: string;
    value: unknown;
    note?: unknown;
}): Promise<{
    userId: string;
    day: string;
    metricKey: string;
    value: number | null;
    note: string | null;
}>;
export declare function approveDay(actor: AuthUser | undefined, input: {
    userId: string;
    day: string;
}): Promise<{
    userId: string;
    day: string;
}>;
export declare function targetsPage(actor: AuthUser | undefined): Promise<{
    settings: MetricSetting[];
    people: {
        targets: {
            [k: string]: number | null;
        };
        userId: string;
        name: string;
    }[];
}>;
export declare function setPersonTarget(actor: AuthUser | undefined, input: {
    userId: string;
    metricKey: string;
    target: unknown;
}): Promise<{
    userId: string;
    metricKey: string;
    target: null;
} | {
    userId: string;
    metricKey: string;
    target: number;
}>;
export declare function unlockDay(actor: AuthUser | undefined, input: {
    userId: string;
    day: string;
}): Promise<{
    userId: string;
    day: string;
    unlockedBy: string;
}>;
//# sourceMappingURL=kpiVerification.service.d.ts.map