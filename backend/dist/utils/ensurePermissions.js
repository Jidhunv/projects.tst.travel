"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePermissions = ensurePermissions;
const database_1 = require("../config/database");
const Permission_1 = require("../models/Permission");
const Role_1 = require("../models/Role");
const logger_1 = __importDefault(require("./logger"));
// Permission catalog for the modules added after the initial seed. This runs
// on every startup and is idempotent: it only inserts missing rows and only
// GRANTS missing permissions to the Admin role (never removes anything), so an
// admin's manual role customizations are preserved.
function buildCatalog() {
    const crud = (module, label) => {
        const specs = [];
        for (const action of ['read', 'create', 'update', 'delete']) {
            for (const scope of ['all', 'self']) {
                specs.push({
                    module,
                    action,
                    scope,
                    description: `${action} ${scope === 'self' ? 'own ' : ''}${label}`,
                });
            }
        }
        return specs;
    };
    // "team" scope for hierarchical visibility: a member sees records for their
    // team and all descendant teams. Currently wired for accounts.
    const teamScoped = (module, label) => ['read', 'create', 'update', 'delete'].map((action) => ({
        module,
        action,
        scope: 'team',
        description: `${action} team ${label}`,
    }));
    return [
        ...crud('suppliers', 'suppliers'),
        ...crud('sales_visits', 'sales visits'),
        ...crud('expenses', 'expenses'),
        // Approval is an organisation-level action (managers/admins).
        { module: 'expenses', action: 'approve', scope: 'all', description: 'Approve or reject expenses' },
        ...crud('activities', 'activities and notes'),
        ...crud('invoices', 'invoices'),
        // Master data modules
        ...crud('products', 'products'),
        ...crud('product_categories', 'product categories'),
        ...crud('countries', 'countries'),
        ...crud('designations', 'designations'),
        ...crud('company_types', 'company types'),
        ...crud('prospect_options', 'prospect options'),
        // Downloading report data (CSV), one key per report. Set per role in Role Management.
        ...[
            ['leads', 'Leads report'],
            ['accounts', 'Accounts report'],
            ['opportunities', 'Opportunities report'],
            ['conversion_timeline', 'Conversion timeline report'],
            ['sales_health', 'Sales cycle health report'],
            ['issue_sla', 'Issue SLA report'],
            ['kpi_meeting', 'KPI meeting report'],
        ].map(([key, label]) => ({ module: 'report_exports', action: key, scope: 'all', description: `export ${label}` })),
        // Sales targets, staff KPIs (daily entries, monthly projections, meeting report,
        // audit trail) and KPI configuration. See docs/RBAC.md.
        ...crud('targets', 'sales targets'),
        ...crud('kpis', 'staff KPI entries and projections'),
        ...crud('kpi_setup', 'KPI definitions'),
        // Daily KPI verification and KPI targets. read: see the sheet or the targets; update: enter supervisor
        // values, approve days, and set targets; delete: unlock an approved day. Team scope limits whose
        // people a user sees (their own team), all scope sees every salesperson.
        ...crud('kpi_verification', 'daily KPI verification'),
        ...teamScoped('kpi_verification', 'daily KPI verification'),
        ...crud('kpi_targets', 'KPI targets'),
        ...teamScoped('kpi_targets', 'KPI targets'),
        // Client issue log (issues inside tickets, with stage tracking)
        ...crud('issue_log', 'client issues'),
        // Task Manager: read:all sees every task; read:self sees only the tasks the user assigned or was assigned
        ...crud('tasks', 'tasks'),
        // Task category master (the Task Manager dropdown)
        ...crud('task_categories', 'task categories'),
        // Opportunity stage question master (who may edit questions is decided here in Role Management)
        ...crud('questionnaire', 'opportunity stage questions'),
        // Team scope (hierarchical visibility)
        ...teamScoped('accounts', 'accounts'),
        // Leads and prospects: team scope shows the team's prospects; assigned prospects are visible to the assignee.
        ...teamScoped('leads', 'leads and prospects'),
        // Reports and sales KPIs: team scope shows the people a supervisor supervises.
        ...teamScoped('reports', 'reports'),
        ...teamScoped('sales_visits', 'sales visits and KPIs'),
    ];
}
async function ensurePermissions() {
    try {
        const permRepo = database_1.AppDataSource.getRepository(Permission_1.Permission);
        const roleRepo = database_1.AppDataSource.getRepository(Role_1.Role);
        const catalog = buildCatalog();
        let created = 0;
        for (const spec of catalog) {
            const existing = await permRepo.findOne({
                where: { module: spec.module, action: spec.action, scope: spec.scope },
            });
            if (!existing) {
                await permRepo.save(permRepo.create(spec));
                created++;
            }
        }
        // Grant any permission the Admin role is missing (grant-only).
        const admin = await roleRepo.findOne({ where: { name: 'Admin' }, relations: ['permissions'] });
        if (admin) {
            const allPerms = await permRepo.find();
            const have = new Set(admin.permissions.map((p) => p.id));
            const missing = allPerms.filter((p) => !have.has(p.id));
            if (missing.length) {
                admin.permissions = [...admin.permissions, ...missing];
                await roleRepo.save(admin);
            }
        }
        if (created)
            logger_1.default.info(`ensurePermissions: added ${created} new permission(s)`);
    }
    catch (error) {
        logger_1.default.error('ensurePermissions failed:', error);
    }
}
exports.default = ensurePermissions;
//# sourceMappingURL=ensurePermissions.js.map