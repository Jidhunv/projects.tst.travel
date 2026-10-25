import { AppDataSource } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Question, WON, LOST, FIRST_FOUR, prerequisiteStages, visibleStages, validateValue } from '../utils/questionnaire';

export interface GateContext {
  actorId: string;
  isAdmin: boolean;
  overrideReason?: string;
}

export interface Answer {
  value: string | null;
  status: 'answered' | 'unknown';
  updatedBy: string | null;
  updatedAt: Date | null;
}

const MAX_NAMES = 6;

// Maps a row of the `questions` master to the shape the rules use.
const toQuestion = (r: any): Question => ({
  key: r.questionKey, stage: r.stage, text: r.text, type: r.type, mandatory: r.mandatory,
  options: r.options || undefined, help: r.help || undefined,
});

// Stage order used for "is this a backward move".
const isEarlier = (a: string, b: string) => {
  const order = FIRST_FOUR as string[];
  return order.indexOf(a) >= 0 && order.indexOf(b) >= 0 && order.indexOf(a) < order.indexOf(b);
};

class QuestionnaireService {
  // The live question master. Retired questions are hidden here, but their saved answers are kept.
  async bank(): Promise<Question[]> {
    const rows: any[] = await AppDataSource.query(
      'SELECT "questionKey", stage, position, text, type, mandatory, options, help FROM questions WHERE "isActive" = TRUE ORDER BY stage, position, "questionKey"'
    );
    return rows.map(toQuestion);
  }

  private async loadOpp(oppId: string) {
    const [opp] = await AppDataSource.query('SELECT id, stage, "accountId" FROM opportunities WHERE id = $1', [oppId]);
    if (!opp) throw new AppError(404, 'Opportunity not found');
    return opp as { id: string; stage: string; accountId: string };
  }

  private async answersFor(oppId: string): Promise<Map<string, Answer>> {
    const rows: any[] = await AppDataSource.query(
      `SELECT a."questionKey", a.value, a.status, a."updatedAt",
              u."firstName" || ' ' || u."lastName" AS "updatedBy"
       FROM opportunity_answers a LEFT JOIN users u ON u.id = a."updatedById"
       WHERE a."opportunityId" = $1`, [oppId]);
    return new Map(rows.map((r) => [r.questionKey, { value: r.value, status: r.status, updatedBy: r.updatedBy, updatedAt: r.updatedAt }]));
  }

  // A question is satisfied only by a real, valid answer. "Unknown" is saved, but does not count.
  private satisfied(q: Question, a?: Answer) {
    return !!a && a.status === 'answered' && !!a.value && a.value.trim() !== '' && !validateValue(q, a.value);
  }

  // The questionnaire as the user sees it: every question of the stages reached so far, with blanks where unanswered.
  async getQuestionnaire(oppId: string) {
    const opp = await this.loadOpp(oppId);
    const [bank, answers] = await Promise.all([this.bank(), this.answersFor(oppId)]);
    const stages = visibleStages(opp.stage).map((stage) => {
      const qs = bank.filter((q) => q.stage === stage);
      const mandatory = qs.filter((q) => q.mandatory);
      const missing = mandatory.filter((q) => !this.satisfied(q, answers.get(q.key))).map((q) => q.key);
      return {
        stage,
        current: stage === opp.stage,
        complete: missing.length === 0,
        mandatoryTotal: mandatory.length,
        mandatoryAnswered: mandatory.length - missing.length,
        questions: qs.map((q) => ({
          key: q.key, text: q.text, type: q.type, mandatory: q.mandatory, options: q.options || null, help: q.help || null,
          answer: answers.get(q.key) || null,
        })),
      };
    });
    return { opportunityId: oppId, stage: opp.stage, accountId: opp.accountId, stages };
  }

