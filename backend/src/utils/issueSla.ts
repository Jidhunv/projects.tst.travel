// SLA maths for client issues. Pure (no database) so it is unit tested.
//
// Two clocks are measured from the moment an issue is logged:
//   response   - until someone first acts on it (it leaves "Logged")
//   resolution - until the fix is deployed to production
// "Closed" is reported too (it also needs the customer's feedback) but is not the SLA point.
//
// The SLA clock does not run while the issue is waiting on the customer
// ("Customer acceptance") or paused ("On hold"): that time is not ours to control.
// Hours are calendar hours, not working hours.

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

// Used when the ticket has no SLA hours of its own.
export const SLA_DEFAULTS: Record<string, { responseHours: number; resolutionHours: number }> = {
  Critical: { responseHours: 2, resolutionHours: 24 },
  High: { responseHours: 4, resolutionHours: 72 },
  Medium: { responseHours: 8, resolutionHours: 120 },
  Low: { responseHours: 24, resolutionHours: 240 },
};

// Stages in which the SLA clock is stopped.
export const SLA_PAUSE_STAGES = ['On hold', 'Customer acceptance'];
export const RESOLVED_STAGE = 'Deployed to production';

const HOUR = 3_600_000;

export interface Transition { toStage: string; at: Date }

export function slaTargets(priority: string, ticketResponseHours?: number | null, ticketResolutionHours?: number | null) {
  const d = SLA_DEFAULTS[priority] || SLA_DEFAULTS.Medium;
  return {
    responseHours: ticketResponseHours && ticketResponseHours > 0 ? Number(ticketResponseHours) : d.responseHours,
    resolutionHours: ticketResolutionHours && ticketResolutionHours > 0 ? Number(ticketResolutionHours) : d.resolutionHours,
    fromTicket: !!(ticketResponseHours || ticketResolutionHours),
  };
}

// Hours of SLA time between `from` and `to`, leaving out time spent in pause stages.
// `transitions` are the stage changes in time order (the first is the "Logged" entry).
export function slaHours(from: Date, to: Date, transitions: Transition[]): number {
  if (to.getTime() <= from.getTime()) return 0;
  let paused = 0;
  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    if (!SLA_PAUSE_STAGES.includes(t.toStage)) continue;
    const start = Math.max(t.at.getTime(), from.getTime());
    const end = Math.min(transitions[i + 1] ? transitions[i + 1].at.getTime() : to.getTime(), to.getTime());
    if (end > start) paused += end - start;
  }
  return Math.max(0, (to.getTime() - from.getTime() - paused) / HOUR);
}

export type SlaState = 'met' | 'breached' | 'within' | 'n/a';

export interface IssueSlaInput {
  loggedAt: Date;
  stage: string;
  priority: string;
  closedAt: Date | null;
  transitions: Transition[]; // time-ordered, includes the initial Logged entry
  ticketResponseHours?: number | null;
  ticketResolutionHours?: number | null;
}

export interface IssueSla {
  responseTarget: number;
  resolutionTarget: number;
  respondedAt: Date | null;
  responseHours: number | null; // hours to the first action (or hours waiting so far)
  responseState: SlaState;
  resolvedAt: Date | null;
  resolutionHours: number | null; // SLA hours to deployment (or SLA hours so far)
  resolutionState: SlaState;
  closedAt: Date | null;
  daysToClose: number | null;
  daysOpen: number; // calendar days since logged (to close, or to now)
}

export function evaluateIssue(i: IssueSlaInput, now: Date = new Date()): IssueSla {
  const t = slaTargets(i.priority, i.ticketResponseHours, i.ticketResolutionHours);
  const cancelled = i.stage === 'Cancelled';
  const first = (pred: (x: Transition) => boolean) => i.transitions.find(pred)?.at ?? null;

  // First response: the first move away from "Logged".
  const respondedAt = i.transitions.find((x, idx) => idx > 0 && x.toStage !== 'Logged')?.at ?? null;
  // Resolution: the first time it was deployed to production.
  const resolvedAt = first((x) => x.toStage === RESOLVED_STAGE);
  const end = (when: Date | null) => when ?? (i.closedAt && cancelled ? i.closedAt : now);

  let responseState: SlaState = 'n/a';
  let responseHours: number | null = null;
  if (!cancelled || respondedAt) {
    responseHours = slaHours(i.loggedAt, end(respondedAt), i.transitions);
    responseState = respondedAt ? (responseHours <= t.responseHours ? 'met' : 'breached') : responseHours > t.responseHours ? 'breached' : 'within';
  }

  let resolutionState: SlaState = 'n/a';
  let resolutionHours: number | null = null;
  if (!cancelled || resolvedAt) {
    resolutionHours = slaHours(i.loggedAt, end(resolvedAt), i.transitions);
    resolutionState = resolvedAt ? (resolutionHours <= t.resolutionHours ? 'met' : 'breached') : resolutionHours > t.resolutionHours ? 'breached' : 'within';
  }

  const stop = i.closedAt ?? now;
  return {
    responseTarget: t.responseHours, resolutionTarget: t.resolutionHours,
    respondedAt, responseHours: responseHours === null ? null : round(responseHours), responseState,
    resolvedAt, resolutionHours: resolutionHours === null ? null : round(resolutionHours), resolutionState,
    closedAt: i.closedAt && !cancelled ? i.closedAt : null,
    daysToClose: i.closedAt && !cancelled ? round((i.closedAt.getTime() - i.loggedAt.getTime()) / 86_400_000) : null,
    daysOpen: round(Math.max(0, stop.getTime() - i.loggedAt.getTime()) / 86_400_000),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const avg = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export interface SlaRowLike { response: SlaState; resolution: SlaState; responseHours: number | null; resolutionHours: number | null; daysToClose: number | null }

// Headline numbers for a set of issues. "% within SLA" counts only issues whose clock has
// finished or already breached (still-running issues that are within target are not judged yet).
export function summariseSla(rows: SlaRowLike[]) {
  const judged = (s: SlaState) => s === 'met' || s === 'breached';
  const respJ = rows.filter((r) => judged(r.response));
  const resJ = rows.filter((r) => judged(r.resolution));
  const pct = (met: number, of: number) => (of ? Math.round((met / of) * 1000) / 10 : null);
  return {
    issues: rows.length,
    response: {
      avgHours: avg(rows.filter((r) => r.response === 'met' || (r.responseHours !== null && r.response === 'breached')).map((r) => r.responseHours as number)),
      medianHours: median(rows.filter((r) => r.responseHours !== null).map((r) => r.responseHours as number)),
      met: respJ.filter((r) => r.response === 'met').length, breached: respJ.filter((r) => r.response === 'breached').length,
      pctWithinSla: pct(respJ.filter((r) => r.response === 'met').length, respJ.length),
    },
    resolution: {
      avgHours: avg(rows.filter((r) => r.resolutionHours !== null).map((r) => r.resolutionHours as number)),
      medianHours: median(rows.filter((r) => r.resolutionHours !== null).map((r) => r.resolutionHours as number)),
      met: resJ.filter((r) => r.resolution === 'met').length, breached: resJ.filter((r) => r.resolution === 'breached').length,
      pctWithinSla: pct(resJ.filter((r) => r.resolution === 'met').length, resJ.length),
    },
    avgDaysToClose: avg(rows.filter((r) => r.daysToClose !== null).map((r) => r.daysToClose as number)),
    closedCount: rows.filter((r) => r.daysToClose !== null).length,
  };
}
