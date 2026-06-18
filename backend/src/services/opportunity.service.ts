import { AppDataSource } from '../config/database';
import { Opportunity } from '../models/Opportunity';
import { LineItem } from '../models/LineItem';
import { AppError } from '../middleware/errorHandler';

interface OpportunityFilters {
  stage?: string;
  status?: string;
  ownerId?: string;
  accountId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export class OpportunityService {
  private oppRepository = AppDataSource.getRepository(Opportunity);
  private lineItemRepository = AppDataSource.getRepository(LineItem);

  async createOpportunity(data: {
    name: string;
    amount: number;
    stage: string;
    forecastedCloseDate: Date;
    accountId: string;
    primaryContactId?: string;
    ownerId: string;
    probability?: number;
  }): Promise<Opportunity> {
    const validStages = [
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed-Won',
      'Closed-Lost',
    ];

    if (!validStages.includes(data.stage)) {
      throw new AppError(400, 'Invalid opportunity stage');
    }

    const opp = this.oppRepository.create({
      ...data,
      status: 'Open',
      probability: data.probability || 10,
    });

    return await this.oppRepository.save(opp);
  }

  async getOpportunityById(id: string): Promise<Opportunity> {
    const opp = await this.oppRepository.findOne({
      where: { id },
      relations: ['owner', 'account', 'primaryContact', 'lineItems', 'activities', 'notes'],
    });

    if (!opp) {
      throw new AppError(404, 'Opportunity not found');
    }

    return opp;
  }

  async getOpportunities(filters: OpportunityFilters = {}): Promise<{
    data: Opportunity[];
    total: number;
  }> {
    const { page = 1, limit = 20, search, ...where } = filters;
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
      query.andWhere('opp.ownerId = :ownerId', { ownerId: where.ownerId });
    }
    if (where.accountId) {
      query.andWhere('opp.accountId = :accountId', { accountId: where.accountId });
    }

    const [data, total] = await query
      .orderBy('opp.forecastedCloseDate', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
    const opp = await this.getOpportunityById(id);

    if (data.stage) {
      const validStages = [
        'Prospecting',
        'Qualification',
        'Proposal',
        'Negotiation',
        'Closed-Won',
        'Closed-Lost',
      ];
      if (!validStages.includes(data.stage)) {
        throw new AppError(400, 'Invalid opportunity stage');
      }
    }

    Object.assign(opp, data);
    return await this.oppRepository.save(opp);
  }

  async updateStage(id: string, stage: string): Promise<Opportunity> {
    const validStages = [
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed-Won',
      'Closed-Lost',
    ];

    if (!validStages.includes(stage)) {
      throw new AppError(400, 'Invalid opportunity stage');
    }

    const opp = await this.getOpportunityById(id);
    opp.stage = stage;

    // Update probability based on stage
    const stageProbability: { [key: string]: number } = {
      Prospecting: 10,
      Qualification: 25,
      Proposal: 50,
      Negotiation: 75,
      'Closed-Won': 100,
      'Closed-Lost': 0,
    };

    opp.probability = stageProbability[stage] || opp.probability;

    return await this.oppRepository.save(opp);
  }

  async closeOpportunity(
    id: string,
    reason: 'Won' | 'Lost'
  ): Promise<Opportunity> {
    const opp = await this.getOpportunityById(id);

    opp.status = reason === 'Won' ? 'Won' : 'Lost';
    opp.stage = reason === 'Won' ? 'Closed-Won' : 'Closed-Lost';
    opp.closedReason = reason;
    opp.closedAt = new Date();
    opp.probability = reason === 'Won' ? 100 : 0;

    return await this.oppRepository.save(opp);
  }

  async deleteOpportunity(id: string): Promise<void> {
    const opp = await this.getOpportunityById(id);
    await this.oppRepository.remove(opp);
  }

  async addLineItem(
    opportunityId: string,
    data: {
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

    const stages = [
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed-Won',
      'Closed-Lost',
    ];

    const pipeline: { [stage: string]: Opportunity[] } = {};
    stages.forEach((stage) => {
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