  // Saves one answer. Only questions of the stages reached so far can be answered.
  async saveAnswer(oppId: string, key: string, input: { value?: string | null; status?: string }, actorId: string) {
    const bank = await this.bank();
    const q = bank.find((x) => x.key === key);
    if (!q) throw new AppError(404, 'Question not found');
    const opp = await this.loadOpp(oppId);
    if (!visibleStages(opp.stage).includes(q.stage)) {
      throw new AppError(400, `This question belongs to ${q.stage}. Move the deal to ${q.stage} or later to answer it.`);
    }
    const status = input.status === 'unknown' ? 'unknown' : 'answered';
    const value = status === 'unknown' ? null : (input.value ?? null);
    if (status === 'answered') {
      const err = validateValue(q, value);
      if (err) throw new AppError(400, err);
    }
    const prior = (await this.answersFor(oppId)).get(key);
    const changed = !prior || prior.value !== value || prior.status !== status;
    if (changed) {
      await AppDataSource.query(
        `INSERT INTO opportunity_answers ("opportunityId", "questionKey", value, status, "updatedById", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT ("opportunityId", "questionKey")
         DO UPDATE SET value = EXCLUDED.value, status = EXCLUDED.status, "updatedById" = EXCLUDED."updatedById", "updatedAt" = NOW()`,
        [oppId, key, value, status, actorId]);
      await AppDataSource.query(
        `INSERT INTO opportunity_answer_history ("opportunityId", "questionKey", "oldValue", "newValue", "oldStatus", "newStatus", "actorId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [oppId, key, prior?.value ?? null, value, prior?.status ?? null, status, actorId]);
    }
    return this.getQuestionnaire(oppId);
  }

  async history(oppId: string, key: string) {
    return AppDataSource.query(
      `SELECT h."oldValue", h."newValue", h."oldStatus", h."newStatus", h.note, h."createdAt",
              u."firstName" || ' ' || u."lastName" AS "actorName"
       FROM opportunity_answer_history h LEFT JOIN users u ON u.id = h."actorId"
       WHERE h."opportunityId" = $1 AND h."questionKey" = $2 ORDER BY h."createdAt" DESC`, [oppId, key]);
  }

  // The unanswered mandatory questions that block moving a deal into `target`.
  async missingFor(oppId: string, target: string): Promise<Question[]> {
    const [bank, answers, opp] = await Promise.all([this.bank(), this.answersFor(oppId), this.loadOpp(oppId)]);
    // A loss needs only its own record; a win needs every open stage plus its own record.
    const base = target === LOST ? [LOST] : prerequisiteStages(target).concat(target === WON ? [WON] : []);
    // A deal still sitting in Qualification (from before that stage was removed) answers its questions before it moves on.
    const legacy = opp.stage === 'Customer engagement' && target !== LOST && target !== 'Customer engagement';
    const stages = legacy ? ['Customer engagement', ...base] : base;
    return bank
      .filter((q) => stages.includes(q.stage) && q.mandatory)
      .filter((q) => !this.satisfied(q, answers.get(q.key)));
  }

  // Checks the gate before a stage change. Throws 409 with the missing questions, or lets an
  // administrator override with a recorded reason.
  async assertGate(oppId: string, target: string, ctx: GateContext) {
    const opp = await this.loadOpp(oppId);
    if (opp.stage === target) return;
    // Moving backwards to an earlier open stage needs no gate: those answers stay in place.
    if (target !== WON && target !== LOST && isEarlier(target, opp.stage)) return;
    const missing = await this.missingFor(oppId, target);
    if (missing.length === 0) return;

    if (ctx.overrideReason && ctx.overrideReason.trim()) {
      if (!ctx.isAdmin) throw new AppError(403, 'Only an administrator can override a stage gate');
      await AppDataSource.query(
        `INSERT INTO opportunity_answer_history ("opportunityId", "questionKey", "oldValue", "newValue", "oldStatus", "newStatus", note, "actorId")
         VALUES ($1, 'GATE', NULL, $2, NULL, NULL, $3, $4)`,
        [oppId, target, `OVERRIDE of gate to ${target}: ${ctx.overrideReason.trim().slice(0, 1000)} | missing: ${missing.map((q) => q.key).join(', ')}`, ctx.actorId]);
      return;
    }
    const shown = missing.slice(0, MAX_NAMES).map((q) => `${q.key} "${q.text}"`).join('; ');
    const more = missing.length > MAX_NAMES ? ` and ${missing.length - MAX_NAMES} more` : '';
    throw new AppError(409, `Cannot move this deal to ${target} yet. Answer these required questions first: ${shown}${more}.`);
  }
}

export default new QuestionnaireService();
