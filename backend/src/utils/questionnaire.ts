// The stage questionnaire for opportunities. Every question asks for ONE thing: where the source
// wording joined two or more things, it has been split so no part is missed.
//
// Gates: a deal may enter a stage only when every MANDATORY question of the stages before it
// has a real answer. "Unknown" is saved as a flag but does not satisfy a gate.
// Optional questions never block progression.

import { OPPORTUNITY_STAGES } from './constants';

export type QType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'yesno' | 'contact' | 'product' | 'productMulti' | 'attendees' | 'attendance';

export interface Question {
  key: string;        // stable id, e.g. QUAL-2b
  stage: string;      // which stage the question belongs to (Closed-Won / Closed-Lost for outcomes)
  text: string;
  type: QType;
  mandatory: boolean;
  options?: string[]; // for select
  help?: string;
}

const APPROVAL = ['Pending', 'Approved', 'Not required'];

export const QUESTIONS: Question[] = [
  { key: 'ENG-01', stage: 'Customer engagement', mandatory: true, type: 'text', text: 'What specific customer requirement, change or concern was discussed in this interaction?' },
  { key: 'ENG-02', stage: 'Customer engagement', mandatory: true, type: 'text', text: 'Who did you meet, and what is their role in the buying process?' },
  { key: 'ENG-03', stage: 'Customer engagement', mandatory: true, type: 'text', text: 'What new information, feedback or evidence did the customer provide?' },
  { key: 'ENG-04', stage: 'Customer engagement', mandatory: true, type: 'text', text: 'What was agreed as the next action, who is responsible, and when is it due?' },
  { key: 'ENG-05', stage: 'Customer engagement', mandatory: false, type: 'text', text: 'Has the estimated deal value, decision date or buying process changed? If yes, update the relevant field.' },
  { key: 'DEMO-01', stage: 'Demonstration', mandatory: true, type: 'attendees', text: 'Who is expected to attend, and what is each person\'s role?' },
  { key: 'DEMO-02', stage: 'Demonstration', mandatory: true, type: 'text', text: 'Which customer requirements must the demo address?' },
  { key: 'DEMO-03', stage: 'Demonstration', mandatory: true, type: 'text', text: 'Which product features or modules will be demonstrated against each requirement?' },
  { key: 'DEMO-04', stage: 'Demonstration', mandatory: true, type: 'text', text: 'Are there specific technical questions, integrations, data migration or customisation requirements to prepare for? If none, write "None identified".' },
  { key: 'DEMO-05', stage: 'Demonstration', mandatory: true, type: 'text', text: 'What outcome does the customer expect from the demo?' },
  { key: 'DEMO-06', stage: 'Demonstration', mandatory: true, type: 'attendance', text: 'Who actually attended, and what was the material feedback from each attendee?' },
  { key: 'DEMO-07', stage: 'Demonstration', mandatory: true, type: 'text', text: 'Which requirements were satisfied, partially satisfied or not satisfied?' },
  { key: 'DEMO-08', stage: 'Demonstration', mandatory: true, type: 'text', text: 'What was the customer\'s overall qualitative response to the demo?' },
  { key: 'DEMO-08b', stage: 'Demonstration', mandatory: true, type: 'select', options: ['Satisfied', 'Partially satisfied', 'Not satisfied'], text: 'What is the customer\'s overall satisfaction rating?' },
  { key: 'DEMO-09', stage: 'Demonstration', mandatory: true, type: 'text', text: 'What gaps, objections or technical concerns remain, and what category does each fall under?' },
  { key: 'DEMO-10', stage: 'Demonstration', mandatory: true, type: 'yesno', text: 'Has the customer agreed to evaluate a commercial proposal?' },
  { key: 'DEMO-11', stage: 'Demonstration', mandatory: true, type: 'text', text: 'Who will review the proposal, and what criteria will they use?' },
  { key: 'DEMO-12', stage: 'Demonstration', mandatory: true, type: 'text', text: 'What follow-up action is agreed, who owns it, and when is it due?' },
  { key: 'PROP-01', stage: 'Proposal', mandatory: true, type: 'productMulti', text: 'Which products or modules are included, and what is the proposed scope?' },
  { key: 'PROP-02', stage: 'Proposal', mandatory: true, type: 'currency', text: 'What is the proposed price, currency and pricing basis?' },
  { key: 'PROP-03', stage: 'Proposal', mandatory: true, type: 'select', options: ['Confirmed', 'Not confirmed', 'Unknown'], text: 'Has the customer confirmed the budget? If yes, what is it?' },
  { key: 'PROP-04', stage: 'Proposal', mandatory: true, type: 'text', text: 'What business value justifies the investment?' },
  { key: 'PROP-05', stage: 'Proposal', mandatory: true, type: 'text', text: 'Who will review and approve the proposal, and what decision steps remain?' },
  { key: 'PROP-06', stage: 'Proposal', mandatory: true, type: 'date', text: 'When is the decision expected?' },
  { key: 'PROP-07', stage: 'Proposal', mandatory: true, type: 'text', text: 'Has the proposal been sent or formally presented? Record the date and evidence.' },
  { key: 'PROP-08', stage: 'Proposal', mandatory: false, type: 'text', text: 'What measurable benefits or return are expected?' },
  { key: 'PROP-09', stage: 'Proposal', mandatory: false, type: 'text', text: 'Which competing vendors or alternatives are being considered, and how does our offer compare?' },
  { key: 'NEG-01', stage: 'Negotiation', mandatory: true, type: 'text', text: 'What objections or requested changes remain, and what category does each fall under?' },
  { key: 'NEG-02', stage: 'Negotiation', mandatory: true, type: 'text', text: 'What final price is the customer requesting, and what discount has the company offered?' },
  { key: 'NEG-03', stage: 'Negotiation', mandatory: true, type: 'text', text: 'What scope or contractual changes have been requested or offered?' },
  { key: 'NEG-04', stage: 'Negotiation', mandatory: true, type: 'text', text: 'Who are the final decision-makers and required approvers?' },
  { key: 'NEG-05a', stage: 'Negotiation', mandatory: true, type: 'select', options: ['Pending', 'Approved', 'Rejected', 'Not required'], text: 'Technical approval status' },
  { key: 'NEG-05b', stage: 'Negotiation', mandatory: true, type: 'select', options: ['Pending', 'Approved', 'Rejected', 'Not required'], text: 'Financial approval status' },
  { key: 'NEG-05c', stage: 'Negotiation', mandatory: true, type: 'select', options: ['Pending', 'Approved', 'Rejected', 'Not required'], text: 'Procurement approval status' },
  { key: 'NEG-05d', stage: 'Negotiation', mandatory: true, type: 'select', options: ['Pending', 'Approved', 'Rejected', 'Not required'], text: 'Any other required approval status' },
  { key: 'NEG-06', stage: 'Negotiation', mandatory: true, type: 'text', text: 'What conditions must be met before signing, and by what date?' },
  { key: 'NEG-07', stage: 'Negotiation', mandatory: true, type: 'text', text: 'What are the final agreed commercial and contractual terms?' },
  { key: 'NEG-08', stage: 'Negotiation', mandatory: false, type: 'number', text: 'What is the estimated probability of closing (%)?' },
  { key: 'NEG-09', stage: 'Negotiation', mandatory: false, type: 'text', text: 'What is the main remaining risk to closing?' },
  { key: 'WON-01', stage: 'Closed-Won', mandatory: true, type: 'currency', text: 'What is the final contracted value, currency and contract term?' },
  { key: 'WON-02', stage: 'Closed-Won', mandatory: true, type: 'text', text: 'What is the final agreed scope and list of deliverables?' },
  { key: 'WON-03', stage: 'Closed-Won', mandatory: true, type: 'text', text: 'What evidence confirms the win, and what is its reference number?' },
  { key: 'WON-04', stage: 'Closed-Won', mandatory: true, type: 'text', text: 'What are the agreed payment terms?' },
  { key: 'WON-05', stage: 'Closed-Won', mandatory: true, type: 'text', text: 'What are the agreed delivery milestones and dates?' },
  { key: 'WON-06', stage: 'Closed-Won', mandatory: true, type: 'text', text: 'Who is the implementation owner?' },
  { key: 'WON-07', stage: 'Closed-Won', mandatory: true, type: 'text', text: 'Who owns the customer handover, and when will it take place?' },
  { key: 'WON-08', stage: 'Closed-Won', mandatory: false, type: 'text', text: 'What expansion, cross-sell or renewal opportunities should be tracked?' },
  { key: 'HAND-01', stage: 'Handover', mandatory: true, type: 'text', text: 'Who are the key customer stakeholders and internal stakeholders involved in the project? Give names, roles, contact details and responsibilities.' },
  { key: 'HAND-02', stage: 'Handover', mandatory: true, type: 'text', text: 'What has been agreed that the project team must deliver? Final scope, products, modules, deliverables and exclusions.' },
  { key: 'HAND-03', stage: 'Handover', mandatory: true, type: 'text', text: 'What business problem is the customer expecting us to solve, and what does success look like? Expected outcome and acceptance criteria.' },
  { key: 'HAND-04', stage: 'Handover', mandatory: true, type: 'text', text: 'What workflows or business processes must the solution support? Current process, expected future process, approval flows and business rules.' },
  { key: 'HAND-05', stage: 'Handover', mandatory: true, type: 'text', text: 'What is the expected delivery and implementation timeline? Start date, milestones, target completion date and dependencies.' },
  { key: 'HAND-06', stage: 'Handover', mandatory: true, type: 'text', text: 'What availability, uptime, performance or support expectations have been agreed? Service hours, SLA and response expectations, where applicable.' },
  { key: 'HAND-07', stage: 'Handover', mandatory: true, type: 'text', text: 'What integrations, data migration, customisation or third-party dependencies are required? Systems involved, data sources, dependency owners and responsibilities.' },
  { key: 'HAND-08', stage: 'Handover', mandatory: true, type: 'text', text: 'What customer inputs, access, resources or approvals are required before work can begin? Access arrangements, data, documents, staff availability and approval dependencies.' },
  { key: 'HAND-09', stage: 'Handover', mandatory: true, type: 'text', text: 'What are the commercial commitments and payment milestones? Contract value, payment schedule, invoicing milestones and special commitments.' },
  { key: 'HAND-10', stage: 'Handover', mandatory: true, type: 'text', text: 'What risks, unresolved issues, assumptions or commitments must the project team know about? Outstanding concerns, promised features, scope boundaries and agreed exceptions.' },
  { key: 'HAND-11', stage: 'Handover', mandatory: true, type: 'text', text: 'Who is the project owner on our side, who is the customer project owner, and who is responsible for each next action? Named owners and responsibilities.' },
  { key: 'HAND-12', stage: 'Handover', mandatory: true, type: 'text', text: 'When will the handover meeting take place, and have the required documents and records been shared? Handover date, attendees, document checklist and status.' },
  { key: 'LOST-1', stage: 'Closed-Lost', mandatory: true, type: 'select', options: ['Price', 'Competitor', 'No budget', 'No priority', 'Missing functionality', 'Timing', 'No decision', 'Other'], text: 'What is the primary reason for losing the opportunity?' },
  { key: 'LOST-2', stage: 'Closed-Lost', mandatory: true, type: 'text', text: 'What was the decisive factor in the loss?' },
  { key: 'LOST-3a', stage: 'Closed-Lost', mandatory: true, type: 'text', text: 'Which competitor or alternative was selected, if any?', help: 'Write None if no competitor was chosen' },
  { key: 'LOST-3b', stage: 'Closed-Lost', mandatory: false, type: 'text', text: 'Why was that competitor or alternative selected?' },
  { key: 'LOST-4a', stage: 'Closed-Lost', mandatory: true, type: 'yesno', text: 'Was a recovery or future follow-up agreed?' },
  { key: 'LOST-4b', stage: 'Closed-Lost', mandatory: false, type: 'date', text: 'On what date is the follow-up?' },
  { key: 'LOST-5', stage: 'Closed-Lost', mandatory: false, type: 'text', text: 'What lesson should the company record to improve future sales?', help: 'Optional' },
];

