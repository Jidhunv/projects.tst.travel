import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract';
import { AppError } from '../middleware/errorHandler';

interface ContractFilters {
  accountId?: string;
  opportunityId?: string;
  status?: string;
  // "self" scope: a Contract has no owner column, so restrict to contracts for
  // an account this user owns, or that they created themselves.
  scopeUserId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export class ContractService {
  private contractRepository = AppDataSource.getRepository(Contract);

  async createContract(data: {
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
  }): Promise<Contract> {
    // Check if contract number already exists
    const existing = await this.contractRepository.findOne({
      where: { contractNumber: data.contractNumber },
    });
    if (existing) {
      throw new AppError(409, 'Contract number already exists');
    }

    const contract = this.contractRepository.create({
      ...data,
      status: 'Draft',
    });

    return await this.contractRepository.save(contract);
  }

  async getContractById(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['account', 'opportunity', 'projects', 'invoices'],
    });
    if (!contract) {
      throw new AppError(404, 'Contract not found');
    }
    return contract;
  }

  async getContracts(filters: ContractFilters = {}): Promise<{ data: Contract[]; total: number }> {
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
      query.andWhere(
        '(account.ownerId = :scopeUserId OR contract.createdById = :scopeUserId)',
        { scopeUserId: where.scopeUserId }
      );
    }

    const [data, total] = await query
      .orderBy('contract.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
    const contract = await this.getContractById(id);
    Object.assign(contract, data);
    return await this.contractRepository.save(contract);
  }

  async approveContract(id: string, approvedBy: string): Promise<Contract> {
    const contract = await this.getContractById(id);
    contract.status = 'Approved';
    contract.approvedBy = approvedBy;
    contract.approvedDate = new Date();
    return await this.contractRepository.save(contract);
  }

  async deleteContract(id: string): Promise<void> {
    const contract = await this.getContractById(id);
    await this.contractRepository.remove(contract);
  }
}

export default new ContractService();
