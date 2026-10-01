import { Opportunity } from '../models/Opportunity';
import { LineItem } from '../models/LineItem';
interface OpportunityFilters {
    stage?: string;
    status?: string;
    ownerId?: string;
    accountId?: string;
    region?: string;
    country?: string;
    city?: string;
    products?: string[];
    page?: number;
    limit?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
    amountFrom?: number;
    amountTo?: number;
}
export declare class OpportunityService {
    private oppRepository;
    private lineItemRepository;
    private formatOpportunity;
    createOpportunity(data: {
        name: string;
        amount: number;
        stage: string;
        forecastedCloseDate: Date;
        accountId: string;
        primaryContactId?: string;
        ownerId: string;
        probability?: number;
        productIds?: string[];
        productNames?: string[];
        country?: string;
        city?: string;
        region?: string;
        tier?: string;
    }): Promise<any>;
    getOpportunityById(id: string): Promise<any>;
    getOpportunities(filters?: OpportunityFilters): Promise<{
        data: Opportunity[];
        total: number;
    }>;
    updateOpportunity(id: string, data: any): Promise<any>;
    adminUpdateDates(id: string, data: {
        createdAt?: string;
        forecastedCloseDate?: string;
        closedAt?: string | null;
    }): Promise<any>;
    updateStage(id: string, stage: string): Promise<any>;
    closeOpportunity(id: string, outcome: 'Won' | 'Lost', rejectionReason?: string): Promise<any>;
    deleteOpportunity(id: string): Promise<void>;
    addLineItem(opportunityId: string, data: {
        productId?: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        discountPercent?: number;
        description?: string;
    }): Promise<LineItem>;
    updateLineItem(opportunityId: string, lineItemId: string, data: Partial<LineItem>): Promise<LineItem>;
    deleteLineItem(opportunityId: string, lineItemId: string): Promise<void>;
    private recalculateAmount;
    getPipeline(filters?: {
        ownerId?: string;
        accountId?: string;
    }): Promise<{
        [stage: string]: Opportunity[];
    }>;
    getForecast(ownerId?: string): Promise<{
        stage: string;
        count: number;
        totalAmount: number;
        expectedRevenue: number;
    }[]>;
}
declare const _default: OpportunityService;
export default _default;
//# sourceMappingURL=opportunity.service.d.ts.map