import { targetProgress, suggestPipeline, periodsInRange } from '../../src/services/targets.engine';

const at = (s: string) => new Date(`${s}T12:00:00Z`);

describe('targetProgress', () => {
  it('measures completion, remaining and time elapsed', () => {
    const p = targetProgress(25_000, 100_000, '2026-01-01', '2026-01-10', at('2026-01-05'));
    expect(p.pctComplete).toBe(25);
    expect(p.remaining).toBe(75_000);
    expect(p.totalDays).toBe(10);
    expect(p.elapsedDays).toBe(5);
    expect(p.daysLeft).toBe(5);
    expect(p.expectedByNow).toBe(50_000);
    expect(p.projectedFinal).toBe(50_000);
    expect(p.pace).toBe('behind');
  });

  it('classifies pace against the straight-line expectation', () => {
    const mk = (a: number) => targetProgress(a, 100_000, '2026-01-01', '2026-01-10', at('2026-01-05')).pace;
    expect(mk(56_000)).toBe('ahead');
    expect(mk(48_000)).toBe('on-pace');
    expect(mk(20_000)).toBe('behind');
    expect(mk(100_000)).toBe('achieved');
  });

  it('handles targets that have not started or have ended', () => {
    expect(targetProgress(0, 1000, '2026-03-01', '2026-03-31', at('2026-02-01')).pace).toBe('not-started');
    expect(targetProgress(0, 1000, '2026-03-01', '2026-03-31', at('2026-02-01')).projectedFinal).toBeNull();
    const ended = targetProgress(400, 1000, '2026-01-01', '2026-01-31', at('2026-02-15'));
    expect(ended.pace).toBe('ended-short');
    expect(ended.daysLeft).toBe(0);
    expect(ended.elapsedPct).toBe(100);
  });

  it('treats the end date as inclusive and reports over-achievement uncapped', () => {
    expect(targetProgress(0, 1000, '2026-01-01', '2026-01-01', at('2026-01-01')).totalDays).toBe(1);
    const p = targetProgress(1500, 1000, '2026-01-01', '2026-01-31', at('2026-01-10'));
    expect(p.pctComplete).toBe(150);
    expect(p.remaining).toBe(0);
  });
});

describe('suggestPipeline', () => {
  it('uses the global benchmark when there is no trustworthy own win rate', () => {
    const s = suggestPipeline(100_000, 150_000, null);
    expect(s.winRateSource).toBe('global benchmark');
    expect(s.winRateUsed).toBe(20);
    expect(s.pipelineNeededByWinRate).toBe(500_000); // 100k / 0.20
    expect(s.pipelineNeededByCoverage).toBe(300_000); // 3x
    expect(s.recommendedPipeline).toBe(500_000);
    expect(s.newOpportunityValueNeeded).toBe(350_000);
  });

  it('prefers the own win rate and takes the larger of the two sizings', () => {
    const s = suggestPipeline(100_000, 0, 0.5);
    expect(s.winRateSource).toBe('own history');
    expect(s.pipelineNeededByWinRate).toBe(200_000);
    expect(s.recommendedPipeline).toBe(300_000); // coverage wins
  });

  it('never asks for negative new opportunity value', () => {
    expect(suggestPipeline(10_000, 1_000_000, null).newOpportunityValueNeeded).toBe(0);
  });
});

describe('periodsInRange', () => {
  it('scales a per-period KPI target to the range', () => {
    expect(periodsInRange('daily', '2026-01-01', '2026-01-10')).toBe(10);
    expect(periodsInRange('weekly', '2026-01-01', '2026-01-14')).toBe(2);
    expect(periodsInRange('weekly', '2026-01-01', '2026-01-08')).toBe(2);
    expect(periodsInRange('monthly', '2026-01-01', '2026-03-31')).toBe(3);
    expect(periodsInRange('weekly', '2026-01-01', '2026-01-01')).toBe(1);
  });
});

import { workdaysInRange, monthsInRange, reportingCompliance } from '../../src/services/targets.engine';

describe('workdaysInRange', () => {
  it('skips the configured weekend (Fri/Sat by default)', () => {
    // 2026-06-28 is a Sunday; Fri 06-26 and Sat 06-27 are weekend.
    expect(workdaysInRange('2026-06-25', '2026-06-29')).toEqual(['2026-06-25', '2026-06-28', '2026-06-29']);
    expect(workdaysInRange('2026-06-25', '2026-06-29', [0, 6])).toEqual(['2026-06-25', '2026-06-26', '2026-06-29']);
  });
});

describe('monthsInRange', () => {
  it('lists every month the range touches, across a year end', () => {
    expect(monthsInRange('2026-11-20', '2027-01-05')).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
    expect(monthsInRange('2026-03-05', '2026-03-05')).toEqual(['2026-03-01']);
  });
});

describe('reportingCompliance', () => {
  const wd = ['2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24'];
  it('counts only fully elapsed workdays and lists the misses', () => {
    const c = reportingCompliance(wd, new Set(['2026-06-21', '2026-06-23']), '2026-06-24');
    expect(c.dueDays).toBe(3);
    expect(c.reportedDays).toBe(2);
    expect(c.missedDates).toEqual(['2026-06-22']);
    expect(c.pct).toBe(66.7);
    expect(c.todayPending).toBe(true);
  });
  it('has no percentage before any day is due', () => {
    expect(reportingCompliance(wd, new Set(), '2026-06-21').pct).toBeNull();
  });
});
