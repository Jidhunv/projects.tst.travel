import { AuthUser } from '../middleware/auth';
export interface SalesActivityFilters {
    from?: string;
    to?: string;
    country?: string;
    region?: string;
    salespersonId?: string;
}
export declare function visibleOwnerIds(user: AuthUser | undefined, module?: string): Promise<string[] | null>;
export declare function ownersForFilter(user: AuthUser | undefined, salespersonId?: string, module?: string): Promise<string[] | null>;
export declare function validateFilters(f: SalesActivityFilters): SalesActivityFilters;
interface PersonActivity {
    ownerId: string | null;
    name: string;
    leadsCreated: number;
    prospects: number;
    demosConducted: number;
    proposalsSent: number;
    reachedNegotiation: number;
    closedWon: number;
    closedLost: number;
    openDeals: number;
    pipelineValue: number;
    salesCalls: number;
    visits: number;
}
export declare function summary(user: AuthUser | undefined, input: SalesActivityFilters): Promise<{
    filters: SalesActivityFilters;
    totals: Omit<PersonActivity, "name" | "ownerId"> & Record<string, any>;
    pipelineByStage: {
        stage: string;
        count: number;
        value: number;
    }[];
    byPerson: PersonActivity[];
}>;
export declare function options(user: AuthUser | undefined, module?: string): Promise<{
    people: any;
    countries: any;
    regions: any;
    canViewOthers: boolean;
}>;
export {};
//# sourceMappingURL=salesActivity.service.d.ts.map