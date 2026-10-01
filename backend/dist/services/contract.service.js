"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const database_1 = require("../config/database");
const Contract_1 = require("../models/Contract");
const errorHandler_1 = require("../middleware/errorHandler");
class ContractService {
    constructor() {
        this.contractRepository = database_1.AppDataSource.getRepository(Contract_1.Contract);
    }
    async createContract(data) {
        // Check if contract number already exists
        const existing = await this.contractRepository.findOne({
            where: { contractNumber: data.contractNumber },
        });
        if (existing) {
            throw new errorHandler_1.AppError(409, 'Contract number already exists');
        }
        const contract = this.contractRepository.create({
            ...data,
            status: 'Draft',
        });
        return await this.contractRepository.save(contract);
    }
    async getContractById(id) {
        const contract = await this.contractRepository.findOne({
            where: { id },
            relations: ['account', 'opportunity', 'projects', 'invoices'],
        });
        if (!contract) {
            throw new errorHandler_1.AppError(404, 'Contract not found');
        }
        return contract;
    }
    async getContracts(filters = {}) {
        const { page = 1, limit = 20, search, ...where } = filters;
        const skip = (page - 1) * limit;
        const query = this.contractRepository
            .createQueryBuilder('contract')
            .leftJoinAndSelect('contract.account', 'account')
            .leftJoinAndSelect('contract.opportunity', 'opportunity');
        if (search) {
            query.where('(contract.title ILIKE :search OR contract.contractNumber ILIKE :search)', {
                search: `%${search}%`,
            });
        }
        if (where.accountId) {
            query.andWhere('contract.accountId = :accountId', { accountId: where.accountId });
        }
        if (where.opportunityId) {
            query.andWhere('contract.opportunityId = :opportunityId', { opportunityId: where.opportunityId });
        }
        if (where.status) {
            query.andWhere('contract.status = :status', { status: where.status });
        }
        if (where.scopeUserId) {
            query.andWhere('(account.ownerId = :scopeUserId OR contract.createdById = :scopeUserId)', { scopeUserId: where.scopeUserId });
        }
        const [data, total] = await query
            .orderBy('contract.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async updateContract(id, data) {
        await this.getContractById(id);
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.contractRepository.update(id, data);
        return await this.getContractById(id);
    }
    async approveContract(id, approvedBy) {
        const contract = await this.getContractById(id);
        contract.status = 'Approved';
        contract.approvedBy = approvedBy;
        contract.approvedDate = new Date();
        return await this.contractRepository.save(contract);
    }
    async deleteContract(id) {
        const contract = await this.getContractById(id);
        await this.contractRepository.remove(contract);
    }
}
exports.ContractService = ContractService;
exports.default = new ContractService();
//# sourceMappingURL=contract.service.js.map