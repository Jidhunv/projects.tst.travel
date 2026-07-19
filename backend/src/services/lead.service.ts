import { AppDataSource } from '../config/database';
import { Lead } from '../models/Lead';
import { Account } from '../models/Account';
import { Opportunity } from '../models/Opportunity';
import { LineItem } from '../models/LineItem';
import { AppError } from '../middleware/errorHandler';
import { REJECTION_REASONS } from '../utils/constants';
import { startSpan, endSpan } from '../utils/tracer';

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

export class LeadService {
  private leadRepository = AppDataSource.getRepository(Lead);
  private accountRepository = AppDataSource.getRepository(Account);
  private oppRepository = AppDataSource.getRepository(Opportunity);
  private lineItemRepository = AppDataSource.getRepository(LineItem);

  async createLead(data: {
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
  }): Promise<Lead> {
    const existingLead = await this.leadRepository.findOne({
      where: { email: data.email },
    });

    if (existingLead) {
      throw new AppError(409, 'Lead with this email already exists');
    }

    const lead = this.leadRepository.create({
      ...data,
      value: data.value ?? 0,
      status: 'Open',
      score: 0,
      productIds: data.productIds || [],
      productNames: data.productNames || [],
    });

    return await this.leadRepository.save(lead);
  }

  async getLeadById(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['owner', 'account'],
    });

    if (!lead) {
      throw new AppError(404, 'Lead not found');
    }

    return lead;
  }

  async getLeads(filters: LeadFilters = {}, traceId?: string): Promise<{ data: Lead[]; total: number }> {
    const { page = 1, limit = 20, search, fromDate, toDate, ...where } = filters;
    const skip = (page - 1) * limit;

    let dbSpan: any;
    if (traceId) {
      dbSpan = startSpan(traceId, 'service.lead.getLeads', {
        page,
        limit,
        filters: { ...where, search: search ? '***masked***' : undefined },
      });
    }

    try {
      const query = this.leadRepository
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.owner', 'owner')
        .leftJoinAndSelect('lead.account', 'account');

      // Add search filter
      if (search) {
        query.where(
          '(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.email ILIKE :search OR lead.company ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Add other filters
      if (where.status) {
        query.andWhere('lead.status = :status', { status: where.status });
      }
      if (where.source) {
        query.andWhere('lead.source = :source', { source: where.source });
      }
      if (where.ownerId) {
        // Owner OR one of the additional assignees (multi-assign).
        query.andWhere('(lead.ownerId = :ownerId OR lead.assigneeIds LIKE :ownerIdLike)', {
          ownerId: where.ownerId,
          ownerIdLike: `%${where.ownerId}%`,
        });
      }
      if (where.region) {
        query.andWhere('lead.region ILIKE :region', { region: `%${where.region}%` });
      }
      if (where.country) {
        query.andWhere('lead.country ILIKE :country', { country: `%${where.country}%` });
      }

      if (fromDate) {
        query.andWhere('lead.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
      }
      if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        query.andWhere('lead.createdAt <= :toDate', { toDate: toDateObj });
      }

      const [data, total] = await query
        .orderBy('lead.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      if (traceId && dbSpan) {
        endSpan(traceId, dbSpan.id, { count: data.length, total });
      }

      return { data, total };
    } catch (err: any) {
      if (traceId && dbSpan) {
        endSpan(traceId, dbSpan.id, undefined, err.message);
      }
      throw err;
    }
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    await this.getLeadById(id);
    // Column-level update: the getById above eager-loads relations, and save()
    // gives a loaded relation precedence over its FK column -- so changing only
    // the FK would be silently overwritten by the stale relation object.
    // update() writes exactly the columns given.
    await this.leadRepository.update(id, data);
    return await this.getLeadById(id);
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead> {
    const lead = await this.getLeadById(id);

    const validStatuses = ['Open', 'Qualified', 'Disqualified', 'Converted'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, 'Invalid lead status');
    }

    lead.status = status;
    return await this.leadRepository.save(lead);
  }

  async deleteLead(id: string): Promise<void> {
    const lead = await this.getLeadById(id);
    await this.leadRepository.remove(lead);
  }

  async convertLeadToAccount(leadId: string): Promise<Account> {
    const lead = await this.getLeadById(leadId);

    if (lead.status !== 'Qualified') {
      throw new AppError(400, 'Lead must be qualified to convert');
    }

    // Check if account already exists
    if (lead.accountId) {
      throw new AppError(409, 'Lead is already converted to an account');
    }

    // Create account from lead
    const account = this.accountRepository.create({
      name: lead.company || `${lead.firstName} ${lead.lastName}`,
      ownerId: lead.ownerId,
      type: 'Prospect',
      status: 'Prospect',
    });

    const savedAccount = await this.accountRepository.save(account);

    // Update lead with account reference
    lead.accountId = savedAccount.id;
    lead.status = 'Converted';
    await this.leadRepository.save(lead);

    return savedAccount;
  }

  // Convert a lead directly into a sales opportunity.
  // Creates (or reuses) an account, then an opportunity seeded with the lead's
  // value, expected close date, and product of interest.
  async convertLeadToOpportunity(leadId: string): Promise<Opportunity> {
    const lead = await this.getLeadById(leadId);

    if (lead.status === 'Converted') {
      throw new AppError(409, 'Lead is already converted');
    }
    if (lead.status === 'Disqualified') {
      throw new AppError(400, 'A lost lead cannot be converted');
    }

    // Reuse a linked account or create one from the lead's company.
    let accountId = lead.accountId;
    if (!accountId) {
      const account = await this.accountRepository.save(
        this.accountRepository.create({
          name: lead.company || `${lead.firstName} ${lead.lastName}`,
          ownerId: lead.ownerId,
          type: 'Prospect',
          status: 'Prospect',
          contactPerson: `${lead.firstName} ${lead.lastName}`.trim(),
          region: lead.region,
          country: lead.country,
          phoneNumber: lead.phoneNumber,
        })
      );
      accountId = account.id;
    }

    const dealName = lead.productName
      ? `${lead.company || lead.firstName} - ${lead.productName}`
      : `${lead.company || lead.firstName} - New Deal`;

    const closeDate =
      lead.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const opp = await this.oppRepository.save(
      this.oppRepository.create({
        name: dealName,
        amount: lead.value || 0,
        stage: 'Qualification',
        status: 'Open',
        probability: 25,
        forecastedCloseDate: closeDate,
        accountId,
        ownerId: lead.ownerId,
        // Carry over ALL lead details so nothing is lost on conversion.
        businessVolume: lead.businessVolume,
        supplierList: lead.supplierList,
        region: lead.region,
        country: lead.country,
        company: lead.company,
        contactPerson: `${lead.firstName} ${lead.lastName}`.trim(),
        contactEmail: lead.email,
        contactPhone: lead.phoneNumber,
        jobTitle: lead.jobTitle,
        source: lead.source,
        remark: lead.remark,
        tags: lead.tags,
        convertedFromLeadId: lead.id,
      })
    );

    // Carry the lead's product across as a line item.
    if (lead.productName) {
      await this.lineItemRepository.save(
        this.lineItemRepository.create({
          productId: lead.productId,
          productName: lead.productName,
          quantity: 1,
          unitPrice: lead.value || 0,
          opportunityId: opp.id,
        })
      );
    }

    lead.accountId = accountId;
    lead.status = 'Converted';
    await this.leadRepository.save(lead);

    return opp;
  }

  // Close a lead as lost, recording a reason from the fixed list.
  async markLeadLost(leadId: string, lostReason: string): Promise<Lead> {
    if (!REJECTION_REASONS.includes(lostReason as never)) {
      throw new AppError(
        400,
        `A valid reason is required. Allowed: ${REJECTION_REASONS.join(', ')}`
      );
    }

    const lead = await this.getLeadById(leadId);
    if (lead.status === 'Converted') {
      throw new AppError(400, 'A converted lead cannot be marked lost');
    }

    lead.status = 'Disqualified';
    lead.lostReason = lostReason;
    return await this.leadRepository.save(lead);
  }

  async updateLeadScore(id: string, points: number): Promise<Lead> {
    const lead = await this.getLeadById(id);
    lead.score += points;
    return await this.leadRepository.save(lead);
  }

  async bulkImportLeads(
    leads: Array<Partial<Lead>>,
    ownerId: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const leadData of leads) {
      try {
        await this.createLead({
          firstName: leadData.firstName || '',
          lastName: leadData.lastName || '',
          email: leadData.email || '',
          phoneNumber: leadData.phoneNumber,
          company: leadData.company,
          jobTitle: leadData.jobTitle,
          source: leadData.source || 'bulk-import',
          ownerId,
        });
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }
}

export default new LeadService();
