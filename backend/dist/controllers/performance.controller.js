"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceController = void 0;
const database_1 = require("../config/database");
const SalesTarget_1 = require("../models/SalesTarget");
const KpiDefinition_1 = require("../models/KpiDefinition");
const KpiEntry_1 = require("../models/KpiEntry");
const KpiProjection_1 = require("../models/KpiProjection");
const KpiMaster_1 = require("../models/KpiMaster");
const Account_1 = require("../models/Account");
const performance_service_1 = __importDefault(require("../services/performance.service"));
const kpi_service_1 = __importDefault(require("../services/kpi.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const kpiReport_1 = require("../utils/kpiReport");
const scopeOf = (req, module, action) => {
    const s = (0, auth_1.getScope)(req.user, module, action);
    return s === 'all' ? 'all' : s ? 'self' : null;
};
const need = (req, module, action, what) => {
    const s = scopeOf(req, module, action);
    if (!s)
        throw new errorHandler_1.AppError(403, `You do not have permission to ${what}`);
    return s;
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !isNaN(Date.parse(`${v}T00:00:00Z`));
const todayStr = () => new Date().toISOString().slice(0, 10);
const str = (v) => (typeof v === 'string' && v !== '' ? v : undefined);
const DAY = 86400000;
const METRICS = ['won_value', 'opportunity_value'];
const KPI_TYPES = ['number', 'yes_no', 'text', 'choice'];
const FREQUENCIES = ['daily', 'weekly', 'monthly'];
// Types a custom (per-person) KPI can take. Yes/no is the boolean answer.
const CUSTOM_KPI_TYPES = ['number', 'yes_no', 'text'];
const MAX_REPORT_DAYS = 92;
// Validates an answer against its KPI's type and returns the columns to store.
function parseAnswer(def, body, options = null) {
    let numberValue = null;
    let textValue = null;
    if (def.type === 'number') {
        numberValue = Number(body.numberValue);
        if (body.numberValue === '' || body.numberValue === null || body.numberValue === undefined || !isFinite(numberValue))
            throw new errorHandler_1.AppError(400, 'Enter a number');
    }
    else if (def.type === 'yes_no') {
        if (![0, 1, '0', '1'].includes(body.numberValue))
            throw new errorHandler_1.AppError(400, 'Answer yes or no');
        numberValue = Number(body.numberValue);
    }
    else if (def.type === 'choice') {
        textValue = typeof body.textValue === 'string' ? body.textValue.trim() : '';
        if (!textValue)
            throw new errorHandler_1.AppError(400, 'Pick an answer');
        if (!options || !options.includes(textValue))
            throw new errorHandler_1.AppError(400, 'That is not one of the allowed answers for this question');
    }
    else {
        textValue = typeof body.textValue === 'string' ? body.textValue.trim() : '';
        if (!textValue)
            throw new errorHandler_1.AppError(400, 'Enter an answer');
    }
    if (def.type !== 'text' && def.type !== 'choice' && typeof body.textValue === 'string' && body.textValue.trim())
        textValue = body.textValue.trim().slice(0, 2000); // optional note
    return { numberValue, textValue };
}
const entrySnapshot = (e, def) => ({
    kpiId: e.kpiId, kpi: def?.name, entryDate: e.entryDate && String(e.entryDate).slice(0, 10),
    numberValue: e.numberValue === null || e.numberValue === undefined ? null : Number(e.numberValue),
    textValue: e.textValue ?? null, accountId: e.accountId ?? null,
});
class PerformanceController {
    // ---- Statistics (reports module) ----------------------------------------
    async overview(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'reports', 'read'))
                throw new errorHandler_1.AppError(403, 'You do not have permission to view reports');
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const data = await performance_service_1.default.getOverview(scope || str(req.query.ownerId));
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- Targets (targets module) -------------------------------------------
    async listTargets(req, res, next) {
        try {
            const scope = scopeOf(req, 'targets', 'read');
            // No targets privilege simply means an empty list, so the Performance page still loads.
            const data = scope ? await performance_service_1.default.listTargets(scope === 'all' ? undefined : req.user.id) : [];
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    parseTarget(body, partial) {
        const d = (0, pick_1.default)(body || {}, ['name', 'metric', 'ownerId', 'startDate', 'endDate', 'targetValue']);
        const bad = (m) => { throw new errorHandler_1.AppError(400, m); };
        if (!partial || 'name' in d) {
            if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 255)
                bad('Name is required (max 255 characters)');
            d.name = d.name.trim();
        }
        if (!partial || 'metric' in d) {
            if (!METRICS.includes(d.metric))
                bad(`Metric must be one of: ${METRICS.join(', ')}`);
        }
        if (!partial || 'startDate' in d) {
            if (!isDate(d.startDate))
                bad('Start date must be YYYY-MM-DD');
        }
        if (!partial || 'endDate' in d) {
            if (!isDate(d.endDate))
                bad('End date must be YYYY-MM-DD');
        }
        if (!partial || 'targetValue' in d) {
            d.targetValue = Number(d.targetValue);
            if (!isFinite(d.targetValue) || d.targetValue <= 0)
                bad('Target value must be a positive number');
        }
        if ('ownerId' in d && !d.ownerId)
            d.ownerId = null; // blank = whole team
        return d;
    }
    async createTarget(req, res, next) {
        try {
            const scope = need(req, 'targets', 'create', 'set targets');
            const d = this.parseTarget(req.body, false);
            if (d.endDate < d.startDate)
                throw new errorHandler_1.AppError(400, 'End date cannot be before the start date');
            // A "self" privilege can only set targets for oneself.
            if (scope === 'self')
                d.ownerId = req.user.id;
            const repo = database_1.AppDataSource.getRepository(SalesTarget_1.SalesTarget);
            const saved = await repo.save(repo.create({ ...d, ownerId: d.ownerId || null, createdById: req.user.id }));
            res.status(201).json({ success: true, data: saved });
        }
        catch (e) {
            next(e);
        }
    }
    async updateTarget(req, res, next) {
        try {
            const scope = need(req, 'targets', 'update', 'change targets');
            const repo = database_1.AppDataSource.getRepository(SalesTarget_1.SalesTarget);
            const existing = await repo.findOne({ where: { id: req.params.id } });
            if (!existing || (scope === 'self' && existing.ownerId !== req.user.id))
                throw new errorHandler_1.AppError(404, 'Target not found');
            const d = this.parseTarget(req.body, true);
            if (scope === 'self' && 'ownerId' in d)
                d.ownerId = req.user.id;
            const start = d.startDate ?? existing.startDate;
            const end = d.endDate ?? existing.endDate;
            if (String(end) < String(start))
                throw new errorHandler_1.AppError(400, 'End date cannot be before the start date');
            await repo.update(existing.id, d); // column-level write; see CLAUDE.md
            res.json({ success: true, data: await repo.findOne({ where: { id: existing.id } }) });
        }
        catch (e) {
            next(e);
        }
    }
    async deleteTarget(req, res, next) {
        try {
            const scope = need(req, 'targets', 'delete', 'delete targets');
            const repo = database_1.AppDataSource.getRepository(SalesTarget_1.SalesTarget);
            const existing = await repo.findOne({ where: { id: req.params.id } });
            if (!existing || (scope === 'self' && existing.ownerId !== req.user.id))
                throw new errorHandler_1.AppError(404, 'Target not found');
            await repo.delete(existing.id);
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- KPI definitions (kpi_setup configures; kpis users read their own) ---
    async listDefinitions(req, res, next) {
        try {
            const qb = database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition).createQueryBuilder('d').orderBy('d.createdAt', 'DESC');
            if (scopeOf(req, 'kpi_setup', 'read')) {
                const uid = str(req.query.userId);
                if (uid)
                    qb.where('d.userId = :u', { u: uid });
            }
            else {
                need(req, 'kpis', 'read', 'view KPIs');
                qb.where('d.userId = :u AND d.isActive = TRUE AND d.startDate <= :today', { u: req.user.id, today: todayStr() })
                    .andWhere(`NOT EXISTS (SELECT 1 FROM kpi_master mm WHERE mm.id = d."masterId" AND mm."isActive" = FALSE)`);
            }
            const defs = await qb.getMany();
            const mids = [...new Set(defs.map((d) => d.masterId).filter(Boolean))];
            const masters = mids.length ? await database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster).createQueryBuilder('m').where('m.id = ANY(:mids)', { mids }).getMany() : [];
            const opts = new Map(masters.map((m) => [m.id, m.answerOptions]));
            res.json({ success: true, data: defs.map((d) => ({ ...d, answerOptions: d.masterId ? opts.get(d.masterId) ?? null : null })) });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- KPI master (the approved question list; kpi_setup privilege) --------
    async listMaster(req, res, next) {
        try {
            need(req, 'kpi_setup', 'read', 'view the KPI master');
            const rows = await database_1.AppDataSource.query(`SELECT m.*, (SELECT COUNT(*) FROM kpi_definitions d WHERE d."masterId" = m.id) AS "assignedCount"
         FROM kpi_master m ORDER BY m."isActive" DESC, LOWER(m.name)`);
            res.json({ success: true, data: rows.map((r) => ({ ...r, assignedCount: Number(r.assignedCount) })) });
        }
        catch (e) {
            next(e);
        }
    }
    parseMaster(body, partial) {
        const d = (0, pick_1.default)(body || {}, ['name', 'description', 'type', 'unit', 'defaultFrequency', 'defaultTarget', 'isActive', 'answerOptions']);
        const bad = (m) => { throw new errorHandler_1.AppError(400, m); };
        if (!partial || 'name' in d) {
            if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 255)
                bad('The question is required (max 255 characters)');
            d.name = d.name.trim();
        }
        if (!partial || 'type' in d) {
            if (!KPI_TYPES.includes(d.type))
                bad(`Type must be one of: ${KPI_TYPES.join(', ')}`);
        }
        if (!partial || 'defaultFrequency' in d) {
            if (!FREQUENCIES.includes(d.defaultFrequency))
                bad(`Frequency must be one of: ${FREQUENCIES.join(', ')}`);
        }
        if ('defaultTarget' in d) {
            if (d.defaultTarget === '' || d.defaultTarget === null)
                d.defaultTarget = null;
            else {
                d.defaultTarget = Number(d.defaultTarget);
                if (!isFinite(d.defaultTarget) || d.defaultTarget < 0)
                    bad('Target must be a non-negative number');
            }
        }
        if ('unit' in d && d.unit !== null && String(d.unit).length > 32)
            bad('Unit is too long (max 32 characters)');
        if (d.unit === '')
            d.unit = null;
        if (d.description === '')
            d.description = null;
        if ('answerOptions' in d && d.answerOptions !== null) {
            if (!Array.isArray(d.answerOptions))
                bad('Answer choices must be a list');
            const seen = new Set();
            const cleaned = [];
            for (const o of d.answerOptions) {
                const t = typeof o === 'string' ? o.trim() : '';
                if (!t)
                    continue;
                if (t.length > 100)
                    bad('Each answer choice must be 100 characters or fewer');
                if (seen.has(t.toLowerCase()))
                    continue;
                seen.add(t.toLowerCase());
                cleaned.push(t);
            }
            if (cleaned.length > 20)
                bad('A question can have at most 20 answer choices');
            d.answerOptions = cleaned;
        }
        return d;
    }
    async createMaster(req, res, next) {
        try {
            need(req, 'kpi_setup', 'create', 'add KPI questions');
            const d = this.parseMaster(req.body, false);
            if (d.type === 'choice') {
                if (!d.answerOptions || d.answerOptions.length < 2)
                    throw new errorHandler_1.AppError(400, 'Add at least two answer choices');
            }
            else
                d.answerOptions = null;
            const repo = database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster);
            if ((await database_1.AppDataSource.query('SELECT 1 FROM kpi_master WHERE LOWER(name) = LOWER($1)', [d.name])).length)
                throw new errorHandler_1.AppError(409, `"${d.name}" already exists in the KPI master`);
            res.status(201).json({ success: true, data: await repo.save(repo.create(d)) });
        }
        catch (e) {
            next(e);
        }
    }
    async updateMaster(req, res, next) {
        try {
            need(req, 'kpi_setup', 'update', 'edit KPI questions');
            const repo = database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster);
            const existing = await repo.findOne({ where: { id: req.params.id } });
            if (!existing)
                throw new errorHandler_1.AppError(404, 'KPI question not found');
            const d = this.parseMaster(req.body, true);
            const inUse = Number((await database_1.AppDataSource.query('SELECT COUNT(*) n FROM kpi_definitions WHERE "masterId" = $1', [existing.id]))[0].n);
            // Changing the answer type would invalidate answers already recorded.
            if ('type' in d && d.type !== existing.type && inUse > 0)
                throw new errorHandler_1.AppError(409, `This question is assigned to ${inUse} staff; its answer type can no longer change. Add a new question instead.`);
            if ('name' in d && d.name.toLowerCase() !== existing.name.toLowerCase() && (await database_1.AppDataSource.query('SELECT 1 FROM kpi_master WHERE LOWER(name) = LOWER($1) AND id <> $2', [d.name, existing.id])).length) {
                throw new errorHandler_1.AppError(409, `"${d.name}" already exists in the KPI master`);
            }
            const finalType = d.type ?? existing.type;
            if (finalType === 'choice') {
                const opts = 'answerOptions' in d ? d.answerOptions : existing.answerOptions;
                if (!opts || opts.length < 2)
                    throw new errorHandler_1.AppError(400, 'Add at least two answer choices');
            }
            else if ('type' in d)
                d.answerOptions = null;
            await repo.update(existing.id, d);
            // Wording, guidance and unit flow through to every assignment so staff always see the current text.
            const sync = {};
            for (const k of ['name', 'description', 'unit'])
                if (k in d)
                    sync[k] = d[k];
            if (Object.keys(sync).length)
                await database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition).update({ masterId: existing.id }, sync);
            res.json({ success: true, data: await repo.findOne({ where: { id: existing.id } }) });
        }
        catch (e) {
            next(e);
        }
    }
    async deleteMaster(req, res, next) {
        try {
            need(req, 'kpi_setup', 'delete', 'delete KPI questions');
            const inUse = Number((await database_1.AppDataSource.query('SELECT COUNT(*) n FROM kpi_definitions WHERE "masterId" = $1', [req.params.id]))[0].n);
            if (inUse > 0)
                throw new errorHandler_1.AppError(409, `This question is assigned to ${inUse} staff. Set it inactive instead, or delete those assignments first.`);
            const r = await database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster).delete(req.params.id);
            if (!r.affected)
                throw new errorHandler_1.AppError(404, 'KPI question not found');
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- KPI assignments (a master question given to a staff member) ---------
    parseAssignment(body, partial) {
        const d = (0, pick_1.default)(body || {}, ['masterId', 'userId', 'frequency', 'targetValue', 'isActive', 'startDate', 'weightage', 'name', 'type', 'unit']);
        const bad = (m) => { throw new errorHandler_1.AppError(400, m); };
        // A KPI comes from the master, or is custom to one person (then it needs a name and a type).
        if (!partial || 'masterId' in d) {
            if (!d.masterId && typeof d.name !== 'string')
                bad('Pick a question from the KPI master, or enter a custom KPI name');
        }
        if ('name' in d && d.name !== null) {
            if (typeof d.name !== 'string' || !d.name.trim())
                bad('KPI name cannot be empty');
            d.name = d.name.trim();
            if (d.name.length > 200)
                bad('KPI name must be 200 characters or fewer');
        }
        if ('type' in d && !CUSTOM_KPI_TYPES.includes(d.type))
            bad(`KPI type must be one of: ${CUSTOM_KPI_TYPES.join(', ')}`);
        if ('unit' in d && d.unit !== null)
            d.unit = typeof d.unit === 'string' && d.unit.trim() ? d.unit.trim() : null;
        if ('weightage' in d) {
            if (d.weightage === '' || d.weightage === null)
                d.weightage = null;
            else {
                d.weightage = Number(d.weightage);
                if (!isFinite(d.weightage) || d.weightage < 0 || d.weightage > 100)
                    bad('Weightage must be a percentage from 0 to 100');
            }
        }
        if (!partial || 'userId' in d) {
            if (typeof d.userId !== 'string' || !d.userId)
                bad('Pick the staff member this KPI is for');
        }
        if ('startDate' in d && !isDate(d.startDate))
            bad('Start date must be YYYY-MM-DD');
        if ('frequency' in d && !FREQUENCIES.includes(d.frequency))
            bad(`Frequency must be one of: ${FREQUENCIES.join(', ')}`);
        if ('targetValue' in d) {
            if (d.targetValue === '' || d.targetValue === null)
                d.targetValue = null;
            else {
                d.targetValue = Number(d.targetValue);
                if (!isFinite(d.targetValue) || d.targetValue < 0)
                    bad('Target must be a non-negative number');
            }
        }
        return d;
    }
    async createDefinition(req, res, next) {
        try {
            need(req, 'kpi_setup', 'create', 'configure KPIs');
            const d = this.parseAssignment(req.body, false);
            if ((await database_1.AppDataSource.query('SELECT id FROM users WHERE id = $1', [d.userId])).length === 0)
                throw new errorHandler_1.AppError(400, 'That staff member does not exist');
            const repo = database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition);
            const common = {
                userId: d.userId,
                weightage: 'weightage' in d ? d.weightage : null,
                isActive: d.isActive ?? true, startDate: d.startDate ?? todayStr(), createdById: req.user.id,
            };
            let saved;
            if (d.masterId) {
                const master = await database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster).findOne({ where: { id: d.masterId } });
                if (!master)
                    throw new errorHandler_1.AppError(400, 'That question is not in the KPI master');
                if (!master.isActive)
                    throw new errorHandler_1.AppError(400, 'That question is inactive in the KPI master');
                if (await repo.findOne({ where: { userId: d.userId, masterId: master.id } }))
                    throw new errorHandler_1.AppError(409, 'That staff member already has this KPI');
                saved = await repo.save(repo.create({
                    ...common,
                    masterId: master.id, name: master.name, description: master.description, type: master.type, unit: master.unit,
                    frequency: d.frequency ?? master.defaultFrequency,
                    targetValue: 'targetValue' in d ? d.targetValue : master.defaultTarget,
                }));
            }
            else {
                // Custom KPI: this person only, with its own name, answer type and unit. Daily by default.
                if (!d.type)
                    throw new errorHandler_1.AppError(400, 'Choose the answer type for this KPI: number, yes/no or text');
                if (await repo.findOne({ where: { userId: d.userId, name: d.name } }))
                    throw new errorHandler_1.AppError(409, 'That staff member already has a KPI with this name');
                saved = await repo.save(repo.create({
                    ...common,
                    masterId: null, name: d.name, description: null, type: d.type, unit: d.unit ?? null,
                    frequency: d.frequency ?? 'daily',
                    targetValue: 'targetValue' in d ? d.targetValue : null,
                }));
            }
            res.status(201).json({ success: true, data: saved });
        }
        catch (e) {
            next(e);
        }
    }
    async updateDefinition(req, res, next) {
        try {
            need(req, 'kpi_setup', 'update', 'configure KPIs');
            const repo = database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition);
            if (!(await repo.findOne({ where: { id: req.params.id } })))
                throw new errorHandler_1.AppError(404, 'KPI not found');
            // A master question is owned by the master; only the per-person settings change here.
            // A custom KPI (no master) can also change its name, type and unit.
            const existing = await repo.findOne({ where: { id: req.params.id } });
            const fields = ['frequency', 'targetValue', 'isActive', 'startDate', 'weightage'];
            if (!existing.masterId)
                fields.push('name', 'type', 'unit');
            const d = (0, pick_1.default)(this.parseAssignment(req.body, true), fields);
            await repo.update(req.params.id, d);
            res.json({ success: true, data: await repo.findOne({ where: { id: req.params.id } }) });
        }
        catch (e) {
            next(e);
        }
    }
    async deleteDefinition(req, res, next) {
        try {
            need(req, 'kpi_setup', 'delete', 'delete KPIs');
            const r = await database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition).delete(req.params.id); // entries cascade (their audit history is kept)
            if (!r.affected)
                throw new errorHandler_1.AppError(404, 'KPI not found');
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
    // Copies one staff member's active KPIs to others (e.g. a new hire), skipping names they already have.
    async copyDefinitions(req, res, next) {
        try {
            need(req, 'kpi_setup', 'create', 'configure KPIs');
            const { fromUserId, toUserIds } = req.body || {};
            if (typeof fromUserId !== 'string' || !fromUserId)
                throw new errorHandler_1.AppError(400, 'Pick the staff member to copy from');
            if (!Array.isArray(toUserIds) || toUserIds.length === 0 || toUserIds.length > 200 || toUserIds.some((i) => typeof i !== 'string')) {
                throw new errorHandler_1.AppError(400, 'Pick one or more staff members to copy to');
            }
            const repo = database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition);
            const source = await repo.find({ where: { userId: fromUserId, isActive: true } });
            if (source.length === 0)
                throw new errorHandler_1.AppError(400, 'That staff member has no active KPIs to copy');
            const targets = (await database_1.AppDataSource.query('SELECT id FROM users WHERE id = ANY($1::uuid[])', [toUserIds.filter((i) => i !== fromUserId)])).map((u) => u.id);
            let created = 0, skipped = 0;
            for (const uid of targets) {
                const have = new Set((await repo.find({ where: { userId: uid }, select: ['name'] })).map((d) => d.name));
                for (const d of source) {
                    if (have.has(d.name)) {
                        skipped++;
                        continue;
                    }
                    await repo.save(repo.create({ masterId: d.masterId, name: d.name, description: d.description, type: d.type, unit: d.unit, frequency: d.frequency, targetValue: d.targetValue, isActive: true, startDate: todayStr(), userId: uid, createdById: req.user.id }));
                    created++;
                }
            }
            res.json({ success: true, data: { staff: targets.length, created, skipped } });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- KPI entries (kpis module) -------------------------------------------
    async listEntries(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'read', 'view KPI entries');
            const kpiId = str(req.query.kpiId), from = str(req.query.from), to = str(req.query.to), userId = str(req.query.userId);
            const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
            const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 25, 1), 200);
            const qb = database_1.AppDataSource.getRepository(KpiEntry_1.KpiEntry).createQueryBuilder('e')
                .leftJoinAndSelect('e.kpi', 'kpi')
                .orderBy('e.entryDate', 'DESC').addOrderBy('e.createdAt', 'DESC');
            if (scope === 'self')
                qb.andWhere('e.userId = :me', { me: req.user.id });
            else if (userId)
                qb.andWhere('e.userId = :uid', { uid: userId });
            if (kpiId)
                qb.andWhere('e.kpiId = :k', { k: kpiId });
            if (from && isDate(from))
                qb.andWhere('e.entryDate >= :from', { from });
            if (to && isDate(to))
                qb.andWhere('e.entryDate <= :to', { to });
            const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
            const ids = [...new Set(rows.map((r) => r.accountId).filter(Boolean))];
            const accounts = ids.length ? await database_1.AppDataSource.getRepository(Account_1.Account).createQueryBuilder('a').select(['a.id', 'a.name', 'a.prospectedAt']).where('a.id = ANY(:ids)', { ids }).getMany() : [];
            const nameOf = new Map(accounts.map((a) => [a.id, a.name]));
            // When the linked prospect was completed (UTC), so KPI activity can be read against the prospect's timeline.
            const prospectedOf = new Map(accounts.map((a) => [a.id, a.prospectedAt]));
            const userRows = await database_1.AppDataSource.query(`SELECT id, "firstName" || ' ' || "lastName" AS name FROM users`);
            const userName = new Map(userRows.map((u) => [u.id, u.name]));
            const data = rows.map((r) => ({
                ...r,
                accountName: r.accountId ? nameOf.get(r.accountId) || null : null,
                accountProspectedAt: r.accountId ? prospectedOf.get(r.accountId) ?? null : null,
                userName: userName.get(r.userId) || '',
            }));
            res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
        }
        catch (e) {
            next(e);
        }
    }
    async loadDefForWrite(req, scope, kpiId) {
        const def = typeof kpiId === 'string' ? await database_1.AppDataSource.getRepository(KpiDefinition_1.KpiDefinition).findOne({ where: { id: kpiId } }) : null;
        // Someone else's KPI looks the same as a missing one unless the privilege reaches all staff.
        if (!def || !def.isActive || (scope === 'self' && def.userId !== req.user.id))
            throw new errorHandler_1.AppError(404, 'KPI not found');
        if (def.masterId && !(await database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster).findOne({ where: { id: def.masterId, isActive: true } })))
            throw new errorHandler_1.AppError(400, 'This KPI question has been made inactive by an administrator');
        return def;
    }
    // The allowed answers for a 'choice' KPI come from its master question.
    async optionsFor(def) {
        if (def.type !== 'choice' || !def.masterId)
            return null;
        return (await database_1.AppDataSource.getRepository(KpiMaster_1.KpiMaster).findOne({ where: { id: def.masterId } }))?.answerOptions ?? null;
    }
    async checkAccount(accountId) {
        if (!accountId)
            return null;
        if (!(await database_1.AppDataSource.getRepository(Account_1.Account).findOne({ where: { id: accountId }, select: ['id'] })))
            throw new errorHandler_1.AppError(400, 'That prospect does not exist');
        return accountId;
    }
    async createEntry(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'create', 'record KPI entries');
            const body = (0, pick_1.default)(req.body || {}, ['kpiId', 'entryDate', 'numberValue', 'textValue', 'accountId']);
            const def = await this.loadDefForWrite(req, scope, body.kpiId);
            const entryDate = body.entryDate || todayStr();
            if (!isDate(entryDate))
                throw new errorHandler_1.AppError(400, 'Date must be YYYY-MM-DD');
            if (entryDate > todayStr())
                throw new errorHandler_1.AppError(400, 'You cannot report a KPI for a future date');
            if (entryDate < String(def.startDate).slice(0, 10))
                throw new errorHandler_1.AppError(400, `This KPI starts on ${String(def.startDate).slice(0, 10)}; earlier dates cannot be reported`);
            const { numberValue, textValue } = parseAnswer(def, body, await this.optionsFor(def));
            const accountId = await this.checkAccount(body.accountId);
            const repo = database_1.AppDataSource.getRepository(KpiEntry_1.KpiEntry);
            // The figure belongs to the KPI's owner, even when someone with wider access records it.
            const saved = await repo.save(repo.create({ kpiId: def.id, userId: def.userId, entryDate, numberValue, textValue, accountId }));
            await kpi_service_1.default.audit('kpi_entry', saved.id, def.userId, req.user.id, 'created', null, entrySnapshot(saved, def));
            res.status(201).json({ success: true, data: saved });
        }
        catch (e) {
            next(e);
        }
    }
    async updateEntry(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'update', 'edit KPI entries');
            const repo = database_1.AppDataSource.getRepository(KpiEntry_1.KpiEntry);
            const existing = await repo.findOne({ where: { id: req.params.id } });
            if (!existing || (scope === 'self' && existing.userId !== req.user.id))
                throw new errorHandler_1.AppError(404, 'Entry not found');
            const def = await this.loadDefForWrite(req, scope, existing.kpiId);
            const body = (0, pick_1.default)(req.body || {}, ['entryDate', 'numberValue', 'textValue', 'accountId']);
            const entryDate = body.entryDate ?? String(existing.entryDate).slice(0, 10);
            if (!isDate(entryDate))
                throw new errorHandler_1.AppError(400, 'Date must be YYYY-MM-DD');
            if (entryDate > todayStr())
                throw new errorHandler_1.AppError(400, 'You cannot report a KPI for a future date');
            if (entryDate < String(def.startDate).slice(0, 10))
                throw new errorHandler_1.AppError(400, `This KPI starts on ${String(def.startDate).slice(0, 10)}; earlier dates cannot be reported`);
            const merged = { numberValue: 'numberValue' in body ? body.numberValue : existing.numberValue, textValue: 'textValue' in body ? body.textValue : existing.textValue };
            const { numberValue, textValue } = parseAnswer(def, merged, await this.optionsFor(def));
            const accountId = 'accountId' in body ? await this.checkAccount(body.accountId) : existing.accountId;
            const before = entrySnapshot(existing, def);
            await repo.update(existing.id, { entryDate, numberValue, textValue, accountId });
            const after = entrySnapshot({ ...existing, entryDate, numberValue, textValue, accountId }, def);
            if (JSON.stringify(before) !== JSON.stringify(after)) {
                await kpi_service_1.default.audit('kpi_entry', existing.id, existing.userId, req.user.id, 'updated', before, after);
            }
            res.json({ success: true, data: await repo.findOne({ where: { id: existing.id } }) });
        }
        catch (e) {
            next(e);
        }
    }
    async deleteEntry(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'delete', 'delete KPI entries');
            const repo = database_1.AppDataSource.getRepository(KpiEntry_1.KpiEntry);
            const e = await repo.findOne({ where: { id: req.params.id }, relations: ['kpi'] });
            if (!e || (scope === 'self' && e.userId !== req.user.id))
                throw new errorHandler_1.AppError(404, 'Entry not found');
            await kpi_service_1.default.audit('kpi_entry', e.id, e.userId, req.user.id, 'deleted', entrySnapshot(e, e.kpi), null);
            await repo.delete(e.id);
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
    async kpiSummary(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'read', 'view KPIs');
            const to = isDate(req.query.to) ? req.query.to : todayStr();
            const from = isDate(req.query.from) ? req.query.from : new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY).toISOString().slice(0, 10);
            if (from > to)
                throw new errorHandler_1.AppError(400, 'From date cannot be after the To date');
            const only = scope === 'self' ? req.user.id : str(req.query.userId);
            const rows = await kpi_service_1.default.summary(from, to, only);
            // Each person's weighted score, from the KPIs that carry a weight.
            const byUser = new Map();
            for (const r of rows) {
                if (!byUser.has(r.userId))
                    byUser.set(r.userId, { userId: r.userId, userName: r.userName, rows: [] });
                byUser.get(r.userId).rows.push(r);
            }
            const users = [...byUser.values()].map((u) => ({
                userId: u.userId, userName: u.userName, ...(0, kpiReport_1.weightedScore)(u.rows),
            }));
            res.json({ success: true, data: { from, to, rows, users } });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- Monthly projections (kpis module) ----------------------------------
    async listProjections(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'read', 'view projections');
            const userId = scope === 'self' ? req.user.id : str(req.query.userId) || req.user.id;
            // Default window: last month through the next 5.
            const now = new Date();
            const months = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1 + i, 1)).toISOString().slice(0, 10));
            const rows = await kpi_service_1.default.projectionsVsActual(months, [userId]);
            res.json({ success: true, data: { userId, months, rows } });
        }
        catch (e) {
            next(e);
        }
    }
    async saveProjection(req, res, next) {
        try {
            const b = (0, pick_1.default)(req.body || {}, ['userId', 'month', 'metric', 'amount', 'note']);
            if (typeof b.month !== 'string' || !/^\d{4}-\d{2}(-01)?$/.test(b.month))
                throw new errorHandler_1.AppError(400, 'Month must be YYYY-MM');
            const month = `${b.month.slice(0, 7)}-01`;
            if (isNaN(Date.parse(`${month}T00:00:00Z`)))
                throw new errorHandler_1.AppError(400, 'Month must be YYYY-MM');
            if (!METRICS.includes(b.metric))
                throw new errorHandler_1.AppError(400, `Metric must be one of: ${METRICS.join(', ')}`);
            const amount = Number(b.amount);
            if (b.amount === '' || b.amount === null || b.amount === undefined || !isFinite(amount) || amount < 0)
                throw new errorHandler_1.AppError(400, 'Projected figure must be zero or more');
            const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 1000) : null;
            const repo = database_1.AppDataSource.getRepository(KpiProjection_1.KpiProjection);
            const readScope = need(req, 'kpis', 'create', 'enter projections');
            const subject = readScope === 'all' && b.userId ? String(b.userId) : req.user.id;
            const existing = await repo.findOne({ where: { userId: subject, month, metric: b.metric } });
            if (existing && !scopeOf(req, 'kpis', 'update'))
                throw new errorHandler_1.AppError(403, 'You do not have permission to revise projections');
            // Closed months are locked so a projection cannot be rewritten after the fact,
            // unless the role may update everyone's records.
            if (month < `${todayStr().slice(0, 7)}-01` && scopeOf(req, 'kpis', 'update') !== 'all') {
                throw new errorHandler_1.AppError(403, 'That month has ended; its projection is locked');
            }
            if (subject !== req.user.id && !(await database_1.AppDataSource.query('SELECT 1 FROM users WHERE id = $1', [subject])).length)
                throw new errorHandler_1.AppError(400, 'That staff member does not exist');
            const snap = (p) => ({ month: month.slice(0, 7), metric: b.metric, amount: Number(p.amount), note: p.note });
            let saved;
            if (existing) {
                const before = snap(existing);
                await repo.update(existing.id, { amount, note });
                saved = (await repo.findOne({ where: { id: existing.id } }));
                const after = snap(saved);
                if (JSON.stringify(before) !== JSON.stringify(after))
                    await kpi_service_1.default.audit('projection', saved.id, subject, req.user.id, 'updated', before, after);
            }
            else {
                saved = await repo.save(repo.create({ userId: subject, month, metric: b.metric, amount, note }));
                await kpi_service_1.default.audit('projection', saved.id, subject, req.user.id, 'created', null, snap(saved));
            }
            res.status(existing ? 200 : 201).json({ success: true, data: saved });
        }
        catch (e) {
            next(e);
        }
    }
    async deleteProjection(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'delete', 'delete projections');
            const repo = database_1.AppDataSource.getRepository(KpiProjection_1.KpiProjection);
            const p = await repo.findOne({ where: { id: req.params.id } });
            if (!p || (scope === 'self' && p.userId !== req.user.id))
                throw new errorHandler_1.AppError(404, 'Projection not found');
            if (String(p.month).slice(0, 7) < todayStr().slice(0, 7) && scopeOf(req, 'kpis', 'update') !== 'all')
                throw new errorHandler_1.AppError(403, 'That month has ended; its projection is locked');
            await kpi_service_1.default.audit('projection', p.id, p.userId, req.user.id, 'deleted', { month: String(p.month).slice(0, 7), metric: p.metric, amount: Number(p.amount), note: p.note }, null);
            await repo.delete(p.id);
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
    // ---- Audit trail & meeting report (kpis read) ----------------------------
    async auditTrail(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'read', 'view the KPI audit trail');
            const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
            const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 25, 1), 200);
            const from = isDate(req.query.from) ? req.query.from : undefined;
            const to = isDate(req.query.to) ? req.query.to : undefined;
            const entityType = ['kpi_entry', 'projection'].includes(String(req.query.entityType)) ? String(req.query.entityType) : undefined;
            const { rows, total } = await kpi_service_1.default.listAudit({
                subjectUserId: scope === 'self' ? req.user.id : str(req.query.userId), from, to, entityType, page, limit,
            });
            res.json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
        }
        catch (e) {
            next(e);
        }
    }
    async meetingReport(req, res, next) {
        try {
            const scope = need(req, 'kpis', 'read', 'view the KPI report');
            const today = todayStr();
            const to = isDate(req.query.to) ? req.query.to : today;
            const from = isDate(req.query.from) ? req.query.from : to;
            if (from > to)
                throw new errorHandler_1.AppError(400, 'From date cannot be after the To date');
            if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY + 1 > MAX_REPORT_DAYS)
                throw new errorHandler_1.AppError(400, `Choose a range of ${MAX_REPORT_DAYS} days or fewer`);
            // Individual view = one person; combined = everyone the role may see.
            const only = scope === 'self' ? [req.user.id] : str(req.query.userId) ? [String(req.query.userId)] : undefined;
            res.json({ success: true, data: await kpi_service_1.default.meetingReport(from, to, only, today) });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.PerformanceController = PerformanceController;
exports.default = new PerformanceController();
//# sourceMappingURL=performance.controller.js.map