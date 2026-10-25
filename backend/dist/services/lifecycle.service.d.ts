export interface LeadEvent {
    status: string;
    at: Date;
}
export interface DealEvent {
    stage: string;
    at: Date;
}
export interface LifecycleRow {
    leadId: string;
    leadName: string;
    company: string;
    ownerName: string;
    currentLeadStatus: string;
    createdAt: Date;
    qualifiedAt: Date | null;
    disqualifiedAt: Date | null;
    convertedAt: Date | null;
    dealId: string | null;
    dealName: string | null;
    demonstrationAt: Date | null;
    proposalAt: Date | null;
    negotiationAt: Date | null;
    closedAt: Date | null;
    outcome: 'Won' | 'Lost' | 'Open' | 'Disqualified' | 'Not converted';
    dealStage: string | null;
    daysLeadToQualified: number | null;
    daysQualifiedToDemo: number | null;
    daysDemoToProposal: number | null;
    daysProposalToNegotiation: number | null;
    daysNegotiationToClose: number | null;
    daysLeadToClose: number | null;
}
export declare function buildLifecycleRow(lead: {
    id: string;
    name: string;
    company: string;
    ownerName: string;
    status: string;
    createdAt: Date;
}, leadEvents: LeadEvent[], deal: {
    id: string;
    name: string;
    stage: string;
    status: string;
} | null, dealEvents: DealEvent[]): LifecycleRow;
export declare function summariseLifecycle(rows: LifecycleRow[]): {
    leads: number;
    qualified: number;
    converted: number;
    won: number;
    lost: number;
    open: number;
    disqualified: number;
    qualifiedPct: number | null;
    convertedPct: number | null;
    wonPct: number | null;
    avgDays: {
        leadToQualified: number | null;
        qualifiedToDemo: number | null;
        demoToProposal: number | null;
        proposalToNegotiation: number | null;
        negotiationToClose: number | null;
        leadToClose: number | null;
    };
};
declare class LifecycleService {
    report(f: {
        ownerId?: string;
        from?: string;
        to?: string;
    }): Promise<{
        rows: LifecycleRow[];
        summary: {
            leads: number;
            qualified: number;
            converted: number;
            won: number;
            lost: number;
            open: number;
            disqualified: number;
            qualifiedPct: number | null;
            convertedPct: number | null;
            wonPct: number | null;
            avgDays: {
                leadToQualified: number | null;
                qualifiedToDemo: number | null;
                demoToProposal: number | null;
                proposalToNegotiation: number | null;
                negotiationToClose: number | null;
                leadToClose: number | null;
            };
        };
    }>;
    activity(f: {
        ownerId?: string;
        from?: string;
        to?: string;
        grain?: 'week' | 'month';
    }): Promise<{
        grain: string;
        periods: any[];
        totals: any;
        latest: any[];
    }>;
}
declare const _default: LifecycleService;
export default _default;
//# sourceMappingURL=lifecycle.service.d.ts.map