import { kpiMet, weightedScore, KpiReportRow } from '../../src/utils/kpiReport';

const row = (over: Partial<KpiReportRow>): KpiReportRow => ({
  type: 'number', total: 0, entries: 0, target: null, weightage: null, pctOfTarget: null, met: null, ...over,
});

describe('kpiMet', () => {
  it('number: done when the total reaches the target', () => {
    expect(kpiMet(row({ total: 12, target: 10 }))).toBe(true);
    expect(kpiMet(row({ total: 9, target: 10 }))).toBe(false);
  });

  it('yes/no with a target: done when enough "yes" answers', () => {
    expect(kpiMet(row({ type: 'yes_no', total: 3, target: 3 }))).toBe(true);
    expect(kpiMet(row({ type: 'yes_no', total: 2, target: 3 }))).toBe(false);
  });

  it('yes/no without a target: done once there is any "yes"', () => {
    expect(kpiMet(row({ type: 'yes_no', total: 1 }))).toBe(true);
    expect(kpiMet(row({ type: 'yes_no', total: 0 }))).toBe(false);
  });

  it('text: done when answers reach the target, or any answer when no target', () => {
    expect(kpiMet(row({ type: 'text', entries: 2, target: 2 }))).toBe(true);
    expect(kpiMet(row({ type: 'text', entries: 1 }))).toBe(true);
    expect(kpiMet(row({ type: 'text', entries: 0 }))).toBe(false);
  });

  it('plain number with no target has no done/not-done answer', () => {
    expect(kpiMet(row({ total: 50 }))).toBeNull();
  });
});

describe('weightedScore', () => {
  it('weights each KPI by its percentage, with the achievement capped at 100', () => {
    const r = weightedScore([
      row({ weightage: 60, pctOfTarget: 50 }), // earns 30
      row({ weightage: 40, pctOfTarget: 150 }), // capped at 100%, earns 40
    ]);
    expect(r).toEqual({ weightTotal: 100, weightedScore: 70, scorePct: 70 });
  });

  it('leaves out KPIs with no weight and reports the total weight', () => {
    const r = weightedScore([
      row({ weightage: 50, pctOfTarget: 100 }),
      row({ weightage: null, pctOfTarget: 0 }),
    ]);
    expect(r.weightTotal).toBe(50);
    expect(r.weightedScore).toBe(50);
  });

  it('gives no score when nothing weighted has a target yet', () => {
    expect(weightedScore([row({ weightage: 50, pctOfTarget: null })])).toEqual({
      weightTotal: 50, weightedScore: null, scorePct: null,
    });
  });

  it('scores a KPI with no target by whether it was done: yes/no done counts as 100', () => {
    const r = weightedScore([
      row({ type: 'yes_no', weightage: 40, met: true }),
      row({ type: 'yes_no', weightage: 60, met: false }),
    ]);
    expect(r).toEqual({ weightTotal: 100, weightedScore: 40, scorePct: 40 });
  });

  it('reports a total below 100 so the admin can see weights are unfinished', () => {
    expect(weightedScore([row({ weightage: 30, pctOfTarget: 100 })]).weightTotal).toBe(30);
  });
});
