"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeProspectOptions = activeProspectOptions;
exports.isProspectOptionCategory = isProspectOptionCategory;
const database_1 = require("../config/database");
const prospecting_1 = require("../utils/prospecting");
// Active options per category. Read on every questionnaire save and list, so a change
// in the master takes effect at once.
async function activeProspectOptions() {
    const rows = await database_1.AppDataSource.query(`SELECT category, name FROM prospect_options WHERE "isActive" = TRUE ORDER BY name`);
    const sets = { businessType: [], employeeBand: [] };
    for (const r of rows) {
        if (r.category === 'businessType')
            sets.businessType.push(r.name);
        else if (r.category === 'employeeBand')
            sets.employeeBand.push(r.name);
    }
    return sets;
}
function isProspectOptionCategory(v) {
    return prospecting_1.PROSPECT_OPTION_CATEGORIES.includes(v);
}
//# sourceMappingURL=prospectOptions.service.js.map