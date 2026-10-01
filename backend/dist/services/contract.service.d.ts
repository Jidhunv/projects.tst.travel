import { Contract } from '../models/Contract';
interface ContractFilters {
    accountId?: string;
    opportunityId?: string;
    status?: string;
    scopeUserId?: string;
    page?: number;
    limit?: number;
    search?: string;
}
export declare class ContractService {
    private contractRepository;
    createContract(data: {
        contractNumber: string;
        title: string;
        type: string;
        value: number;
        startDate: Date;
        endDate: Date;
        accountId: string;
        opportunityId?: string;
        paymentTerms?: string;
        slaTerms?: string;
        remarks?: string;
        createdById?: string;
    }): Promise<Contract>;
    getContractById(id: string): Promise<Contract>;
    getContracts(filters?: ContractFilters): Promise<{
        data: Contract[];
        total: number;
    }>;
    updateContract(id: string, data: Partial<Contract>): Promise<Contract>;
    approveContract(id: string, approvedBy: string): Promise<Contract>;
    deleteContract(id: string): Promise<void>;
}
declare const _default: ContractService;
export default _default;
//# sourceMappingURL=contract.service.d.ts.map