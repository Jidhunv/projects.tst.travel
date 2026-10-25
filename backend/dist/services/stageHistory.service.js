"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTimeline = buildTimeline;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
// The stage timeline of an opportunity. One row per entry into a stage; durations are derived.
const DAY = 86400000;
// Pure: turns the ordered entries into the timeline with durations.
function buildTimeline(rows, now, closed) {
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
    async record(oppId, toStage, actorId, note = null, fromStage = null) {
        await database_1.AppDataSource.query(`INSERT INTO opportunity_stage_history ("opportunityId", "fromStage", "toStage", "actorId", note)
       VALUES ($1, $2, $3, $4, $5)`, [oppId, fromStage, toStage, actorId || null, note]);
    }
    async timeline(oppId) {
        const [opp] = await database_1.AppDataSource.query('SELECT id, stage, status, "createdAt", "closedAt" FROM opportunities WHERE id = $1', [oppId]);
        if (!opp)
            throw new errorHandler_1.AppError(404, 'Opportunity not found');
        const rows = await database_1.AppDataSource.query(`SELECT h.id, h."toStage" AS stage, h."createdAt" AS "enteredAt", h.note,
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
exports.default = new StageHistoryService();
//# sourceMappingURL=stageHistory.service.js.map