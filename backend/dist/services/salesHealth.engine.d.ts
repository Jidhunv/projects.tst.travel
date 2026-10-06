import { SalesStrategy } from '../utils/salesStrategy';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type HealthStatus = 'on-track' | 'at-risk' | 'derailed' | 'no-pipeline';
export interface HealthFlag {
    code: string;
    severity: Severity;
    category: 'followup' | 'engagement' | 'stage' | 'coverage' | 'conversion';
    title: string;
    detail: string;
    action: string;
}
export interface AccountInput {
    id: string;
    name: string;
    tier: string | null;
    type: string;
    ownerId: string | null;
    ownerName: string;
    createdAt: Date;
    stakeholderRoles: string[];
    leads: {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }[];
    opps: {
        id: string;
        name: string;
        stage: string;
        status: string;
        amount: number;
        createdAt: Date;
        updatedAt: Date;
        forecastedCloseDate: Date | null;
    }[];
    touches: Date[];
    openDueDates: Date[];
    visits: {
        date: Date;
        followups: {
            date: Date;
            completed: boolean;
        }[];
    }[];
}
export interface AccountHealth {
    accountId: string;
    accountName: string;
    tier: string | null;
    ownerId: string | null;
    ownerName: string;
    status: HealthStatus;
    score: number;
    flags: HealthFlag[];
    lastTouchAt: string | null;
    daysSinceTouch: number | null;
    openLeads: number;
    openOpportunities: number;
    pipelineValue: number;
    overdueFollowups: number;
    followupCompletion: number | null;
    nextAction: string;
}
export declare function analyseAccount(a: AccountInput, now?: Date, S?: SalesStrategy): AccountHealth;
export interface HealthSummary {
    total: number;
    byStatus: Record<HealthStatus, number>;
    avgScore: number;
    pipelineAtRisk: number;
    pipelineTotal: number;
    flagsBySeverity: Record<Severity, number>;
    flagsByCode: {
        code: string;
        title: string;
        severity: Severity;
        category: string;
        accounts: number;
    }[];
    byOwner: {
        ownerId: string | null;
        ownerName: string;
        accounts: number;
        onTrack: number;
        atRisk: number;
        derailed: number;
        avgScore: number;
        overdueFollowups: number;
        criticalFlags: number;
    }[];
    byTier: {
        tier: string;
        accounts: number;
        onTrack: number;
        atRisk: number;
        derailed: number;
    }[];
}
export declare const FLAG_LABELS: Record<string, {
    title: string;
    category: string;
}>;
export declare function summarise(results: AccountHealth[]): HealthSummary;
//# sourceMappingURL=salesHealth.engine.d.ts.map