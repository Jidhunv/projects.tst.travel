import { AppDataSource } from '../config/database';
import stageHistory from './stageHistory.service';
import { Opportunity } from '../models/Opportunity';
import { LineItem } from '../models/LineItem';
import { Account } from '../models/Account';
import { AppError } from '../middleware/errorHandler';
import { OPPORTUNITY_STAGES } from '../utils/constants';
import { statusForStage } from '../utils/questionnaire';
import { committeeCountsByAccount } from './buyingCommittee.service';
import { resolveSort, SortMap } from '../utils/listSort';

const OPPORTUNITY_SORT: SortMap = {
  name: 'opp.name',
  amount: 'opp.amount',
  stage: 'opp.stage',
  status: 'opp.status',
  probability: 'opp.probability',
  closeDate: 'opp.forecastedCloseDate',
  country: 'opp.country',
  region: 'opp.region',
  createdAt: 'opp.createdAt',
};

interface OpportunityFilters {
  sortBy?: string;
  sortDir?: string;
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

export class OpportunityService {
  private oppRepository = AppDataSource.getRepository(Opportunity);
  private lineItemRepository = AppDataSource.getRepository(LineItem);

  private formatOpportunity(opp: Opportunity): Opportunity & { productIds?: string[]; productNames?: string[] } {
    const formatted = { ...opp } as any;
    if (opp.lineItems && opp.lineItems.length > 0) {
      formatted.productIds = opp.lineItems.map((item) => item.productId).filter(Boolean);
      formatted.productNames = opp.lineItems.map((item) => item.productName);
    } else {
      formatted.productIds = [];
      formatted.productNames = [];
    }
    return formatted;
  }

  async createOpportunity(data: {
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
  }): Promise<any> {
    if (!(OPPORTUNITY_STAGES as readonly string[]).includes(data.stage)) {
      throw new AppError(400, 'Invalid opportunity stage');
    }

    const { productIds, productNames, ...oppData } = data;

    // Get account to populate tier if not provided
    let tier = data.tier;
    if (!tier && data.accountId) {
      const account = await AppDataSource.getRepository(Account).findOne({
        where: { id: data.accountId },
      });
      tier = account?.tier;
    }

    const opp = this.oppRepository.create({
      ...oppData,
      status: 'Open',
      probability: data.probability || 10,
      country: data.country,
      city: data.city,
      region: data.region,
      tier,
    });

    const savedOpp = await this.oppRepository.save(opp);
    await stageHistory.record(savedOpp.id, savedOpp.stage, data.ownerId, 'Deal created');

    // Create line items if products are provided
    if (productIds && productIds.length > 0) {
      const names = productNames || [];
      for (let i = 0; i < productIds.length; i++) {
        const lineItem = this.lineItemRepository.create({
          productId: productIds[i],
          productName: names[i] || '',
          quantity: 1,
          unitPrice: 0,
          opportunity: savedOpp,
        });
        await this.lineItemRepository.save(lineItem);
      }
      // Reload to get the line items
      return await this.getOpportunityById(savedOpp.id);
    }

    return this.formatOpportunity(savedOpp);
  }

  async getOpportunityById(id: string): Promise<any> {
    const opp = await this.oppRepository.findOne({
      where: { id },
      relations: ['owner', 'account', 'primaryContact', 'lineItems'],
    });

    if (!opp) {
      throw new AppError(404, 'Opportunity not found');
    }

    return this.formatOpportunity(opp);
  }

