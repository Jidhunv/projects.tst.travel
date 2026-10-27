import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import leadHistory from './prospectStatusHistory.service';
import stageHistory from './stageHistory.service';
import { Lead } from '../models/Lead';
import { Account } from '../models/Account';
import { Opportunity } from '../models/Opportunity';
import { LineItem } from '../models/LineItem';
import { AppError } from '../middleware/errorHandler';
import { REJECTION_REASONS } from '../utils/constants';
import { leadQualificationProgress } from '../utils/prospectQualification';
import { prospectingProgress } from '../utils/prospecting';
import { activeProspectOptions } from './prospectOptions.service';
import { startSpan, endSpan } from '../utils/tracer';
import { committeeCountsByAccount } from './buyingCommittee.service';
import { resolveSort, SortMap } from '../utils/listSort';

const LEAD_SORT: SortMap = {
  name: 'lead.firstName',
  company: 'lead.company',
  status: 'lead.status',
  value: 'lead.value',
  tier: 'lead.tier',
  country: 'lead.country',
  region: 'lead.region',
  createdAt: 'lead.createdAt',
};

interface LeadFilters {
  sortBy?: string;
  sortDir?: string;
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

  // A contact can be a prospect once per product. Throws 409 when that prospect already exists.
  async assertNoDuplicate(email: string, productId?: string | null): Promise<void> {
    const existing = await this.leadRepository.findOne({
      where: { email, productId: productId ?? IsNull() },
    });
    if (existing) {
      throw new AppError(409, productId
        ? `A prospect for this email and product already exists (${existing.productName || 'product'})`
        : 'A prospect with this email already exists');
    }
  }

  async createLead(data: {
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
  }): Promise<Lead> {
    await this.assertNoDuplicate(data.email, data.productId);

    // Get account to populate tier from it
    const account = await this.accountRepository.findOne({
      where: { id: data.accountId },
    });

    const lead = this.leadRepository.create({
      ...data,
      value: data.value ?? 0,
      status: 'Open',
      score: 0,
      productIds: data.productIds || [],
      productNames: data.productNames || [],
      tier: account?.tier,
    });

    const savedLead = await this.leadRepository.save(lead);
    await leadHistory.record(savedLead.id, savedLead.status || 'Open', data.ownerId ?? null, 'Lead created');
    return savedLead;
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
    const order = resolveSort(filters.sortBy, filters.sortDir, LEAD_SORT, 'createdAt');
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
        query.andWhere('lead.createdAt >= :fromDate', { fromDate: new Date(`${fromDate}T00:00:00.000Z`) });
      }
      if (toDate) {
        query.andWhere('lead.createdAt <= :toDate', { toDate: new Date(`${toDate}T23:59:59.999Z`) });
      }

      const [rows, total] = await query
        .orderBy(order.column, order.dir)
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Flag leads whose account has no buying committee yet, so the list can
      // highlight them at every stage.
      const counts = await committeeCountsByAccount(rows.map((l) => l.accountId));
      const data = rows.map((l) => {
        const n = counts.get(l.accountId) ?? 0;
        return Object.assign(l, { buyingCommitteeCount: n, hasBuyingCommittee: n > 0 });
      });

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

  async updateLeadStatus(id: string, status: string, actorId?: string): Promise<Lead> {
    const lead = await this.getLeadById(id);

    const validStatuses = ['Open', 'Qualified', 'Prospect', 'Disqualified', 'Converted'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, 'Invalid lead status');
    }

    // Each stage needs the questionnaire of the stage before it. Qualified: the lead questionnaire (13 questions).
    if (status === 'Qualified' && lead.status !== 'Qualified') {
      const account = await this.accountRepository.findOne({ where: { id: lead.accountId } });
      const lead13 = prospectingProgress(account as any, account?.prospectingAnswers as any, await activeProspectOptions());
      if (!lead13.complete) {
        throw new AppError(400, `Complete the lead questionnaire before this lead is qualified (${lead13.answered} of ${lead13.total} answered; missing: ${lead13.missing.join(', ')}). It is on the account, under Prospects > Prospecting.`);
      }
    }
    // Prospect: the qualification questionnaire (nine mandatory questions) must be complete.
    if (status === 'Prospect' && lead.status === 'Qualified') {
      const account = await this.accountRepository.findOne({ where: { id: lead.accountId } });
      const progress = leadQualificationProgress(account?.leadQualification as any);
      if (!progress.complete) {
        throw new AppError(400, `Complete the qualification questionnaire before this lead becomes a prospect (${progress.answered} of ${progress.total} mandatory answered; missing: ${progress.missing.join(', ')}).`);
      }
    }

