// The stages an issue moves through, from being logged to being closed, and the
// rules for moving between them. Pure - no database - so it is unit tested.

export const ISSUE_STAGES = [
  'Logged',
  'Under development',
  'Testing',
  'User acceptance',
  'Deployed',
] as const;

export const STAGE_ON_HOLD = 'On hold';
export const STAGE_CANCELLED = 'Cancelled';

export type IssueStage = (typeof ISSUE_STAGES)[number] | typeof STAGE_ON_HOLD | typeof STAGE_CANCELLED;
export const ALL_STAGES: string[] = [...ISSUE_STAGES, STAGE_ON_HOLD, STAGE_CANCELLED];

// Stages in which the customer, not us, has the next move.
export const CUSTOMER_STAGES: string[] = ['User acceptance'];

// The last stage. An issue is finished (closed) once it is Deployed, or Cancelled.
export const FINAL_STAGE = 'Deployed';
export const isFinished = (stage: string) => stage === FINAL_STAGE || stage === STAGE_CANCELLED;

export const stageIndex = (stage: string) => (ISSUE_STAGES as readonly string[]).indexOf(stage);

// What each stage means, shown to everyone on the Issue Log page.
export const STAGE_HELP: Record<string, string> = {
  Logged: 'Recorded and waiting to be picked up',
  'Under development': 'The fix or change is being built',
  Testing: 'Being tested internally',
  'User acceptance': 'With the customer to test and accept',
  Deployed: 'Accepted by the customer and live in production - the item is closed',
  [STAGE_ON_HOLD]: 'Paused (blocked or waiting)',
  [STAGE_CANCELLED]: 'Will not be done',
};

export interface TransitionInput {
  from: string;
  to: string;
  note?: string | null;
  customerContact?: string | null;
  hasAssignee: boolean;
}

// Returns an error message when the move is not allowed, or null when it is.
// Rules:
//  - forward moves go one stage at a time, so nothing skips testing or customer approval;
//  - moving backwards (rework, reopening) is allowed but needs a note;
//  - pausing or cancelling needs a note;
//  - "Under development" needs an assignee; "Deployed" needs the name of the customer who accepted it and gave permission.
export function checkTransition(t: TransitionInput): string | null {
  const { from, to } = t;
  const note = (t.note || '').trim();
  if (!ALL_STAGES.includes(to)) return `Unknown stage: ${to}`;
  if (from === to) return `The issue is already in "${to}"`;
  if (from === STAGE_CANCELLED) return 'A cancelled issue cannot be moved. Log a new issue instead.';

  if (to === STAGE_ON_HOLD || to === STAGE_CANCELLED) {
    if (!note) return to === STAGE_ON_HOLD ? 'Say why the issue is on hold' : 'Say why the issue is being cancelled';
    return null;
  }

  const toIdx = stageIndex(to);
  if (from === STAGE_ON_HOLD) {
    // Resuming can go to any working stage; the usual gates below still apply.
  } else {
    const fromIdx = stageIndex(from);
    if (toIdx > fromIdx + 1) return `Move to "${ISSUE_STAGES[fromIdx + 1]}" first - stages cannot be skipped`;
    if (toIdx < fromIdx && !note) return 'Say why the issue is going back a stage';
  }
  if (from === STAGE_ON_HOLD && !note) return 'Say why the issue is resuming';

  if (to === 'Under development' && !t.hasAssignee) return 'Assign a developer before development starts';
  if (to === FINAL_STAGE && !(t.customerContact || '').trim()) {
    return 'Enter the customer who accepted it and gave permission to deploy';
  }
  return null;
}

// The ticket's status follows its issues.
export function ticketStatusFor(stages: string[]): 'Open' | 'In Progress' | 'Pending Customer' | 'Closed' | null {
  if (stages.length === 0) return null; // no issues: leave the ticket as it is
  if (stages.every(isFinished)) return 'Closed';
  const open = stages.filter((s) => !isFinished(s));
  if (open.every((s) => CUSTOMER_STAGES.includes(s))) return 'Pending Customer';
  if (open.every((s) => s === 'Logged') && stages.every((s) => s === 'Logged' || isFinished(s))) return 'Open';
  return 'In Progress';
}
