import { GLOBAL_BENCHMARKS, WORKWEEK } from '../utils/salesStrategy';

// Pure maths for target tracking; the service supplies the numbers.

const DAY = 86_400_000;
const utcDay = (s: string) => Date.parse(`${s}T00:00:00Z`);

export type PaceStatus = 'achieved' | 'ahead' | 'on-pace' | 'behind' | 'not-started' | 'ended-short';

export interface TargetProgress {
  achieved: number;
  target: number;
  pctComplete: number; // uncapped, e.g. 120 when exceeded
  remaining: number; // never negative
  totalDays: number;
  elapsedDays: number;
  daysLeft: number;
  elapsedPct: number; // share of the date range already used
  expectedByNow: number; // straight-line pace
  projectedFinal: number | null; // achieved extrapolated to the end date
  pace: PaceStatus;
}

export function targetProgress(
  achieved: number,
  target: number,
  startDate: string,
  endDate: string,
  now: Date = new Date()
): TargetProgress {
  const start = utcDay(startDate);
  const end = utcDay(endDate) + DAY; // end date is inclusive
  const totalDays = Math.max(1, Math.round((end - start) / DAY));
  const nowMs = now.getTime();
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((nowMs - start) / DAY)));
  const daysLeft = Math.max(0, totalDays - elapsedDays);
  const elapsedPct = (elapsedDays / totalDays) * 100;
  const expectedByNow = target * (elapsedDays / totalDays);
  const pctComplete = target > 0 ? (achieved / target) * 100 : 0;

  let pace: PaceStatus;
  if (target > 0 && achieved >= target) pace = 'achieved';
  else if (nowMs < start) pace = 'not-started';
  else if (nowMs >= end) pace = 'ended-short';
  else if (achieved >= expectedByNow * 1.1) pace = 'ahead';
  else if (achieved >= expectedByNow * 0.9) pace = 'on-pace';
  else pace = 'behind';

  return {
    achieved, target,
    pctComplete: round1(pctComplete),
    remaining: Math.max(0, target - achieved),
    totalDays, elapsedDays, daysLeft,
    elapsedPct: round1(elapsedPct),
    expectedByNow: Math.round(expectedByNow),
    projectedFinal: elapsedDays > 0 ? Math.round((achieved / elapsedDays) * totalDays) : null,
    pace,
  };
}

export interface PipelineSuggestion {
  remaining: number;
  winRateUsed: number;
  winRateSource: 'own history' | 'global benchmark';
  coverage: number;
  pipelineNeededByWinRate: number; // remaining / win rate
  pipelineNeededByCoverage: number; // remaining x coverage
  recommendedPipeline: number; // the larger of the two
  currentOpenPipeline: number; // open deals forecast to close inside the range
  newOpportunityValueNeeded: number; // gap to create
  newOpportunityValueIfAhead: number | null;
}

// "How much pipeline / new opportunity value do we need to still hit the target?"
// For a won-revenue target remaining value must come out of pipeline closing
// at the win rate; the larger of win-rate and coverage sizing is recommended.
export function suggestPipeline(
  remaining: number,
  currentOpenPipeline: number,
  ownWinRate: number | null
): PipelineSuggestion {
  const useOwn = ownWinRate !== null && ownWinRate > 0;
  const winRate = useOwn ? ownWinRate! : GLOBAL_BENCHMARKS.winRate;
  const byWin = remaining / winRate;
  const byCoverage = remaining * GLOBAL_BENCHMARKS.pipelineCoverage;
  const recommended = Math.max(byWin, byCoverage);
  return {
    remaining: Math.round(remaining),
    winRateUsed: round1(winRate * 100),
    winRateSource: useOwn ? 'own history' : 'global benchmark',
    coverage: GLOBAL_BENCHMARKS.pipelineCoverage,
    pipelineNeededByWinRate: Math.round(byWin),
    pipelineNeededByCoverage: Math.round(byCoverage),
    recommendedPipeline: Math.round(recommended),
    currentOpenPipeline: Math.round(currentOpenPipeline),
    newOpportunityValueNeeded: Math.round(Math.max(0, recommended - currentOpenPipeline)),
    newOpportunityValueIfAhead: null,
  };
}

// How many reporting periods fall in a date range, to scale a per-period KPI target.
export function periodsInRange(frequency: string, from: string, to: string): number {
  const days = Math.max(1, Math.round((utcDay(to) - utcDay(from)) / DAY) + 1);
  if (frequency === 'daily') return days;
  if (frequency === 'monthly') return Math.max(1, Math.round(days / 30.4375));
  return Math.max(1, Math.ceil(days / 7)); // weekly
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Calendar dates (YYYY-MM-DD) in [from, to] that are working days.
export function workdaysInRange(from: string, to: string, weekend: number[] = WORKWEEK.weekendDays): string[] {
  const out: string[] = [];
  for (let t = utcDay(from); t <= utcDay(to); t += DAY) {
    const d = new Date(t);
    if (!weekend.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// First day of the month containing `date` (YYYY-MM-DD) and of every month the range touches.
export function monthsInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(utcDay(to));
  let y = new Date(utcDay(from)).getUTCFullYear();
  let m = new Date(utcDay(from)).getUTCMonth();
  while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth())) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}-01`);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

// Daily-reporting compliance: of the working days that have fully passed, on how many did the person report?
export function reportingCompliance(workdays: string[], reportedDates: Set<string>, today: string) {
  const due = workdays.filter((d) => d < today);
  const missed = due.filter((d) => !reportedDates.has(d));
  return {
    workdays: workdays.length,
    dueDays: due.length,
    reportedDays: due.length - missed.length,
    missedDates: missed,
    todayPending: workdays.includes(today) && !reportedDates.has(today),
    pct: due.length ? Math.round(((due.length - missed.length) / due.length) * 1000) / 10 : null,
  };
}
