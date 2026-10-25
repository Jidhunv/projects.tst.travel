import { AppDataSource } from '../config/database';

// One row per lead status change. Written by the lead service; read by the lifecycle report.
class LeadStatusHistoryService {
  async record(leadId: string, toStatus: string, actorId: string | null, note: string | null = null, fromStatus: string | null = null) {
    await AppDataSource.query(
      `INSERT INTO prospect_status_history ("prospectId", "fromStatus", "toStatus", "actorId", note) VALUES ($1, $2, $3, $4, $5)`,
      [leadId, fromStatus, toStatus, actorId || null, note]);
  }
}

export default new LeadStatusHistoryService();