// Open stages in order. Qualification is the legacy first stage: existing deals keep it, but new
// deals start at Demonstration and never have to answer the Qualification questions.
export const FIRST_FOUR = ['Customer engagement', 'Demonstration', 'Proposal', 'Negotiation'] as readonly string[];
const GATED = FIRST_FOUR.filter((s) => s !== 'Customer engagement');
export const WON = 'Closed-Won';
export const LOST = 'Closed-Lost';

export const questionsFor = (stage: string) => QUESTIONS.filter((q) => q.stage === stage);
export const questionByKey = (key: string) => QUESTIONS.find((q) => q.key === key);

// Stages that must be fully answered before a deal may move INTO `target`.
export const HANDOVER = 'Handover';

export function prerequisiteStages(target: string): string[] {
  if (target === WON) return GATED.slice(); // every open stage, then the win record
  if (target === HANDOVER) return [...GATED, WON, HANDOVER]; // the win and the handover plan must be recorded before handover
  if (target === LOST) return []; // a loss needs its own record only
  const idx = GATED.indexOf(target);
  return idx <= 0 ? [] : GATED.slice(0, idx);
}

// Stages the questionnaire shows for a deal sitting at `current`: every open stage reached so far,
// then both outcome records. A deal can be lost from any stage, so the outcome sections are always
// available; they only count as a gate when the deal actually closes.
export function visibleStages(current: string): string[] {
  // A legacy Qualification deal sees only its own stage; other deals never see Qualification.
  // Handover questions are answered from Closed-Won, before the deal moves into Handover.
  if (current === HANDOVER || current === WON) return [...GATED, WON, HANDOVER, LOST];
  const open = current === 'Customer engagement' ? ['Customer engagement']
    : current === WON || current === LOST ? GATED.slice()
    : GATED.slice(0, Math.max(0, GATED.indexOf(current)) + 1);
  return [...open, WON, LOST];
}

