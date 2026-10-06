import { SALES_STRATEGY, SalesStrategy } from '../utils/salesStrategy';

// Pure scoring engine: no database access, `now` is injected, so every rule can
// be unit-tested with plain objects. salesHealth.service.ts loads the data.

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type HealthStatus = 'on-track' | 'at-risk' | 'derailed' | 'no-pipeline';

export interface HealthFlag {
  code: string;
  severity: Severity;
  category: 'followup' | 'engagement' | 'stage' | 'coverage' | 'conversion';
  title: string;
  detail: string;
  action: string; // what the owner should do about it
}

export interface AccountInput {
  id: string;
  name: string;
  tier: string | null;
  type: string;
  ownerId: string | null;
  ownerName: string;
  createdAt: Date;
  stakeholderRoles: string[]; // roles already mapped (name present)
  leads: { id: string; status: string; createdAt: Date; updatedAt: Date }[];
  opps: {
    id: string;
    name: string;
    stage: string;
    status: string;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
    forecastedCloseDate: Date | null;
  }[];
  // Completed customer touches (calls, emails, meetings, tasks) and visits.
  touches: Date[];
  // Open (not completed) activities that carry a due date.
  openDueDates: Date[];
  visits: { date: Date; followups: { date: Date; completed: boolean }[] }[];
}

export interface AccountHealth {
  accountId: string;
  accountName: string;
  tier: string | null;
  ownerId: string | null;
  ownerName: string;
  status: HealthStatus;
  score: number;
  flags: HealthFlag[];
  lastTouchAt: string | null;
  daysSinceTouch: number | null;
  openLeads: number;
  openOpportunities: number;
  pipelineValue: number;
  overdueFollowups: number;
  followupCompletion: number | null; // 0..1, null when too few have fallen due
  nextAction: string;
}

const DAY = 86_400_000;
const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const EARLY_STAGES = ['Qualification', 'Demonstration'];
const STAGE_ORDER = ['Qualification', 'Demonstration', 'Proposal', 'Negotiation'];

