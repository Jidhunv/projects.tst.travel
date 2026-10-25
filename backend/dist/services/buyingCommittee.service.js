"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.committeeCountsByAccount = committeeCountsByAccount;
const database_1 = require("../config/database");
// How many named buying-committee members each of these accounts has (0-8).
// Leads and opportunities are listed against accounts, so the lists use this to
// flag every record whose account has no committee, or only part of one, at any stage.
async function committeeCountsByAccount(accountIds) {
    const unique = [...new Set(accountIds.filter(Boolean))];
    if (unique.length === 0)
        return new Map();
    const rows = await database_1.AppDataSource.query(`SELECT "accountId"::text AS "accountId", COUNT(*)::int AS n
       FROM account_stakeholders
      WHERE "accountId"::text = ANY($1::text[])
        AND name IS NOT NULL AND TRIM(name) <> ''
      GROUP BY "accountId"`, [unique]);
    return new Map(rows.map((r) => [r.accountId, r.n]));
}
//# sourceMappingURL=buyingCommittee.service.js.map