// The deal status that goes with a stage. Handover follows a win, so it stays Won.
export function statusForStage(stage: string): 'Open' | 'Won' | 'Lost' {
  if (stage === WON || stage === HANDOVER) return 'Won';
  if (stage === LOST) return 'Lost';
  return 'Open';
}

// Validates a single answer against its question type. Returns an error message or null.
export interface DemoAttendee { name: string; role?: string; email?: string; phone?: string }
export interface DemoAttendance { name: string; attended: boolean; comments?: string }

// The people invited to the demo. Returns null when the list is not valid.
export function normaliseAttendees(input: unknown): DemoAttendee[] | null {
  let arr: unknown = input;
  if (typeof input === 'string') { try { arr = JSON.parse(input); } catch { return null; } }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const out: DemoAttendee[] = [];
  for (const a of arr) {
    const x = (a ?? {}) as Record<string, unknown>;
    const name = typeof x.name === 'string' ? x.name.trim() : '';
    if (!name) return null;
    out.push({ name, role: str(x.role), email: str(x.email), phone: str(x.phone) });
  }
  return out;
}

// The people who actually attended, each with their comments. Returns null when not valid.
export function normaliseAttendance(input: unknown): DemoAttendance[] | null {
  let arr: unknown = input;
  if (typeof input === 'string') { try { arr = JSON.parse(input); } catch { return null; } }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const out: DemoAttendance[] = [];
  for (const a of arr) {
    const x = (a ?? {}) as Record<string, unknown>;
    const name = typeof x.name === 'string' ? x.name.trim() : '';
    if (!name || typeof x.attended !== 'boolean') return null;
    out.push({ name, attended: x.attended, comments: str(x.comments) });
  }
  return out;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validateValue(q: Question, value: string | null): string | null {
  if (value === null || value === undefined || value.trim() === '') return 'Enter an answer, or mark it Unknown';
  const v = value.trim();
  switch (q.type) {
    case 'number':
    case 'currency': {
      const n = Number(v);
      if (!isFinite(n) || n < 0) return 'Enter a number of zero or more';
      if (q.key === 'NEG-08' && n > 100) return 'Probability must be between 0 and 100';
      return null;
    }
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(`${v}T00:00:00Z`)) ? null : 'Enter a valid date';
    case 'select':
      return q.options?.includes(v) ? null : `Choose one of: ${q.options?.join(', ')}`;
    case 'yesno':
      return v === 'Yes' || v === 'No' || v === 'Pending' ? null : 'Answer Yes, No or Pending';
    case 'productMulti': {
      try {
        const arr = JSON.parse(v);
        return Array.isArray(arr) && arr.length > 0 && arr.every((x) => typeof x === 'string') ? null : 'Choose at least one product';
      } catch { return 'Choose at least one product'; }
    }
    case 'attendees':
      return normaliseAttendees(v) ? null : 'Add at least one attendee with a name';
    case 'attendance':
      return normaliseAttendance(v) ? null : 'Record who attended, and whether each person attended';
    default:
      return v.length > 4000 ? 'The answer is too long (max 4000 characters)' : null;
  }
}
