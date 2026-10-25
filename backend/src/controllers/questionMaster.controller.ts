import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import { ALL_STAGE_NAMES, QTYPES, STAGE_PREFIX } from '../utils/questionMaster';

// The question master for opportunity stages. Who may edit it is set in Role Management: the
// `questionnaire` privilege (read / create / update / delete).
const need = (req: AuthRequest, action: string, what: string) => {
  if (!canPerformAction(req.user, 'questionnaire', action)) throw new AppError(403, `You do not have permission to ${what}`);
};

const num = (v: unknown) => Number(v || 0);
const newKey = (stage: string) => `${STAGE_PREFIX[stage]}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Checks a question's fields. Returns the cleaned values.
function cleanQuestion(body: any, partial: boolean) {
  const d: any = pick(body || {}, ['stage', 'text', 'type', 'mandatory', 'options', 'help', 'isActive', 'position']);
  const bad = (m: string): never => { throw new AppError(400, m); };
  if (!partial || 'stage' in d) { if (!ALL_STAGE_NAMES.includes(d.stage)) bad(`Stage must be one of: ${ALL_STAGE_NAMES.join(', ')}`); }
  if (!partial || 'text' in d) {
    if (typeof d.text !== 'string' || !d.text.trim()) bad('The question text is required');
    if (d.text.length > 1000) bad('The question is too long (max 1000 characters)');
    d.text = d.text.trim();
  }
  if (!partial || 'type' in d) { if (!QTYPES.includes(d.type)) bad(`Answer type must be one of: ${QTYPES.join(', ')}`); }
  if ('mandatory' in d) d.mandatory = !!d.mandatory;
  if ('isActive' in d) d.isActive = !!d.isActive;
  if ('help' in d) {
    if (d.help !== null && typeof d.help !== 'string') bad('Help text must be text');
    d.help = d.help?.trim() || null;
    if (d.help && d.help.length > 500) bad('Help text is too long (max 500 characters)');
  }
  if ('position' in d) d.position = Math.max(0, Math.floor(num(d.position)));
  if ('options' in d || d.type === 'select') {
    const list = Array.isArray(d.options) ? d.options : typeof d.options === 'string' ? d.options.split('\n') : [];
    const clean = [...new Set(list.map((o: any) => String(o).trim()).filter(Boolean))] as string[];
    if (d.type === 'select' || (partial && 'options' in d && clean.length)) {
      if (d.type === 'select' && clean.length < 2) bad('A choice question needs at least two answers, one per line');
      if (clean.some((o) => o.length > 120)) bad('Each answer choice must be 120 characters or fewer');
      if (clean.length > 30) bad('A choice question can have at most 30 answers');
      d.options = clean.length ? JSON.stringify(clean) : null;
    } else {
      d.options = null;
    }
  }
  return d;
}

export class QuestionMasterController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'read', 'view the question master');
      const rows: any[] = await AppDataSource.query(
        `SELECT q.id, q."questionKey", q.stage, q.position, q.text, q.type, q.mandatory, q.options, q.help, q."isActive",
                q."createdAt", q."updatedAt",
                (SELECT COUNT(*) FROM opportunity_answers a WHERE a."questionKey" = q."questionKey") AS "answerCount"
         FROM questions q ORDER BY q.stage, q.position, q."questionKey"`);
      res.json({ success: true, data: rows.map((r) => ({ ...r, answerCount: num(r.answerCount) })), meta: { stages: ALL_STAGE_NAMES, types: QTYPES } });
    } catch (e) { next(e); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'create', 'add questions');
      const d = cleanQuestion(req.body, false);
      const [{ next: pos }] = await AppDataSource.query('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM questions WHERE stage = $1', [d.stage]);
      let key = newKey(d.stage);
      while ((await AppDataSource.query('SELECT 1 FROM questions WHERE "questionKey" = $1', [key])).length) key = newKey(d.stage);
      const [row] = await AppDataSource.query(
        `INSERT INTO questions ("questionKey", stage, position, text, type, mandatory, options, help, "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [key, d.stage, d.position ?? num(pos), d.text, d.type, d.mandatory ?? true, d.options ?? null, d.help ?? null, d.isActive ?? true]);
      res.status(201).json({ success: true, data: row });
    } catch (e) { next(e); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'update', 'edit questions');
      const [q] = await AppDataSource.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
      if (!q) throw new AppError(404, 'Question not found');
      const d = cleanQuestion(req.body, true);
      const [{ n }] = await AppDataSource.query('SELECT COUNT(*) n FROM opportunity_answers WHERE "questionKey" = $1', [q.questionKey]);
      const answered = num(n) > 0;
      // Moving a question to another stage or changing its type would change what saved answers mean.
      if (answered && 'stage' in d && d.stage !== q.stage) throw new AppError(409, `This question has ${num(n)} saved answer(s), so it cannot move to another stage. Retire it and add a new question instead.`);
      if (answered && 'type' in d && d.type !== q.type) throw new AppError(409, `This question has ${num(n)} saved answer(s), so its answer type cannot change. Retire it and add a new question instead.`);
      const cols: string[] = [];
      const vals: any[] = [];
      for (const [k, v] of Object.entries(d)) { vals.push(v); cols.push(`"${k}" = $${vals.length}`); }
      if (!cols.length) throw new AppError(400, 'Nothing to change');
      vals.push(req.params.id);
      const [row] = await AppDataSource.query(`UPDATE questions SET ${cols.join(', ')}, "updatedAt" = NOW() WHERE id = $${vals.length} RETURNING *`, vals);
      res.json({ success: true, data: row });
    } catch (e) { next(e); }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'delete', 'delete questions');
      const [q] = await AppDataSource.query('SELECT "questionKey" FROM questions WHERE id = $1', [req.params.id]);
      if (!q) throw new AppError(404, 'Question not found');
      const [{ n }] = await AppDataSource.query('SELECT COUNT(*) n FROM opportunity_answers WHERE "questionKey" = $1', [q.questionKey]);
      if (num(n) > 0) throw new AppError(409, `This question has ${num(n)} saved answer(s). Retire it (set it inactive) instead, so the answers are kept.`);
      await AppDataSource.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}

export default new QuestionMasterController();