const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function analyseAccount(
  a: AccountInput,
  now: Date = new Date(),
  S: SalesStrategy = SALES_STRATEGY
): AccountHealth {
  const flags: HealthFlag[] = [];
  const add = (f: HealthFlag) => flags.push(f);

  const openLeads = a.leads.filter((l) => l.status === 'Open' || l.status === 'Qualified');
  const openOpps = a.opps.filter((o) => o.status === 'Open');
  const hasLivePipeline = openLeads.length > 0 || openOpps.length > 0;

  // ---- Touch history -------------------------------------------------------
  const touchTimes = [...a.touches, ...a.visits.map((v) => v.date)]
    .filter((d) => d.getTime() <= now.getTime())
    .sort((x, y) => y.getTime() - x.getTime());
  const lastTouch = touchTimes[0] || null;
  const daysSinceTouch = lastTouch ? daysBetween(lastTouch, now) : null;
  const accountAge = daysBetween(a.createdAt, now);

  // ---- Follow-up discipline -----------------------------------------------
  // Everything that was promised to happen by a date: activity due dates plus
  // the follow-ups scheduled on sales visits.
  const dueItems: { date: Date; completed: boolean }[] = [
    ...a.openDueDates.map((d) => ({ date: d, completed: false })),
    ...a.visits.flatMap((v) => v.followups),
  ];
  const overdue = dueItems.filter((i) => !i.completed && i.date.getTime() < now.getTime());
  const overdueFollowups = overdue.length;
  const maxOverdueDays = overdue.reduce((m, i) => Math.max(m, daysBetween(i.date, now)), 0);
  if (overdueFollowups > 0) {
    const sev: Severity =
      maxOverdueDays >= S.overdueFollowupCriticalDays
        ? 'critical'
        : maxOverdueDays >= S.overdueFollowupHighDays
          ? 'high'
          : 'medium';
    add({
      code: 'OVERDUE_FOLLOWUP',
      severity: sev,
      category: 'followup',
      title: `${plural(overdueFollowups, 'follow-up')} overdue`,
      detail: `The oldest is ${plural(maxOverdueDays, 'day')} past due and still open.`,
      action: 'Complete or reschedule the overdue follow-ups today.',
    });
  }

  const fallenDue = dueItems.filter((i) => i.date.getTime() < now.getTime());
  const followupCompletion =
    fallenDue.length >= S.followupCompletionMinSample
      ? fallenDue.filter((i) => i.completed).length / fallenDue.length
      : null;
  if (followupCompletion !== null && followupCompletion < S.followupCompletionMin) {
    add({
      code: 'LOW_FOLLOWUP_COMPLETION',
      severity: 'high',
      category: 'followup',
      title: 'Follow-ups are not being closed out',
      detail: `Only ${Math.round(followupCompletion * 100)}% of ${fallenDue.length} follow-ups that fell due were completed (target ${Math.round(S.followupCompletionMin * 100)}%).`,
      action: 'Review the follow-up backlog with the owner and clear it.',
    });
  }

  const unfollowedVisits = a.visits.filter((v) => {
    const age = daysBetween(v.date, now);
    return age > S.visitFollowupGraceDays && age <= S.visitFollowupLookbackDays && v.followups.length === 0;
  });
  if (unfollowedVisits.length > 0) {
    add({
      code: 'VISIT_NO_FOLLOWUP',
      severity: 'medium',
      category: 'followup',
      title: `${plural(unfollowedVisits.length, 'visit')} with no follow-up planned`,
      detail: `Visits older than ${plural(S.visitFollowupGraceDays, 'day')} should have a follow-up recorded.`,
      action: 'Record the next step for each visit.',
    });
  }

  // ---- Engagement cadence -------------------------------------------------
  if (hasLivePipeline) {
    const cadence = S.tierTouchCadenceDays[a.tier || ''] ?? S.defaultTouchCadenceDays;
    if (!lastTouch) {
      if (accountAge > S.firstTouchGraceDays) {
        add({
          code: 'NO_TOUCH_EVER',
          severity: accountAge > S.firstTouchGraceDays * 2 ? 'critical' : 'high',
          category: 'engagement',
          title: 'No customer contact recorded',
          detail: `Live pipeline on an account ${plural(accountAge, 'day')} old with no call, email, meeting or visit logged.`,
          action: 'Make first contact and log it.',
        });
      }
    } else if (daysSinceTouch! > cadence) {
      const sev: Severity = daysSinceTouch! > cadence * 3 ? 'critical' : daysSinceTouch! > cadence * 2 ? 'high' : 'medium';
      add({
        code: 'TOUCH_GAP',
        severity: sev,
        category: 'engagement',
        title: `Gone quiet for ${plural(daysSinceTouch!, 'day')}`,
        detail: `${a.tier || 'Untiered'} accounts should be touched every ${plural(cadence, 'day')}; last contact was ${plural(daysSinceTouch!, 'day')} ago.`,
        action: 'Re-engage the account and log the contact.',
      });
    }
  }

  // ---- Leads --------------------------------------------------------------
  for (const lead of openLeads) {
    const age = daysBetween(lead.createdAt, now);
    const touchedSince = touchTimes.some((t) => t.getTime() >= lead.createdAt.getTime());
    if (lead.status === 'Open' && !touchedSince && age > S.leadFirstActionDays) {
      add({
        code: 'LEAD_UNTOUCHED',
        severity: age > S.leadFirstActionDays * 3 ? 'high' : 'medium',
        category: 'conversion',
        title: 'Lead never actioned',
        detail: `Lead created ${plural(age, 'day')} ago with no contact since (target: ${plural(S.leadFirstActionDays, 'day')}).`,
        action: 'Contact the lead and qualify or disqualify it.',
      });
    }
    if (age > S.leadToOpportunityDays) {
      add({
        code: 'LEAD_STALE',
        severity: 'medium',
        category: 'conversion',
        title: 'Lead not progressing',
        detail: `Open for ${plural(age, 'day')} without converting to an opportunity (target: ${plural(S.leadToOpportunityDays, 'day')}).`,
        action: 'Convert it to an opportunity or close it out.',
      });
    }
  }

  // ---- Prospects with no pipeline ----------------------------------------
  if (a.type === 'Prospect' && a.leads.length === 0 && a.opps.length === 0 && accountAge > S.accountToLeadDays) {
    add({
      code: 'ACCOUNT_NO_LEAD',
      severity: 'low',
      category: 'conversion',
      title: 'Prospect with no lead',
      detail: `Added ${plural(accountAge, 'day')} ago and still has no lead (target: ${plural(S.accountToLeadDays, 'day')}).`,
      action: 'Create a lead or mark the account inactive.',
    });
  }

  // ---- Opportunities ------------------------------------------------------
  const rolesHave = new Set(a.stakeholderRoles);
  for (const opp of openOpps) {
    const sinceUpdate = daysBetween(opp.updatedAt, now);
    const maxDays = S.stageMaxDays[opp.stage];
    if (maxDays !== undefined && sinceUpdate > maxDays) {
      add({
        code: 'OPP_STALLED',
        severity: sinceUpdate > maxDays * 2 ? 'high' : 'medium',
        category: 'stage',
        title: `"${opp.name}" stalled in ${opp.stage}`,
        detail: `No update for ${plural(sinceUpdate, 'day')}; ${opp.stage} should move within ${plural(maxDays, 'day')}.`,
        action: 'Advance the deal, or close it as lost.',
      });
    }
    const age = daysBetween(opp.createdAt, now);
    if (age > S.opportunityCycleDays) {
      add({
        code: 'OPP_SLOW_CYCLE',
        severity: 'medium',
        category: 'stage',
        title: `"${opp.name}" is taking too long`,
        detail: `Open for ${plural(age, 'day')} against a ${S.opportunityCycleDays}-day target cycle.`,
        action: 'Agree a decision date with the customer.',
      });
    }
    if (opp.forecastedCloseDate) {
      const toClose = daysBetween(now, opp.forecastedCloseDate);
      if (toClose < 0) {
        add({
          code: 'OPP_CLOSE_DATE_PASSED',
          severity: -toClose > S.closeDateWarnDays ? 'critical' : 'high',
          category: 'stage',
          title: `"${opp.name}" is past its close date`,
          detail: `Forecast close was ${plural(-toClose, 'day')} ago and the deal is still open.`,
          action: 'Update the close date to a real one, or close the deal.',
        });
      } else if (toClose <= S.closeDateWarnDays && EARLY_STAGES.includes(opp.stage)) {
        add({
          code: 'OPP_CLOSE_SOON_EARLY_STAGE',
          severity: 'medium',
          category: 'stage',
          title: `"${opp.name}" closes soon but is still in ${opp.stage}`,
          detail: `Forecast to close in ${plural(toClose, 'day')} yet it has not reached Proposal.`,
          action: 'Re-forecast the close date or accelerate the deal.',
        });
      }
    }
    // Stakeholder coverage vs how far the deal has progressed.
    const required = S.requiredRolesByStage[opp.stage] || [];
    const missing = required.filter((r) => !rolesHave.has(r));
    if (missing.length > 0) {
      add({
        code: 'MISSING_STAKEHOLDER',
        severity: 'high',
        category: 'coverage',
        title: `"${opp.name}" is in ${opp.stage} without ${missing.join(' / ')}`,
        detail: `A deal at ${opp.stage} needs the buying committee mapped: ${missing.join(', ')} not identified.`,
        action: 'Identify and add the missing roles to the buying committee.',
      });
    } else if (
      STAGE_ORDER.indexOf(opp.stage) >= STAGE_ORDER.indexOf(S.championFromStage) &&
      !rolesHave.has('Champion')
    ) {
      add({
        code: 'NO_CHAMPION',
        severity: 'medium',
        category: 'coverage',
        title: `"${opp.name}" has no Champion`,
        detail: `Deals at ${opp.stage} or later should have an internal Champion.`,
        action: 'Identify an internal champion.',
      });
    }
  }

  // ---- Score & status -----------------------------------------------------
  flags.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
  const penalty = flags.reduce((sum, f) => sum + S.scorePenalty[f.severity], 0);
  const score = Math.max(0, 100 - penalty);
  const hasCritical = flags.some((f) => f.severity === 'critical');
  const hasHigh = flags.some((f) => f.severity === 'high');

  let status: HealthStatus;
  if (!hasLivePipeline && !hasCritical && !hasHigh) {
    status = 'no-pipeline';
  } else if (hasCritical || score < S.statusThresholds.atRiskMinScore) {
    status = 'derailed';
  } else if (hasHigh || score < S.statusThresholds.onTrackMinScore) {
    status = 'at-risk';
  } else {
    status = 'on-track';
  }

  return {
    accountId: a.id,
    accountName: a.name,
    tier: a.tier,
    ownerId: a.ownerId,
    ownerName: a.ownerName,
    status,
    score,
    flags,
    lastTouchAt: lastTouch ? lastTouch.toISOString() : null,
    daysSinceTouch,
    openLeads: openLeads.length,
    openOpportunities: openOpps.length,
    pipelineValue: openOpps.reduce((s, o) => s + Number(o.amount || 0), 0),
    overdueFollowups,
    followupCompletion,
    nextAction: flags[0]?.action || (status === 'on-track' ? 'Keep to the current cadence.' : 'No action needed.'),
  };
}