  async getOpportunities(filters: OpportunityFilters = {}): Promise<{
    data: Opportunity[];
    total: number;
  }> {
    const { page = 1, limit = 20, search, fromDate, toDate, amountFrom, amountTo, ...where } = filters;
    const order = resolveSort(filters.sortBy, filters.sortDir, OPPORTUNITY_SORT, 'closeDate', 'ASC');
    const skip = (page - 1) * limit;

    const query = this.oppRepository
      .createQueryBuilder('opp')
      .leftJoinAndSelect('opp.owner', 'owner')
      .leftJoinAndSelect('opp.account', 'account')
      .leftJoinAndSelect('opp.lineItems', 'lineItems');

    if (search) {
      query.where('opp.name ILIKE :search', { search: `%${search}%` });
    }

    if (where.stage) {
      query.andWhere('opp.stage = :stage', { stage: where.stage });
    }
    if (where.status) {
      query.andWhere('opp.status = :status', { status: where.status });
    }
    if (where.ownerId) {
      query.andWhere('(opp.ownerId = :ownerId OR opp.assigneeIds LIKE :ownerIdLike)', {
        ownerId: where.ownerId,
        ownerIdLike: `%${where.ownerId}%`,
      });
    }
    if (where.accountId) {
      query.andWhere('opp.accountId = :accountId', { accountId: where.accountId });
    }
    if (where.region) {
      query.andWhere('opp.region ILIKE :region', { region: `%${where.region}%` });
    }
    if (where.country) {
      query.andWhere('opp.country ILIKE :country', { country: `%${where.country}%` });
    }
    if (where.city) {
      query.andWhere('opp.city ILIKE :city', { city: `%${where.city}%` });
    }
    if (where.products && where.products.length > 0) {
      query.andWhere('lineItems.productId IN (:...productIds)', { productIds: where.products });
    }

    if (fromDate) {
      query.andWhere('opp.createdAt >= :fromDate', { fromDate: new Date(`${fromDate}T00:00:00.000Z`) });
    }
    if (toDate) {
      query.andWhere('opp.createdAt <= :toDate', { toDate: new Date(`${toDate}T23:59:59.999Z`) });
    }

    if (amountFrom !== undefined && amountFrom !== null) {
      query.andWhere('opp.amount >= :amountFrom', { amountFrom: Number(amountFrom) });
    }
    if (amountTo !== undefined && amountTo !== null) {
      query.andWhere('opp.amount <= :amountTo', { amountTo: Number(amountTo) });
    }

    const [rows, total] = await query
      .orderBy(order.column, order.dir)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Flag deals whose account has no buying committee yet, at every stage.
    const counts = await committeeCountsByAccount(rows.map((o) => o.accountId));
    const data = rows.map((opp) => {
      const n = counts.get(opp.accountId) ?? 0;
      return { ...this.formatOpportunity(opp), buyingCommitteeCount: n, hasBuyingCommittee: n > 0 };
    });

    return { data, total };
  }

  async updateOpportunity(id: string, data: any, actorId?: string): Promise<any> {
    const opp = await this.oppRepository.findOne({
      where: { id },
      relations: ['lineItems'],
    });

    if (!opp) {
      throw new AppError(404, 'Opportunity not found');
    }

    if (data.stage) {
      if (!(OPPORTUNITY_STAGES as readonly string[]).includes(data.stage)) {
        throw new AppError(400, 'Invalid opportunity stage');
      }
    }

    if (data.status) {
      const validStatuses = ['Open', 'Won', 'Lost'];
      if (!validStatuses.includes(data.status)) {
        throw new AppError(400, 'Invalid opportunity status');
      }

      if (data.status === 'Won') {
        data.stage = 'Closed-Won';
        data.probability = 100;
        data.closedAt = new Date();
      } else if (data.status === 'Lost') {
        data.stage = 'Closed-Lost';
        data.probability = 0;
        data.closedAt = new Date();
      }
    }

    // Handle product updates
    const { productIds, productNames, ...oppData } = data;
    if ((productIds !== undefined || productNames !== undefined) && Array.isArray(productIds) && productIds.length > 0) {
      // Remove existing line items
      if (opp.lineItems && opp.lineItems.length > 0) {
        await this.lineItemRepository.delete({ opportunity: { id } });
      }
      // Create new line items
      const names = productNames || [];
      for (let i = 0; i < productIds.length; i++) {
        const lineItem = this.lineItemRepository.create({
          productId: productIds[i],
          productName: names[i] || '',
          quantity: 1,
          unitPrice: 0,
          opportunity: opp,
        });
        await this.lineItemRepository.save(lineItem);
      }
    } else if (Array.isArray(productIds) && productIds.length === 0) {
      // Clear all line items if empty array is passed
      await this.lineItemRepository.delete({ opportunity: { id } });
    }

    // Column-level update: the getById above eager-loads relations, and save()
    // gives a loaded relation precedence over its FK column -- so changing only
    // the FK would be silently overwritten by the stale relation object.
    // update() writes exactly the columns given.
    await this.oppRepository.update(id, oppData as any);
    if (data.stage && data.stage !== opp.stage) await stageHistory.record(id, data.stage, actorId ?? null, null, opp.stage);
    return await this.getOpportunityById(id);
  }

