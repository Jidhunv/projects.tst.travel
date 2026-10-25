"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
// One row per lead status change. Written by the lead service; read by the lifecycle report.
class LeadStatusHistoryService {
    async record(leadId, toStatus, actorId, note = null, fromStatus = null) {
        await database_1.AppDataSource.query(`INSERT INTO prospect_status_history ("prospectId", "fromStatus", "toStatus", "actorId", note) VALUES ($1, $2, $3, $4, $5)`, [leadId, fromStatus, toStatus, actorId || null, note]);
    }
}
exports.default = new LeadStatusHistoryService();
//# sourceMappingURL=prospectStatusHistory.service.js.map