export interface HealthSummary {
  total: number;
  byStatus: Record<HealthStatus, number>;
  avgScore: number;
  pipelineAtRisk: number; // open pipeline value on at-risk + derailed accounts
  pipelineTotal: number;
  flagsBySeverity: Record<Severity, number>;
  flagsByCode: { code: string; title: string; severity: Severity; category: string; accounts: number }[];
  byOwner: {
    ownerId: string | null;
    ownerName: string;
    accounts: number;
    onTrack: number;
    atRisk: number;
    derailed: number;
    avgScore: number;
    overdueFollowups: number;
    criticalFlags: number;
  }[];
  byTier: { tier: string; accounts: number; onTrack: number; atRisk: number; derailed: number }[];
}

// Generic label per flag code (flag titles are per-account, so the roll-up uses these).
export const FLAG_LABELS: Record<string, { title: string; category: string }> = {
  OVERDUE_FOLLOWUP: { title: 'Overdue follow-ups', category: 'followup' },
  LOW_FOLLOWUP_COMPLETION: { title: 'Low follow-up completion', category: 'followup' },
  VISIT_NO_FOLLOWUP: { title: 'Visits with no follow-up', category: 'followup' },
  NO_TOUCH_EVER: { title: 'No customer contact ever', category: 'engagement' },
  TOUCH_GAP: { title: 'Touch cadence broken', category: 'engagement' },
  LEAD_UNTOUCHED: { title: 'Leads never actioned', category: 'conversion' },
  LEAD_STALE: { title: 'Leads not progressing', category: 'conversion' },
  ACCOUNT_NO_LEAD: { title: 'Prospects with no lead', category: 'conversion' },
  OPP_STALLED: { title: 'Opportunities stalled in stage', category: 'stage' },
  OPP_SLOW_CYCLE: { title: 'Opportunities past target cycle', category: 'stage' },
  OPP_CLOSE_DATE_PASSED: { title: 'Close date passed', category: 'stage' },
  OPP_CLOSE_SOON_EARLY_STAGE: { title: 'Closing soon but early stage', category: 'stage' },
  MISSING_STAKEHOLDER: { title: 'Buying committee gaps at late stage', category: 'coverage' },
  NO_CHAMPION: { title: 'No Champion', category: 'coverage' },
};