  // Admin-only: directly overwrite system-managed timestamp columns to
  // backfill historical/imported data. These fields are deliberately absent
  // from OPPORTUNITY_UPDATABLE (the normal edit whitelist) since they should
  // never be client-settable through the regular edit form - this is a
  // separate, explicitly gated path for data correction only.
  async adminUpdateDates(
    id: string,
    data: { createdAt?: string; forecastedCloseDate?: string; closedAt?: string | null }
  ): Promise<any> {
    const opp = await this.oppRepository.findOne({ where: { id } });
    if (!opp) {
      throw new AppError(404, 'Opportunity not found');
    }

    const updates: Record<string, Date | null> = {};
    if (data.createdAt !== undefined) {
      const d = new Date(data.createdAt);
      if (isNaN(d.getTime())) throw new AppError(400, 'Invalid createdAt date');
      updates.createdAt = d;
    }
    if (data.forecastedCloseDate !== undefined) {
      const d = new Date(data.forecastedCloseDate);
      if (isNaN(d.getTime())) throw new AppError(400, 'Invalid forecastedCloseDate date');
      updates.forecastedCloseDate = d;
    }
    if (data.closedAt !== undefined) {
      if (data.closedAt === null || data.closedAt === '') {
        updates.closedAt = null;
      } else {
        const d = new Date(data.closedAt);
        if (isNaN(d.getTime())) throw new AppError(400, 'Invalid closedAt date');
        updates.closedAt = d;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'No date fields provided');
    }

    await this.oppRepository.update(id, updates as any);
    return await this.getOpportunityById(id);
  }

  async updateStage(id: string, stage: string, actorId?: string): Promise<any> {
    if (!(OPPORTUNITY_STAGES as readonly string[]).includes(stage)) {
      throw new AppError(400, 'Invalid opportunity stage');
    }

    const rawOpp = await this.oppRepository.findOne({
      where: { id },
      relations: ['lineItems'],
    });

    if (!rawOpp) {
      throw new AppError(404, 'Opportunity not found');
    }

    const fromStage = rawOpp.stage;
    rawOpp.stage = stage;

    // Update probability based on stage
    const stageProbability: { [key: string]: number } = {
      'Customer engagement': 10,
      Demonstration: 25,
      Proposal: 50,
      Negotiation: 75,
      'Closed-Won': 100,
      Handover: 100,
      'Closed-Lost': 0,
    };

    rawOpp.probability = stageProbability[stage] || rawOpp.probability;
    // The stage endpoint sets the status too, so a win or loss reads Won/Lost, not Open.
    rawOpp.status = statusForStage(stage);

    const saved = await this.oppRepository.save(rawOpp);
    if (fromStage !== stage) await stageHistory.record(id, stage, actorId ?? null, null, fromStage);
    return this.formatOpportunity(saved);
  }

  async closeOpportunity(
    id: string,
    outcome: 'Won' | 'Lost',
    rejectionReason?: string,
    actorId?: string
  ): Promise<any> {
    const rawOpp = await this.oppRepository.findOne({
      where: { id },
      relations: ['lineItems'],
    });

    if (!rawOpp) {
      throw new AppError(404, 'Opportunity not found');
    }

    const fromStage = rawOpp.stage;
    rawOpp.status = outcome === 'Won' ? 'Won' : 'Lost';
    rawOpp.stage = outcome === 'Won' ? 'Closed-Won' : 'Closed-Lost';
    // For a win, record the outcome; for a loss, store the selected rejection reason.
    rawOpp.closedReason = outcome === 'Won' ? 'Won' : rejectionReason || 'Lost';
    rawOpp.closedAt = new Date();
    rawOpp.probability = outcome === 'Won' ? 100 : 0;

    const saved = await this.oppRepository.save(rawOpp);
    if (fromStage !== rawOpp.stage) await stageHistory.record(id, rawOpp.stage, actorId ?? null, rejectionReason ? `Lost: ${rejectionReason}` : null, fromStage);
    return this.formatOpportunity(saved);
  }

