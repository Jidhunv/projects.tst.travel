// What "on the sales track" means, in one place.
//
// Every threshold the sales-cycle health analysis applies lives here. The whole
// object is returned with each API response so management can see exactly which
// rules a score was judged against, and retuning the strategy is a one-file
// change. Days are whole calendar days.

export const SALES_STRATEGY = {
  // Longest acceptable gap between customer touches on an account with live
  // pipeline, by tier. Top tiers get a tighter cadence.
  tierTouchCadenceDays: { T1: 7, T2: 14, T3: 21, T4: 30, T5: 45 } as Record<string, number>,
  defaultTouchCadenceDays: 30,

  // A new account with live pipeline should see its first touch within this.
  firstTouchGraceDays: 14,

  // Longest an open opportunity may sit in a stage without any update before
  // it counts as stalled. There is no stage-history table, so "time in stage"
  // is measured as days since the record was last updated.
  stageMaxDays: { Qualification: 14, Demonstration: 14, Proposal: 21, Negotiation: 21 } as Record<string, number>,

  leadFirstActionDays: 3, // an Open lead needs a first touch within this
  leadToOpportunityDays: 30, // an Open/Qualified lead should convert (or close) within this
  accountToLeadDays: 30, // an account worked as a prospect should yield a lead within this
  opportunityCycleDays: 90, // an open opportunity older than this is a slow cycle
  closeDateWarnDays: 14, // window before forecast close in which an early-stage deal is at risk

  // Follow-up discipline
  overdueFollowupHighDays: 3, // overdue by this many days -> high
  overdueFollowupCriticalDays: 7, // overdue by this many days -> critical
  visitFollowupGraceDays: 3, // a visit/call needs a follow-up recorded within this
  visitFollowupLookbackDays: 90, // how far back to look for visits with no follow-up
  followupCompletionMin: 0.5, // below this share of due follow-ups completed -> flag
  followupCompletionMinSample: 3, // ...but only once at least this many have fallen due

  // Stakeholder coverage: roles that must be mapped before a deal gets this far.
  requiredRolesByStage: {
    Proposal: ['Decision Maker', 'Economic Buyer'],
    Negotiation: ['Decision Maker', 'Economic Buyer'],
  } as Record<string, string[]>,
  championFromStage: 'Demonstration',

  // Score = 100 minus a penalty per red flag.
  scorePenalty: { critical: 30, high: 18, medium: 9, low: 4 },
  // Status bands for accounts with live pipeline. Any critical flag is derailed
  // and any high flag is at least at risk, whatever the score says.
  statusThresholds: { onTrackMinScore: 75, atRiskMinScore: 50 },
};

export type SalesStrategy = typeof SALES_STRATEGY;

// Industry rules of thumb used to size the pipeline needed to hit a target.
// They are starting points, not guarantees: the suggestion also shows the
// organisation's own trailing-year win rate once there are enough closed deals.
export const GLOBAL_BENCHMARKS = {
  winRate: 0.2, // typical B2B win rate by value is 15-30%
  pipelineCoverage: 3, // healthy pipelines hold 3-4x the target
  minClosedDealsForOwnWinRate: 10,
};

// Working week for daily-reporting compliance. 0 = Sunday ... 6 = Saturday.
// Defaults to a Friday/Saturday weekend; change here if the office differs.
export const WORKWEEK = { weekendDays: [5, 6] as number[] };
