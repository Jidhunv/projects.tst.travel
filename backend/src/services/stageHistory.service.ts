import { AppDataSource } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// The stage timeline of an opportunity. One row per entry into a stage; durations are derived.
const DAY = 86_400_000;

export interface StageEntry {
  id: string;
  stage: string;
  enteredAt: Date;
  leftAt: Date | null; // null while the deal is still in this stage
  days: number;        // time in the stage (to leaving it, or to now / the close date)
  actorName: string;
  note: string | null;
  current: boolean;
}

// Pure: turns the ordered entries into the timeline with durations.
export function buildTimeline(rows: { id: string; stage: string; enteredAt: Date; actorName: string; note: string | null }[], now: Date, closed: boolean): StageEntry[] {
  return rows.map((r, i) => {
    const next = rows[i + 1];
    const leftAt = next ? next.enteredAt : null;
    const end = leftAt ?? now;
    return {
      id: r.id,
      stage: r.stage,
      enteredAt: r.enteredAt,
      leftAt,
      days: Math.round(((end.getTime() - r.enteredAt.getTime()) / DAY) * 10) / 10,
      actorName: r.actorName,
      note: r.note,
      current: !next && !closed,
    };
  });
}

class StageHistoryService {
  // Records that the deal entered `toStage`. Called from every place a stage changes.
  async record(oppId: string, toStage: string, actorId: string | null, note: string | null = null, fromStage: string | null = null) {
    await AppDataSource.query(
      `INSERT INTO opportunity_stage_history ("opportunityId", "fromStage", "toStage", "actorId", note)
       VALUES ($1, $2, $3, $4, $5)`,
      [oppId, fromStage, toStage, actorId || null, note]);
  }

  async timeline(oppId: string) {
    const [opp] = await AppDataSource.query('SELECT id, stage, status, "createdAt", "closedAt" FROM opportunities WHERE id = $1', [oppId]);
    if (!opp) throw new AppError(404, 'Opportunity not found');
    const rows: any[] = await AppDataSource.query(
      `SELECT h.id, h."toStage" AS stage, h."createdAt" AS "enteredAt", h.note,
              COALESCE(u."firstName" || ' ' || u."lastName", '') AS "actorName"
       FROM opportunity_stage_history h LEFT JOIN users u ON u.id = h."actorId"
       WHERE h."opportunityId" = $1 ORDER BY h."createdAt" ASC, h.id ASC`, [oppId]);
    const closed = opp.stage === 'Closed-Won' || opp.stage === 'Closed-Lost';
    const now = new Date();
    const entries = buildTimeline(rows.map((r) => ({ ...r, enteredAt: new Date(r.enteredAt) })), now, closed);
    const totalDays = entries.length ? Math.round(((((opp.closedAt && closed) ? new Date(opp.closedAt) : now).getTime()) - new Date(entries[0].enteredAt).getTime()) / DAY * 10) / 10 : 0;
    return { opportunityId: oppId, stage: opp.stage, status: opp.status, createdAt: opp.createdAt, closedAt: opp.closedAt, totalDays, entries };
  }
}

export default new StageHistoryService();
