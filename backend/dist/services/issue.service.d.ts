import { TicketIssue } from '../models/TicketIssue';
export interface IssueFilters {
    accountId?: string;
    ticketId?: string;
    stage?: string;
    state?: 'open' | 'closed';
    assigneeId?: string;
    search?: string;
    scopeUserId?: string;
    page?: number;
    limit?: number;
}
declare class IssueService {
    private issues;
    syncTicket(ticketId: string, actorId?: string): Promise<{
        status: string | null;
        changed: boolean;
    }>;
    createIssue(data: {
        ticketId: string;
        title: string;
        description?: string | null;
        priority?: string;
        assigneeId?: string | null;
    }, actorId: string): Promise<{
        issue: TicketIssue;
        ticketStatus: string | null;
    }>;
    updateIssue(id: string, data: {
        title?: string;
        description?: string | null;
        priority?: string;
        assigneeId?: string | null;
    }): Promise<TicketIssue | null>;
    moveStage(id: string, input: {
        toStage: string;
        note?: string;
        customerContact?: string;
        assigneeId?: string | null;
    }, actorId: string): Promise<{
        issue: TicketIssue | null;
        ticketStatus: string | null;
        ticketChanged: boolean;
    }>;
    deleteIssue(id: string): Promise<void>;
    getHistory(issueId: string): Promise<any>;
    listIssues(f: IssueFilters): Promise<{
        rows: any;
        total: number;
        page: number;
        limit: number;
    }>;
    private runList;
    clientSummary(opts: {
        search?: string;
        scopeUserId?: string;
    }): Promise<any>;
    stageCounts(accountId?: string, scopeUserId?: string): Promise<{
        stage: string;
        count: number;
    }[]>;
    slaReport(f: {
        from?: string;
        to?: string;
        accountId?: string;
        priority?: string;
        assigneeId?: string;
        state?: 'open' | 'closed';
        scopeUserId?: string;
        page?: number;
        limit?: number;
        all?: boolean;
    }, now?: Date): Promise<{
        generatedAt: string;
        summary: {
            breachingNow: number;
            openIssues: number;
            issues: number;
            response: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            resolution: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            avgDaysToClose: number | null;
            closedCount: number;
        };
        byPriority: {
            breachingNow: number;
            targets: {
                responseHours: number;
                resolutionHours: number;
            };
            issues: number;
            response: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            resolution: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            avgDaysToClose: number | null;
            closedCount: number;
            label: string;
        }[];
        byClient: {
            issues: number;
            response: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            resolution: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            avgDaysToClose: number | null;
            closedCount: number;
            label: string;
            breachingNow: number;
        }[];
        byDeveloper: {
            issues: number;
            response: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            resolution: {
                avgHours: number | null;
                medianHours: number | null;
                met: number;
                breached: number;
                pctWithinSla: number | null;
            };
            avgDaysToClose: number | null;
            closedCount: number;
            label: string;
            breachingNow: number;
        }[];
        rows: {
            id: any;
            issueNumber: any;
            title: any;
            priority: any;
            stage: any;
            ticketNumber: any;
            ticketTitle: any;
            accountId: any;
            accountName: any;
            assigneeId: any;
            assigneeName: any;
            loggedAt: Date;
            respondedAt: Date | null;
            responseHours: number | null;
            responseTarget: number;
            response: import("../utils/issueSla").SlaState;
            resolvedAt: Date | null;
            resolutionHours: number | null;
            resolutionTarget: number;
            resolution: import("../utils/issueSla").SlaState;
            closedAt: Date | null;
            daysToClose: number | null;
            daysOpen: number;
            finished: boolean;
            breachingNow: boolean;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        rules: {
            resolutionPoint: string;
            clockStoppedIn: string[];
            defaults: Record<string, {
                responseHours: number;
                resolutionHours: number;
            }>;
        };
    }>;
    getIssueScope(id: string): Promise<{
        assigneeId: string | null;
        createdById: string | null;
    } | undefined>;
}
declare const _default: IssueService;
export default _default;
//# sourceMappingURL=issue.service.d.ts.map