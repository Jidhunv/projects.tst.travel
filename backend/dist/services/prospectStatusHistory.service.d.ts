declare class LeadStatusHistoryService {
    record(leadId: string, toStatus: string, actorId: string | null, note?: string | null, fromStatus?: string | null): Promise<void>;
}
declare const _default: LeadStatusHistoryService;
export default _default;
//# sourceMappingURL=prospectStatusHistory.service.d.ts.map