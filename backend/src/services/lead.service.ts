import { AppDataSource } from '../config/database';
import { Lead } from '../models/Lead';
import { Account } from '../models/Account';
import { Opportunity } from '../models/Opportunity';
import { LineItem } from '../models/LineItem';
import { AppError } from '../middleware/errorHandler';
import { REJECTION_REASONS } from '../utils/constants';

interface LeadFilters {
  status?: string;
  source?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
  search?: string;
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

  async getLeads(filters: LeadFilters = {}): Promise<{ data: Lead[]; total: number }> {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;

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
      query.andWhere('lead.ownerId = :ownerId', { ownerId: where.ownerId });
    }

    const [data, total] = await query
      .orderBy('lead.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    const lead = await this.getLeadById(id);
    Object.assign(lead, data);
    return await this.leadRepository.save(lead);
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
