import { Lead } from '../models/Lead';
import { Account } from '../models/Account';
import { Opportunity } from '../models/Opportunity';
interface LeadFilters {
    status?: string;
    source?: string;
    ownerId?: string;
    region?: string;
    country?: string;
    page?: number;
    limit?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
}
export declare class LeadService {
    private leadRepository;
    private accountRepository;
    private oppRepository;
    private lineItemRepository;
    createLead(data: {
        accountId: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string;
        company?: string;
        jobTitle?: string;
        source?: string;
        ownerId: string;
        value?: number;
        expectedCloseDate?: Date;
        productId?: string;
        productName?: string;
        productIds?: string[];
        productNames?: string[];
        remark?: string;
        businessVolume?: number;
        supplierList?: string[];
        region?: string;
        country?: string;
    }): Promise<Lead>;
    getLeadById(id: string): Promise<Lead>;
    getLeads(filters?: LeadFilters, traceId?: string): Promise<{
        data: Lead[];
        total: number;
    }>;
    updateLead(id: string, data: Partial<Lead>): Promise<Lead>;
    updateLeadStatus(id: string, status: string): Promise<Lead>;
    deleteLead(id: string): Promise<void>;
    convertLeadToAccount(leadId: string): Promise<Account>;
    convertLeadToOpportunity(leadId: string): Promise<Opportunity>;
    markLeadLost(leadId: string, lostReason: string): Promise<Lead>;
    updateLeadScore(id: string, points: number): Promise<Lead>;
    bulkImportLeads(leads: Array<Partial<Lead>>, ownerId: string): Promise<{
        success: number;
        failed: number;
    }>;
}
declare const _default: LeadService;
export default _default;
//# sourceMappingURL=lead.service.d.ts.map