"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionMasterController = void 0;
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const questionMaster_1 = require("../utils/questionMaster");
// The question master for opportunity stages. Who may edit it is set in Role Management: the
// `questionnaire` privilege (read / create / update / delete).
const need = (req, action, what) => {
    if (!(0, auth_1.canPerformAction)(req.user, 'questionnaire', action))
        throw new errorHandler_1.AppError(403, `You do not have permission to ${what}`);
};
const num = (v) => Number(v || 0);
const newKey = (stage) => `${questionMaster_1.STAGE_PREFIX[stage]}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
// Checks a question's fields. Returns the cleaned values.
function cleanQuestion(body, partial) {
    const d = (0, pick_1.default)(body || {}, ['stage', 'text', 'type', 'mandatory', 'options', 'help', 'isActive', 'position']);
    const bad = (m) => { throw new errorHandler_1.AppError(400, m); };
    if (!partial || 'stage' in d) {
        if (!questionMaster_1.ALL_STAGE_NAMES.includes(d.stage))
            bad(`Stage must be one of: ${questionMaster_1.ALL_STAGE_NAMES.join(', ')}`);
    }
    if (!partial || 'text' in d) {
        if (typeof d.text !== 'string' || !d.text.trim())
            bad('The question text is required');
        if (d.text.length > 1000)
            bad('The question is too long (max 1000 characters)');
        d.text = d.text.trim();
    }
    if (!partial || 'type' in d) {
        if (!questionMaster_1.QTYPES.includes(d.type))
            bad(`Answer type must be one of: ${questionMaster_1.QTYPES.join(', ')}`);
    }
    if ('mandatory' in d)
        d.mandatory = !!d.mandatory;
    if ('isActive' in d)
        d.isActive = !!d.isActive;
    if ('help' in d) {
        if (d.help !== null && typeof d.help !== 'string')
            bad('Help text must be text');
        d.help = d.help?.trim() || null;
        if (d.help && d.help.length > 500)
            bad('Help text is too long (max 500 characters)');
    }
    if ('position' in d)
        d.position = Math.max(0, Math.floor(num(d.position)));
    if ('options' in d || d.type === 'select') {
        const list = Array.isArray(d.options) ? d.options : typeof d.options === 'string' ? d.options.split('\n') : [];
        const clean = [...new Set(list.map((o) => String(o).trim()).filter(Boolean))];
        if (d.type === 'select' || (partial && 'options' in d && clean.length)) {
            if (d.type === 'select' && clean.length < 2)
                bad('A choice question needs at least two answers, one per line');
            if (clean.some((o) => o.length > 120))
                bad('Each answer choice must be 120 characters or fewer');
            if (clean.length > 30)
                bad('A choice question can have at most 30 answers');
            d.options = clean.length ? JSON.stringify(clean) : null;
        }
        else {
            d.options = null;
        }
    }
    return d;
}
class QuestionMasterController {
    async list(req, res, next) {
        try {
            need(req, 'read', 'view the question master');
            const rows = await database_1.AppDataSource.query(`SELECT q.id, q."questionKey", q.stage, q.position, q.text, q.type, q.mandatory, q.options, q.help, q."isActive",
                q."createdAt", q."updatedAt",
                (SELECT COUNT(*) FROM opportunity_answers a WHERE a."questionKey" = q."questionKey") AS "answerCount"
         FROM questions q ORDER BY q.stage, q.position, q."questionKey"`);
            res.json({ success: true, data: rows.map((r) => ({ ...r, answerCount: num(r.answerCount) })), meta: { stages: questionMaster_1.ALL_STAGE_NAMES, types: questionMaster_1.QTYPES } });
        }
        catch (e) {
            next(e);
        }
    }
    async create(req, res, next) {
        try {
            need(req, 'create', 'add questions');
            const d = cleanQuestion(req.body, false);
            const [{ next: pos }] = await database_1.AppDataSource.query('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM questions WHERE stage = $1', [d.stage]);
            let key = newKey(d.stage);
            while ((await database_1.AppDataSource.query('SELECT 1 FROM questions WHERE "questionKey" = $1', [key])).length)
                key = newKey(d.stage);
            const [row] = await database_1.AppDataSource.query(`INSERT INTO questions ("questionKey", stage, position, text, type, mandatory, options, help, "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [key, d.stage, d.position ?? num(pos), d.text, d.type, d.mandatory ?? true, d.options ?? null, d.help ?? null, d.isActive ?? true]);
            res.status(201).json({ success: true, data: row });
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            need(req, 'update', 'edit questions');
            const [q] = await database_1.AppDataSource.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
            if (!q)
                throw new errorHandler_1.AppError(404, 'Question not found');
            const d = cleanQuestion(req.body, true);
            const [{ n }] = await database_1.AppDataSource.query('SELECT COUNT(*) n FROM opportunity_answers WHERE "questionKey" = $1', [q.questionKey]);
            const answered = num(n) > 0;
            // Moving a question to another stage or changing its type would change what saved answers mean.
            if (answered && 'stage' in d && d.stage !== q.stage)
                throw new errorHandler_1.AppError(409, `This question has ${num(n)} saved answer(s), so it cannot move to another stage. Retire it and add a new question instead.`);
            if (answered && 'type' in d && d.type !== q.type)
                throw new errorHandler_1.AppError(409, `This question has ${num(n)} saved answer(s), so its answer type cannot change. Retire it and add a new question instead.`);
            const cols = [];
            const vals = [];
            for (const [k, v] of Object.entries(d)) {
                vals.push(v);
                cols.push(`"${k}" = $${vals.length}`);
            }
            if (!cols.length)
                throw new errorHandler_1.AppError(400, 'Nothing to change');
            vals.push(req.params.id);
            const [row] = await database_1.AppDataSource.query(`UPDATE questions SET ${cols.join(', ')}, "updatedAt" = NOW() WHERE id = $${vals.length} RETURNING *`, vals);
            res.json({ success: true, data: row });
        }
        catch (e) {
            next(e);
        }
    }
    async remove(req, res, next) {
        try {
            need(req, 'delete', 'delete questions');
            const [q] = await database_1.AppDataSource.query('SELECT "questionKey" FROM questions WHERE id = $1', [req.params.id]);
            if (!q)
                throw new errorHandler_1.AppError(404, 'Question not found');
            const [{ n }] = await database_1.AppDataSource.query('SELECT COUNT(*) n FROM opportunity_answers WHERE "questionKey" = $1', [q.questionKey]);
            if (num(n) > 0)
                throw new errorHandler_1.AppError(409, `This question has ${num(n)} saved answer(s). Retire it (set it inactive) instead, so the answers are kept.`);
            await database_1.AppDataSource.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.QuestionMasterController = QuestionMasterController;
exports.default = new QuestionMasterController();
//# sourceMappingURL=questionMaster.controller.js.map