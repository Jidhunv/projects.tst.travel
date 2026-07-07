import { AppDataSource } from '../config/database';
import { Opportunity } from '../models/Opportunity';
import { Lead } from '../models/Lead';
import { OPPORTUNITY_STAGES } from '../utils/constants';
import logger from '../utils/logger';

// All monetary values are returned as plain numbers (dollars).
// The frontend formats them as currency.

interface StageBucket {
  stage: string;
  count: number;
  totalValue: number; // sum of opportunity amounts
  weightedValue: number; // sum of amount * probability / 100 (expected revenue)
}

export class ReportService {
  private oppRepository = AppDataSource.getRepository(Opportunity);
  private leadRepository = AppDataSource.getRepository(Lead);

  // Apply Sales Rep ownership scope when an ownerId is provided.
  private scopeOwner<T extends { andWhere: Function }>(query: T, ownerId?: string): T {
    if (ownerId) {
      query.andWhere('opp.ownerId = :ownerId', { ownerId });
    }
    return query;
  }

  // --- Pipeline value report: open opportunities grouped by stage, in dollars ---
  async getPipelineReport(ownerId?: string): Promise<{
    byStage: StageBucket[];
    totalOpenValue: number;
    totalWeightedValue: number;
    openCount: number;
  }> {
    const query = this.oppRepository
      .createQueryBuilder('opp')
      .select('opp.stage', 'stage')
      .addSelect('COUNT(opp.id)', 'count')
      .addSelect('COALESCE(SUM(opp.amount), 0)', 'totalValue')
      .addSelect('COALESCE(SUM(opp.amount * opp.probability / 100), 0)', 'weightedValue')
      .where('opp.status = :status', { status: 'Open' })
      .groupBy('opp.stage');

    this.scopeOwner(query, ownerId);

    const rows = await query.getRawMany();
    const rowMap = new Map(rows.map((r) => [r.stage, r]));

    // Return all open stages in canonical order, zero-filled where empty.
    const openStages = OPPORTUNITY_STAGES.filter((s) => !s.startsWith('Closed'));
    const byStage: StageBucket[] = openStages.map((stage) => {
      const r = rowMap.get(stage);
      return {
        stage,
        count: r ? parseInt(r.count, 10) : 0,
        totalValue: r ? parseFloat(r.totalValue) : 0,
        weightedValue: r ? parseFloat(r.weightedValue) : 0,
      };
    });

    return {
      byStage,
      totalOpenValue: byStage.reduce((s, b) => s + b.totalValue, 0),
      totalWeightedValue: byStage.reduce((s, b) => s + b.weightedValue, 0),
      openCount: byStage.reduce((s, b) => s + b.count, 0),
    };
  }

  // --- Sales report: closed deals (won/lost) with dollar figures ---
  async getSalesReport(
    ownerId?: string,
    from?: Date,
    to?: Date
  ): Promise<{
    wonCount: number;
    wonValue: number;
    lostCount: number;
    lostValue: number;
    winRate: number;
    avgDealSize: number;
    lossReasons: { reason: string; count: number; value: number }[];
  }> {
    const base = () => {
      const q = this.oppRepository.createQueryBuilder('opp');
      if (from) q.andWhere('opp.closedAt >= :from', { from });
      if (to) q.andWhere('opp.closedAt <= :to', { to });
      this.scopeOwner(q, ownerId);
      return q;
    };

    const won = await base()
      .select('COUNT(opp.id)', 'count')
      .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
      .where('opp.status = :status', { status: 'Won' })
      .getRawOne();

    const lost = await base()
      .select('COUNT(opp.id)', 'count')
      .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
      .where('opp.status = :status', { status: 'Lost' })
      .getRawOne();

    const lossRows = await base()
      .select('opp.closedReason', 'reason')
      .addSelect('COUNT(opp.id)', 'count')
      .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
      .where('opp.status = :status', { status: 'Lost' })
      .groupBy('opp.closedReason')
      .orderBy('value', 'DESC')
      .getRawMany();

    const wonCount = parseInt(won.count, 10);
    const wonValue = parseFloat(won.value);
    const lostCount = parseInt(lost.count, 10);
    const lostValue = parseFloat(lost.value);
    const totalClosed = wonCount + lostCount;

    return {
      wonCount,
      wonValue,
      lostCount,
      lostValue,
      winRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
      avgDealSize: wonCount > 0 ? Math.round(wonValue / wonCount) : 0,
      lossReasons: lossRows.map((r) => ({
        reason: r.reason || 'Unspecified',
        count: parseInt(r.count, 10),
        value: parseFloat(r.value),
      })),
    };
  }

