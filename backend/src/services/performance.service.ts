import { AppDataSource } from '../config/database';
import { SalesTarget } from '../models/SalesTarget';
import { GLOBAL_BENCHMARKS } from '../utils/salesStrategy';
import { targetProgress, suggestPipeline } from './targets.engine';

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const num = (v: unknown) => Number(v || 0);

// Monday 00:00 UTC of the week containing d (matches Postgres date_trunc('week')).
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

const WINDOWS: { key: string; label: string; days: number }[] = [
  { key: 'week', label: 'Last 7 days', days: 7 },
  { key: 'month', label: 'Last 30 days', days: 30 },
  { key: 'quarter', label: 'Last quarter (90d)', days: 90 },
  { key: 'half', label: 'Last 6 months', days: 182 },
  { key: 'year', label: 'Last year', days: 365 },
];

// Weeks are bucketed in UTC so the buckets line up with the date range the
// UI sends; DATE columns come back from pg as local-midnight Dates.
const dayKey = (d: any) =>
  d instanceof Date
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : String(d).slice(0, 10);

class PerformanceService {
  // Opportunity value created / won / lost for opportunities in [from, to).
  // "Created" uses createdAt; won and lost use the close time.
  private async sums(from: Date, to: Date, ownerId?: string) {
    const own = ownerId ? 'AND "ownerId" = $3' : '';
    const args: any[] = [from, to];
    if (ownerId) args.push(ownerId);
    const q = (where: string, col: string) =>
      AppDataSource.query(
        `SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM opportunities WHERE ${where} AND "${col}" >= $1 AND "${col}" < $2 ${own}`,
        args
      );
    const [[c], [w], [l]] = await Promise.all([
      q('TRUE', 'createdAt'),
      q("status = 'Won'", 'closedAt'),
      q("status = 'Lost'", 'closedAt'),
    ]);
    return {
      createdValue: num(c.v), createdCount: num(c.n),
      wonValue: num(w.v), wonCount: num(w.n),
      lostValue: num(l.v), lostCount: num(l.n),
    };
  }

  async getOverview(ownerId?: string, now: Date = new Date()) {
    const thisWeek = weekStart(now);
    const first = new Date(thisWeek.getTime() - 51 * 7 * DAY);
    const end = new Date(thisWeek.getTime() + 7 * DAY);
    const own = ownerId ? 'AND "ownerId" = $3' : '';
    const args: any[] = [first, end];
    if (ownerId) args.push(ownerId);

    const [created, won] = await Promise.all([
      AppDataSource.query(
        `SELECT date_trunc('week', "createdAt")::date wk, SUM(amount) v, COUNT(*) n FROM opportunities
         WHERE "createdAt" >= $1 AND "createdAt" < $2 ${own} GROUP BY 1`, args),
      AppDataSource.query(
        `SELECT date_trunc('week', "closedAt")::date wk, SUM(amount) v, COUNT(*) n FROM opportunities
         WHERE status = 'Won' AND "closedAt" >= $1 AND "closedAt" < $2 ${own} GROUP BY 1`, args),
    ]);
    const cMap = new Map<string, any>(created.map((r: any) => [dayKey(r.wk), r]));
    const wMap = new Map<string, any>(won.map((r: any) => [dayKey(r.wk), r]));

    const weekly = Array.from({ length: 52 }, (_, i) => {
      const k = iso(new Date(first.getTime() + i * 7 * DAY));
      const c = cMap.get(k);
      const w = wMap.get(k);
      return { weekStart: k, createdValue: num(c?.v), createdCount: num(c?.n), wonValue: num(w?.v), wonCount: num(w?.n) };
    });

    const periods = [];
    for (const w of WINDOWS) {
      const to = new Date(now.getTime() + 1000);
      const from = new Date(now.getTime() - w.days * DAY);
      const prevFrom = new Date(from.getTime() - w.days * DAY);
      const [cur, prev] = await Promise.all([this.sums(from, to, ownerId), this.sums(prevFrom, from, ownerId)]);
      const closed = cur.wonValue + cur.lostValue;
      periods.push({
        ...w,
        ...cur,
        winRate: closed > 0 ? Math.round((cur.wonValue / closed) * 1000) / 10 : null,
        // Of the opportunity value created in the window, how much was won in it.
        wonVsCreated: cur.createdValue > 0 ? Math.round((cur.wonValue / cur.createdValue) * 1000) / 10 : null,
        previous: prev,
      });
    }

    const [open] = await AppDataSource.query(
      `SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM opportunities WHERE status = 'Open' ${ownerId ? 'AND "ownerId" = $1' : ''}`,
      ownerId ? [ownerId] : []
    );
    return {
      generatedAt: now.toISOString(),
      weekly,
      periods,
      openPipeline: { value: num(open.v), count: num(open.n) },
      ownWinRate: await this.ownWinRate(ownerId, now),
      benchmarks: GLOBAL_BENCHMARKS,
    };
  }