export function summarise(results: AccountHealth[]): HealthSummary {
  const byStatus: Record<HealthStatus, number> = { 'on-track': 0, 'at-risk': 0, derailed: 0, 'no-pipeline': 0 };
  const flagsBySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const codes = new Map<string, { severity: Severity; accounts: number }>();
  const owners = new Map<string, HealthSummary['byOwner'][number] & { scoreSum: number; live: number }>();
  const tiers = new Map<string, HealthSummary['byTier'][number]>();
  let scoreSum = 0;
  let liveCount = 0; // health scores only mean something for accounts with pipeline
  let pipelineAtRisk = 0;
  let pipelineTotal = 0;

  for (const r of results) {
    byStatus[r.status]++;
    if (r.status !== 'no-pipeline') {
      scoreSum += r.score;
      liveCount++;
    }
    pipelineTotal += r.pipelineValue;
    if (r.status === 'at-risk' || r.status === 'derailed') pipelineAtRisk += r.pipelineValue;

    for (const f of r.flags) {
      flagsBySeverity[f.severity]++;
    }
    for (const code of new Set(r.flags.map((f) => f.code))) {
      const worst = r.flags.filter((f) => f.code === code).sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity])[0];
      const cur = codes.get(code);
      if (!cur) codes.set(code, { severity: worst.severity, accounts: 1 });
      else {
        cur.accounts++;
        if (SEVERITY_ORDER[worst.severity] < SEVERITY_ORDER[cur.severity]) cur.severity = worst.severity;
      }
    }

    const ok = r.ownerId || 'unassigned';
    let o = owners.get(ok);
    if (!o) {
      o = {
        ownerId: r.ownerId, ownerName: r.ownerName || 'Unassigned', accounts: 0,
        onTrack: 0, atRisk: 0, derailed: 0, avgScore: 0, overdueFollowups: 0, criticalFlags: 0, scoreSum: 0, live: 0,
      };
      owners.set(ok, o);
    }
    o.accounts++;
    if (r.status !== 'no-pipeline') {
      o.scoreSum += r.score;
      o.live++;
    }
    o.overdueFollowups += r.overdueFollowups;
    o.criticalFlags += r.flags.filter((f) => f.severity === 'critical').length;
    if (r.status === 'on-track') o.onTrack++;
    else if (r.status === 'at-risk') o.atRisk++;
    else if (r.status === 'derailed') o.derailed++;

    const tk = r.tier || 'Untiered';
    let t = tiers.get(tk);
    if (!t) {
      t = { tier: tk, accounts: 0, onTrack: 0, atRisk: 0, derailed: 0 };
      tiers.set(tk, t);
    }
    t.accounts++;
    if (r.status === 'on-track') t.onTrack++;
    else if (r.status === 'at-risk') t.atRisk++;
    else if (r.status === 'derailed') t.derailed++;
  }

  return {
    total: results.length,
    byStatus,
    avgScore: liveCount ? Math.round(scoreSum / liveCount) : 0,
    pipelineAtRisk,
    pipelineTotal,
    flagsBySeverity,
    flagsByCode: [...codes.entries()]
      .map(([code, v]) => ({
        code,
        title: FLAG_LABELS[code]?.title || code,
        category: FLAG_LABELS[code]?.category || 'other',
        severity: v.severity,
        accounts: v.accounts,
      }))
      .sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity] || y.accounts - x.accounts),
    byOwner: [...owners.values()]
      .map(({ scoreSum: sum, live, ...o }) => ({ ...o, avgScore: live ? Math.round(sum / live) : 0 }))
      .sort((x, y) => y.derailed - x.derailed || y.atRisk - x.atRisk),
    byTier: [...tiers.values()].sort((x, y) => x.tier.localeCompare(y.tier)),
  };
}
