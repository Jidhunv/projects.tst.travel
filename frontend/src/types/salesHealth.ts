export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type HealthStatus = 'on-track' | 'at-risk' | 'derailed' | 'no-pipeline';

export interface HealthFlag {
  code: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  action: string;
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

export interface SalesHealthReport {
  generatedAt: string;
  summary: {
    total: number;
    byStatus: Record<HealthStatus, number>;
    avgScore: number;
    pipelineAtRisk: number;
    pipelineTotal: number;
    flagsBySeverity: Record<Severity, number>;
    flagsByCode: { code: string; title: string; severity: Severity; category: string; accounts: number }[];
    byOwner: {
      ownerId: string | null; ownerName: string; accounts: number; onTrack: number; atRisk: number;
      derailed: number; avgScore: number; overdueFollowups: number; criticalFlags: number;
    }[];
    byTier: { tier: string; accounts: number; onTrack: number; atRisk: number; derailed: number }[];
  };
  rows: AccountHealth[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  strategy: Record<string, any>;
}