  // --- Sales performance by owner (for managers to compare reps) ---
  async getSalesByOwner(): Promise<
    {
      ownerId: string;
      ownerName: string;
      openValue: number;
      wonValue: number;
      lostValue: number;
      winRate: number;
    }[]
  > {
    const rows = await this.oppRepository
      .createQueryBuilder('opp')
      .leftJoin('opp.owner', 'owner')
      .select('opp.ownerId', 'ownerId')
      .addSelect("owner.firstName || ' ' || owner.lastName", 'ownerName')
      .addSelect(
        "COALESCE(SUM(CASE WHEN opp.status = 'Open' THEN opp.amount ELSE 0 END), 0)",
        'openValue'
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN opp.status = 'Won' THEN opp.amount ELSE 0 END), 0)",
        'wonValue'
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN opp.status = 'Lost' THEN opp.amount ELSE 0 END), 0)",
        'lostValue'
      )
      .addSelect(
        "SUM(CASE WHEN opp.status = 'Won' THEN 1 ELSE 0 END)",
        'wonCount'
      )
      .addSelect(
        "SUM(CASE WHEN opp.status = 'Lost' THEN 1 ELSE 0 END)",
        'lostCount'
      )
      .groupBy('opp.ownerId')
      .addGroupBy('owner.firstName')
      .addGroupBy('owner.lastName')
      .getRawMany();

    return rows.map((r) => {
      const wonCount = parseInt(r.wonCount, 10);
      const lostCount = parseInt(r.lostCount, 10);
      const closed = wonCount + lostCount;
      return {
        ownerId: r.ownerId,
        ownerName: r.ownerName || 'Unknown',
        openValue: parseFloat(r.openValue),
        wonValue: parseFloat(r.wonValue),
        lostValue: parseFloat(r.lostValue),
        winRate: closed > 0 ? Math.round((wonCount / closed) * 100) : 0,
      };
    });
  }

  // --- Consolidated MIS dashboard ---
  async getMIS(ownerId?: string): Promise<any> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);

      const pipeline = await this.getPipelineReport(ownerId);
      const salesAllTime = await this.getSalesReport(ownerId);
      const wonThisMonth = await this.wonInPeriod(startOfMonth, ownerId);
      const wonThisQuarter = await this.wonInPeriod(startOfQuarter, ownerId);

    // Leads by status
    const leadQuery = this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(lead.id)', 'count')
      .groupBy('lead.status');
    if (ownerId) leadQuery.where('lead.ownerId = :ownerId', { ownerId });
    const leadRows = await leadQuery.getRawMany();
    const leadsByStatus = leadRows.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
    const totalLeads = leadsByStatus.reduce((s, l) => s + l.count, 0);
    const convertedLeads =
      leadsByStatus.find((l) => l.status === 'Converted')?.count || 0;

    const result: any = {
      pipeline: {
        byStage: pipeline.byStage,
        totalOpenValue: pipeline.totalOpenValue,
        totalWeightedValue: pipeline.totalWeightedValue,
        openCount: pipeline.openCount,
      },
      sales: {
        wonCount: salesAllTime.wonCount,
        wonValue: salesAllTime.wonValue,
        lostCount: salesAllTime.lostCount,
        lostValue: salesAllTime.lostValue,
        winRate: salesAllTime.winRate,
        avgDealSize: salesAllTime.avgDealSize,
      },
      wonThisMonth,
      wonThisQuarter,
      leads: {
        byStatus: leadsByStatus,
        total: totalLeads,
        conversionRate:
          totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      },
      lossReasons: salesAllTime.lossReasons,
    };

      // Manager/Admin view (no ownerId scope) also gets per-rep performance.
      if (!ownerId) {
        result.salesByOwner = await this.getSalesByOwner();
      }

      return result;
    } catch (error) {
      logger.error('Error in getMIS:', error);
      // Return empty dashboard structure if query fails
      return {
        pipeline: {
          byStage: [],
          totalOpenValue: 0,
          totalWeightedValue: 0,
          openCount: 0,
        },
        sales: {
          wonCount: 0,
          wonValue: 0,
          lostCount: 0,
          lostValue: 0,
          winRate: 0,
          avgDealSize: 0,
        },
        wonThisMonth: { count: 0, value: 0 },
        wonThisQuarter: { count: 0, value: 0 },
        leads: {
          byStatus: [],
          total: 0,
          conversionRate: 0,
        },
        lossReasons: [],
      };
    }
  }

  private async wonInPeriod(
    from: Date,
    ownerId?: string
  ): Promise<{ count: number; value: number }> {
    const q = this.oppRepository
      .createQueryBuilder('opp')
      .select('COUNT(opp.id)', 'count')
      .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
      .where('opp.status = :status', { status: 'Won' })
      .andWhere('opp.closedAt >= :from', { from });
    this.scopeOwner(q, ownerId);
    const r = await q.getRawOne();
    return { count: parseInt(r.count, 10), value: parseFloat(r.value) };
  }
}

export default new ReportService();
