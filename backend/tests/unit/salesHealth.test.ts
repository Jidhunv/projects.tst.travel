import { analyseAccount, summarise, AccountInput } from '../../src/services/salesHealth.engine';

const NOW = new Date('2026-06-30T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => daysAgo(-n);

const base = (over: Partial<AccountInput> = {}): AccountInput => ({
  id: 'a1', name: 'Acme', tier: 'T1', type: 'Prospect', ownerId: 'u1', ownerName: 'Ann Owner',
  createdAt: daysAgo(200),
  stakeholderRoles: ['Champion', 'Decision Maker', 'Economic Buyer'],
  leads: [], opps: [], touches: [], openDueDates: [], visits: [],
  ...over,
});
const opp = (over = {}) => ({
  id: 'o1', name: 'Deal', stage: 'Proposal', status: 'Open', amount: 1000,
  createdAt: daysAgo(20), updatedAt: daysAgo(2), forecastedCloseDate: daysAhead(40), ...over,
});
const codes = (r: ReturnType<typeof analyseAccount>) => r.flags.map((f) => f.code);

describe('sales health engine', () => {
  it('a recently-touched account with a healthy deal is on track at 100', () => {
    const r = analyseAccount(base({ opps: [opp()], touches: [daysAgo(3)] }), NOW);
    expect(r.flags).toEqual([]);
    expect(r.status).toBe('on-track');
    expect(r.score).toBe(100);
  });

  it('flags a broken touch cadence by tier and escalates severity', () => {
    const mk = (days: number, tier = 'T1') =>
      analyseAccount(base({ tier, opps: [opp()], touches: [daysAgo(days)] }), NOW).flags.find((f) => f.code === 'TOUCH_GAP');
    expect(mk(5)).toBeUndefined();
    expect(mk(10)?.severity).toBe('medium'); // T1 cadence 7
    expect(mk(20)?.severity).toBe('high'); // > 2x
    expect(mk(30)?.severity).toBe('critical'); // > 3x
    expect(mk(10, 'T4')).toBeUndefined(); // T4 cadence 30
  });

  it('flags live pipeline with no contact ever', () => {
    const r = analyseAccount(base({ opps: [opp()] }), NOW);
    expect(codes(r)).toContain('NO_TOUCH_EVER');
    expect(r.status).toBe('derailed');
  });

  it('does not demand cadence on an account with no live pipeline', () => {
    const r = analyseAccount(base({ type: 'Customer', opps: [opp({ status: 'Won' })], touches: [daysAgo(300)] }), NOW);
    expect(codes(r)).not.toContain('TOUCH_GAP');
    expect(r.status).toBe('no-pipeline');
  });

  it('rates overdue follow-ups by how late they are, including visit follow-ups', () => {
    const sev = (d: number) =>
      analyseAccount(base({ opps: [opp()], touches: [daysAgo(1)], openDueDates: [daysAgo(d)] }), NOW)
        .flags.find((f) => f.code === 'OVERDUE_FOLLOWUP')?.severity;
    expect(sev(1)).toBe('medium');
    expect(sev(4)).toBe('high');
    expect(sev(9)).toBe('critical');
    const v = analyseAccount(
      base({ opps: [opp()], touches: [daysAgo(1)], visits: [{ date: daysAgo(20), followups: [{ date: daysAgo(10), completed: false }] }] }),
      NOW
    );
    expect(v.overdueFollowups).toBe(1);
    expect(codes(v)).toContain('OVERDUE_FOLLOWUP');
  });

  it('ignores follow-ups that are not yet due or already completed', () => {
    const r = analyseAccount(
      base({ opps: [opp()], touches: [daysAgo(1)], openDueDates: [daysAhead(2)],
        visits: [{ date: daysAgo(10), followups: [{ date: daysAgo(5), completed: true }] }] }),
      NOW
    );
    expect(r.overdueFollowups).toBe(0);
  });

  it('flags low follow-up completion only with enough samples', () => {
    const f = (d: number, completed: boolean) => ({ date: daysAgo(d), completed });
    const few = analyseAccount(base({ opps: [opp()], touches: [daysAgo(1)], visits: [{ date: daysAgo(30), followups: [f(9, false), f(8, false)] }] }), NOW);
    expect(few.followupCompletion).toBeNull();
    const many = analyseAccount(base({ opps: [opp()], touches: [daysAgo(1)], visits: [{ date: daysAgo(30), followups: [f(9, true), f(8, false), f(7, false), f(6, false)] }] }), NOW);
    expect(many.followupCompletion).toBe(0.25);
    expect(codes(many)).toContain('LOW_FOLLOWUP_COMPLETION');
  });

  it('flags visits with no follow-up inside the lookback window only', () => {
    const r = (age: number) =>
      codes(analyseAccount(base({ opps: [opp()], touches: [daysAgo(1)], visits: [{ date: daysAgo(age), followups: [] }] }), NOW));
    expect(r(2)).not.toContain('VISIT_NO_FOLLOWUP'); // inside grace
    expect(r(10)).toContain('VISIT_NO_FOLLOWUP');
    expect(r(200)).not.toContain('VISIT_NO_FOLLOWUP'); // too old to chase
  });

  it('flags stalled, slow and overdue-close opportunities', () => {
    const r = analyseAccount(
      base({ touches: [daysAgo(1)], opps: [opp({ stage: 'Proposal', updatedAt: daysAgo(50), createdAt: daysAgo(120), forecastedCloseDate: daysAgo(30) })] }),
      NOW
    );
    expect(codes(r)).toEqual(expect.arrayContaining(['OPP_STALLED', 'OPP_SLOW_CYCLE', 'OPP_CLOSE_DATE_PASSED']));
    expect(r.flags.find((f) => f.code === 'OPP_CLOSE_DATE_PASSED')?.severity).toBe('critical');
    expect(r.status).toBe('derailed');
  });

  it('flags missing buying-committee roles at late stages', () => {
    const r = analyseAccount(base({ touches: [daysAgo(1)], stakeholderRoles: ['Champion'], opps: [opp({ stage: 'Negotiation' })] }), NOW);
    const f = r.flags.find((x) => x.code === 'MISSING_STAKEHOLDER');
    expect(f?.severity).toBe('high');
    expect(f?.title).toContain('Decision Maker');
    expect(r.status).toBe('at-risk');
  });

  it('wants a Champion from Demonstration onwards, not in Qualification', () => {
    const at = (stage: string) =>
      codes(analyseAccount(base({ touches: [daysAgo(1)], stakeholderRoles: [], opps: [opp({ stage })] }), NOW));
    expect(at('Qualification')).not.toContain('NO_CHAMPION');
    expect(at('Demonstration')).toContain('NO_CHAMPION');
  });

  it('flags untouched and stale leads, and prospects that never produced a lead', () => {
    const lead = analyseAccount(base({ leads: [{ id: 'l', status: 'Open', createdAt: daysAgo(40), updatedAt: daysAgo(40) }] }), NOW);
    expect(codes(lead)).toEqual(expect.arrayContaining(['LEAD_UNTOUCHED', 'LEAD_STALE']));
    const none = analyseAccount(base({ createdAt: daysAgo(60) }), NOW);
    expect(codes(none)).toEqual(['ACCOUNT_NO_LEAD']);
    expect(none.status).toBe('no-pipeline');
  });

  it('does not treat a touch before the lead existed as actioning it', () => {
    const r = analyseAccount(base({ touches: [daysAgo(30)], leads: [{ id: 'l', status: 'Open', createdAt: daysAgo(10), updatedAt: daysAgo(10) }] }), NOW);
    expect(codes(r)).toContain('LEAD_UNTOUCHED');
  });

  it('score never goes below zero and flags sort worst first', () => {
    const r = analyseAccount(
      base({ stakeholderRoles: [], leads: [{ id: 'l', status: 'Open', createdAt: daysAgo(90), updatedAt: daysAgo(90) }],
        opps: [opp({ stage: 'Negotiation', updatedAt: daysAgo(90), createdAt: daysAgo(200), forecastedCloseDate: daysAgo(60) })],
        openDueDates: [daysAgo(30)] }),
      NOW
    );
    expect(r.score).toBe(0);
    const order = ['critical', 'high', 'medium', 'low'];
    const ranks = r.flags.map((f) => order.indexOf(f.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('summarise rolls up status, owners and pipeline at risk', () => {
    const good = analyseAccount(base({ id: 'g', opps: [opp({ amount: 500 })], touches: [daysAgo(1)] }), NOW);
    const bad = analyseAccount(base({ id: 'b', ownerId: 'u2', ownerName: 'Bob', opps: [opp({ amount: 900 })] }), NOW);
    const s = summarise([good, bad]);
    expect(s.byStatus).toMatchObject({ 'on-track': 1, derailed: 1 });
    expect(s.pipelineTotal).toBe(1400);
    expect(s.pipelineAtRisk).toBe(900);
    expect(s.byOwner[0].ownerName).toBe('Bob'); // worst owner first
    expect(s.flagsByCode.some((c) => c.code === 'NO_TOUCH_EVER' && c.accounts === 1)).toBe(true);
  });
});