    // Only a qualified lead can be converted to a prospect.
    if (status === 'Prospect' && lead.status !== 'Qualified') {
      throw new AppError(400, 'Only a qualified lead can be converted to a prospect. Complete the qualification questionnaire first.');
    }

    const fromStatus = lead.status;
    lead.status = status;
    const saved = await this.leadRepository.save(lead);
    if (fromStatus !== status) await leadHistory.record(id, status, actorId ?? null, null, fromStatus);
    return saved;
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
    const fromStatus = lead.status;
    lead.accountId = savedAccount.id;
    lead.status = 'Converted';
    await this.leadRepository.save(lead);
    await leadHistory.record(leadId, 'Converted', null, 'Converted to account', fromStatus);

    return savedAccount;
  }

  // Convert a lead directly into a sales opportunity.
  // Creates (or reuses) an account, then an opportunity seeded with the lead's
  // value, expected close date, and product of interest.
  async convertLeadToOpportunity(leadId: string, actorId?: string): Promise<Opportunity> {
    const lead = await this.getLeadById(leadId);

    if (lead.status === 'Converted') {
      throw new AppError(409, 'Lead is already converted');
    }
    if (lead.status === 'Disqualified') {
      throw new AppError(400, 'A lost lead cannot be converted');
    }
    // Only a prospect becomes an opportunity.
    if (lead.status !== 'Prospect') {
      throw new AppError(400, 'Only a prospect can be converted into an opportunity. Convert the qualified lead to a prospect first.');
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

    const baseDealName = lead.productName
      ? `${lead.company || lead.firstName} - ${lead.productName}`
      : `${lead.company || lead.firstName}`;

    // Auto-generated names collide whenever the same company converts
    // another lead with no product (or the same product) set. Disambiguate
    // by appending (1), (2), ... rather than silently creating duplicates.
    let dealName = baseDealName;
    let suffix = 0;
    while (await this.oppRepository.findOne({ where: { name: dealName } })) {
      suffix++;
      dealName = `${baseDealName} (${suffix})`;
    }

    const closeDate =
      lead.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const opp = await this.oppRepository.save(
      this.oppRepository.create({
        name: dealName,
        amount: lead.value || 0,
        stage: 'Demonstration',
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
    await stageHistory.record(opp.id, 'Demonstration', lead.ownerId, `Converted from lead ${leadId}`);

    // Carry the lead's products across as line items.
    // Support both single product (legacy) and multiple products (array).
    const productIds = lead.productIds && lead.productIds.length > 0 ? lead.productIds : (lead.productId ? [lead.productId] : []);
    const productNames = lead.productNames && lead.productNames.length > 0 ? lead.productNames : (lead.productName ? [lead.productName] : []);

    if (productIds.length > 0) {
      for (let i = 0; i < productIds.length; i++) {
        await this.lineItemRepository.save(
          this.lineItemRepository.create({
            productId: productIds[i],
            productName: productNames[i] || '',
            quantity: 1,
            unitPrice: lead.value || 0,
            opportunityId: opp.id,
          })
        );
      }
    }

    const fromStatus = lead.status;
    lead.accountId = accountId;
    lead.status = 'Converted';
    await this.leadRepository.save(lead);
    await leadHistory.record(leadId, 'Converted', actorId ?? null, `Converted to deal ${opp.name}`, fromStatus);

    return opp;
  }

  // Close a lead as lost, recording a reason from the fixed list.
  async markLeadLost(leadId: string, lostReason: string, actorId?: string): Promise<Lead> {
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

    const fromStatus = lead.status;
    lead.status = 'Disqualified';
    lead.lostReason = lostReason;
    const saved = await this.leadRepository.save(lead);
    await leadHistory.record(leadId, 'Disqualified', actorId ?? null, lostReason, fromStatus);
    return saved;
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
        // A lead requires an account; rows without one fail (counted below)
        // rather than saving an orphaned lead.
        if (!leadData.accountId) {
          throw new AppError(400, 'accountId is required');
        }
        await this.createLead({
          accountId: leadData.accountId,
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
