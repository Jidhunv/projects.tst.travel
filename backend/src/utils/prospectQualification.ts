// Lead qualification questionnaire. A lead becomes Qualified only when every mandatory
// question is answered. Only a Qualified lead can be converted to a prospect. The answers
// are stored on the account (leadQualification).

export const LEAD_QUALIFICATION_QUESTIONS = [
  { key: 'lq1', mandatory: true, label: 'Why is this a genuine business opportunity, and why pursue it now?' },
  { key: 'lq2', mandatory: true, label: 'Which product or solution is relevant, and what confirmed customer problem does it solve?' },
  { key: 'lq3', mandatory: true, label: 'What evidence confirms the customer\'s need or interest?' },
  { key: 'lq4', mandatory: true, label: 'Who is the customer contact, what is their buying role, and who are the decision-maker and budget owner?' },
  { key: 'lq5', mandatory: true, label: 'How urgent is the need, and what is the impact of not acting?' },
  { key: 'lq6', mandatory: true, label: 'What is the current arrangement, and is a competitor or alternative involved?' },
  { key: 'lq7', mandatory: true, label: 'What is the estimated deal value, and what assumptions support it?' },
  { key: 'lq8', mandatory: true, label: 'What is the expected decision timeframe, and what risks could prevent conversion?' },
  { key: 'lq9', mandatory: true, label: 'What is the agreed next action, who owns it, and when is it due?' },
  { key: 'lq10', mandatory: false, label: 'Has the full buying committee been mapped?' },
  { key: 'lq11', mandatory: false, label: 'What is the expected purchase decision date?' },
  { key: 'lq12', mandatory: false, label: 'Are there additional opportunities or expansion possibilities?' },
] as const;

export type LeadQualificationKey = (typeof LEAD_QUALIFICATION_QUESTIONS)[number]['key'];
export type LeadQualificationAnswers = Partial<Record<LeadQualificationKey, string>>;

const MAX_ANSWER = 2000;

// Cleans what a client sends. Unknown keys are dropped; an answer that is too long is rejected.
export function normaliseLeadQualification(input: unknown): LeadQualificationAnswers {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Lead qualification answers must be an object');
  const src = input as Record<string, unknown>;
  const out: LeadQualificationAnswers = {};
  for (const q of LEAD_QUALIFICATION_QUESTIONS) {
    if (!(q.key in src)) continue;
    const t = typeof src[q.key] === 'string' ? (src[q.key] as string).trim() : '';
    if (t.length > MAX_ANSWER) throw new Error(`Answer ${q.key} is too long (max ${MAX_ANSWER} characters)`);
    if (t) out[q.key] = t;
  }
  return out;
}

// Progress against the mandatory questions. `complete` only when every mandatory answer is filled in.
export function leadQualificationProgress(stored: LeadQualificationAnswers | null | undefined) {
  const a = stored ?? {};
  const required = LEAD_QUALIFICATION_QUESTIONS.filter((q) => q.mandatory);
  const missing = required.filter((q) => !(a[q.key] ?? '').trim()).map((q) => q.key);
  return {
    answered: required.length - missing.length,
    total: required.length,
    complete: missing.length === 0,
    missing,
  };
}