  async deleteOpportunity(id: string): Promise<void> {
    const opp = await this.getOpportunityById(id);
    await this.oppRepository.remove(opp);
  }

  async addLineItem(
    opportunityId: string,
    data: {
      productId?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      discountPercent?: number;
      description?: string;
    }
  ): Promise<LineItem> {
    const opp = await this.getOpportunityById(opportunityId);

    const lineItem = this.lineItemRepository.create({
      ...data,
      opportunity: opp,
    });

    const saved = await this.lineItemRepository.save(lineItem);

    // Recalculate opportunity amount
    await this.recalculateAmount(opportunityId);

    return saved;
  }

  async updateLineItem(
    opportunityId: string,
    lineItemId: string,
    data: Partial<LineItem>
  ): Promise<LineItem> {
    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, opportunityId },
    });

    if (!lineItem) {
      throw new AppError(404, 'Line item not found');
    }

    Object.assign(lineItem, data);
    const saved = await this.lineItemRepository.save(lineItem);

    // Recalculate opportunity amount
    await this.recalculateAmount(opportunityId);

    return saved;
  }

  async deleteLineItem(opportunityId: string, lineItemId: string): Promise<void> {
    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, opportunityId },
    });

    if (!lineItem) {
      throw new AppError(404, 'Line item not found');
    }

    await this.lineItemRepository.remove(lineItem);

    // Recalculate opportunity amount
    await this.recalculateAmount(opportunityId);
  }

  private async recalculateAmount(opportunityId: string): Promise<void> {
    const lineItems = await this.lineItemRepository.find({
      where: { opportunityId },
    });

    const total = lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountPercent
        ? (itemTotal * item.discountPercent) / 100
        : item.discount || 0;
      return sum + (itemTotal - discountAmount);
    }, 0);

    const opp = await this.getOpportunityById(opportunityId);
    opp.amount = total;
    await this.oppRepository.save(opp);
  }

  async getPipeline(filters: { ownerId?: string; accountId?: string } = {}): Promise<{
    [stage: string]: Opportunity[];
  }> {
    const query = this.oppRepository
      .createQueryBuilder('opp')
      .leftJoinAndSelect('opp.owner', 'owner')
      .leftJoinAndSelect('opp.account', 'account')
      .where('opp.status = :status', { status: 'Open' });

    if (filters.ownerId) {
      query.andWhere('opp.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    if (filters.accountId) {
      query.andWhere('opp.accountId = :accountId', { accountId: filters.accountId });
    }

    const opps = await query.orderBy('opp.forecastedCloseDate', 'ASC').getMany();

    const pipeline: { [stage: string]: Opportunity[] } = {};
    OPPORTUNITY_STAGES.forEach((stage) => {
      pipeline[stage] = opps.filter((opp) => opp.stage === stage);
    });

    return pipeline;
  }

  async getForecast(ownerId?: string): Promise<{
    stage: string;
    count: number;
    totalAmount: number;
    expectedRevenue: number;
  }[]> {
    const query = this.oppRepository
      .createQueryBuilder('opp')
      .select('opp.stage', 'stage')
      .addSelect('COUNT(opp.id)', 'count')
      .addSelect('SUM(opp.amount)', 'totalAmount')
      .addSelect('SUM(opp.amount * opp.probability / 100)', 'expectedRevenue')
      .where('opp.status = :status', { status: 'Open' })
      .groupBy('opp.stage');

    if (ownerId) {
      query.andWhere('opp.ownerId = :ownerId', { ownerId });
    }

    const result = await query.getRawMany();

    return result.map((row) => ({
      stage: row.stage,
      count: parseInt(row.count),
      totalAmount: parseFloat(row.totalAmount || 0),
      expectedRevenue: parseFloat(row.expectedRevenue || 0),
    }));
  }
}

export default new OpportunityService();