  // Trailing-year win rate by value; null when there are too few closed deals to trust.
  async ownWinRate(ownerId: string | undefined, now: Date): Promise<number | null> {
    const r = await this.sums(new Date(now.getTime() - 365 * DAY), new Date(now.getTime() + 1000), ownerId);
    const closedValue = r.wonValue + r.lostValue;
    if (r.wonCount + r.lostCount < GLOBAL_BENCHMARKS.minClosedDealsForOwnWinRate || closedValue <= 0) return null;
    return r.wonValue / closedValue;
  }

  private async achieved(t: { metric: string; ownerId: string | null; startDate: string; endDate: string }) {
    const from = new Date(`${t.startDate}T00:00:00Z`);
    const to = new Date(new Date(`${t.endDate}T00:00:00Z`).getTime() + DAY);
    const s = await this.sums(from, to, t.ownerId || undefined);
    return t.metric === 'opportunity_value' ? s.createdValue : s.wonValue;
  }

  // `visibleOwnerId`: restricted users only see their own targets.
  async listTargets(visibleOwnerId: string | undefined, now: Date = new Date()) {
    const qb = AppDataSource.getRepository(SalesTarget).createQueryBuilder('t').orderBy('t.startDate', 'DESC');
    if (visibleOwnerId) qb.where('t.ownerId = :o', { o: visibleOwnerId });
    const targets = await qb.getMany();
    const users: any[] = await AppDataSource.query(`SELECT id, "firstName" || ' ' || "lastName" AS name FROM users`);
    const names = new Map<string, string>(users.map((u) => [u.id, u.name]));

    return Promise.all(
      targets.map(async (t) => {
        const progress = targetProgress(await this.achieved(t), num(t.targetValue), t.startDate, t.endDate, now);
        const ownerArg = t.ownerId || undefined;
        const [open] = await AppDataSource.query(
          `SELECT COALESCE(SUM(amount),0) v FROM opportunities WHERE status = 'Open'
           AND "forecastedCloseDate" >= $1 AND "forecastedCloseDate" < $2 ${ownerArg ? 'AND "ownerId" = $3' : ''}`,
          [new Date(`${t.startDate}T00:00:00Z`), new Date(new Date(`${t.endDate}T00:00:00Z`).getTime() + DAY), ...(ownerArg ? [ownerArg] : [])]
        );
        // Pipeline sizing is about winning revenue, so it only applies to won-value targets.
        const suggestion =
          t.metric === 'won_value' && progress.remaining > 0
            ? suggestPipeline(progress.remaining, num(open.v), await this.ownWinRate(ownerArg, now))
            : null;
        return {
          id: t.id, name: t.name, metric: t.metric, ownerId: t.ownerId,
          ownerName: t.ownerId ? names.get(t.ownerId) || 'Unknown' : 'Whole team',
          startDate: t.startDate, endDate: t.endDate, targetValue: num(t.targetValue),
          progress, suggestion,
        };
      })
    );
  }
}

export default new PerformanceService();
