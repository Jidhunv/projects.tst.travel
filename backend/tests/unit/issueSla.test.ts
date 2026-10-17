import { evaluateIssue, slaHours, slaTargets, summariseSla, Transition } from '../../src/utils/issueSla';

const T0 = new Date('2026-10-01T08:00:00Z');
const at = (h: number) => new Date(T0.getTime() + h * 3_600_000);
const tr = (toStage: string, h: number): Transition => ({ toStage, at: at(h) });
const base = { loggedAt: T0, priority: 'High', closedAt: null as Date | null, stage: 'Logged' };

describe('slaTargets', () => {
  it('uses the priority defaults, or the ticket\'s own hours when set', () => {
    expect(slaTargets('Critical')).toMatchObject({ responseHours: 2, resolutionHours: 24 });
    expect(slaTargets('Low')).toMatchObject({ responseHours: 24, resolutionHours: 240 });
    expect(slaTargets('High', 1, 10)).toMatchObject({ responseHours: 1, resolutionHours: 10, fromTicket: true });
    expect(slaTargets('Nonsense').responseHours).toBe(8); // falls back to Medium
  });
});

describe('slaHours (the clock stops while waiting on the customer or on hold)', () => {
  it('counts straight through when nothing pauses it', () => {
    expect(slaHours(T0, at(10), [tr('Logged', 0), tr('Under development', 2)])).toBe(10);
  });
  it('leaves out time in User acceptance and On hold', () => {
    const t = [tr('Logged', 0), tr('Testing', 5), tr('User acceptance', 10), tr('Testing', 34), tr('On hold', 36), tr('Deployed', 40)];
    // 40h elapsed - 24h with the customer - 4h on hold
    expect(slaHours(T0, at(40), t)).toBe(12);
  });
  it('stops counting a pause that is still running', () => {
    expect(slaHours(T0, at(30), [tr('Logged', 0), tr('User acceptance', 10)])).toBe(10);
  });
  it('is never negative', () => expect(slaHours(at(5), at(1), [])).toBe(0));
});

describe('evaluateIssue', () => {
  it('meets response and resolution inside target', () => {
    const e = evaluateIssue({ ...base, stage: 'Deployed', closedAt: at(50), transitions: [tr('Logged', 0), tr('Under development', 3), tr('Deployed', 50)] }, at(100));
    expect(e.responseState).toBe('met');
    expect(e.responseHours).toBe(3);
    expect(e.resolutionState).toBe('met'); // High: 4h / 72h
    expect(e.resolutionHours).toBe(50);
    expect(e.daysToClose).toBe(2.1);
  });

  it('flags a late first response', () => {
    const e = evaluateIssue({ ...base, stage: 'Under development', transitions: [tr('Logged', 0), tr('Under development', 9)] }, at(10));
    expect(e.responseState).toBe('breached'); // 9h > 4h
    expect(e.respondedAt).toEqual(at(9));
  });

  it('is within target while nobody has responded yet, and breached once the target passes', () => {
    expect(evaluateIssue({ ...base, transitions: [tr('Logged', 0)] }, at(3)).responseState).toBe('within');
    const late = evaluateIssue({ ...base, transitions: [tr('Logged', 0)] }, at(6));
    expect(late.responseState).toBe('breached');
    expect(late.respondedAt).toBeNull();
  });

  it('resolves and closes at the moment it is deployed', () => {
    const e = evaluateIssue({ ...base, stage: 'Deployed', closedAt: at(60), transitions: [tr('Logged', 0), tr('Under development', 1), tr('Deployed', 60)] }, at(500));
    expect(e.resolutionState).toBe('met');
    expect(e.resolvedAt).toEqual(at(60));
    expect(e.closedAt).toEqual(at(60));
  });

  it('does not charge the customer\'s testing time to us', () => {
    const t = [tr('Logged', 0), tr('Under development', 1), tr('User acceptance', 40), tr('Deployed', 140)];
    const e = evaluateIssue({ ...base, stage: 'Deployed', transitions: t }, at(200));
    expect(e.resolutionHours).toBe(40); // 140h elapsed - 100h with the customer
    expect(e.resolutionState).toBe('met');
  });

  it('uses the ticket\'s own SLA hours when present', () => {
    const e = evaluateIssue({ ...base, transitions: [tr('Logged', 0), tr('Under development', 3)], ticketResponseHours: 2 }, at(5));
    expect(e.responseState).toBe('breached');
  });

  it('marks a cancelled, never-actioned issue as not applicable', () => {
    const e = evaluateIssue({ ...base, stage: 'Cancelled', closedAt: at(5), transitions: [tr('Logged', 0), tr('Cancelled', 5)] }, at(50));
    expect(e.closedAt).toBeNull();
    expect(e.daysToClose).toBeNull();
  });
});

describe('summariseSla', () => {
  it('reports averages, medians and % within SLA over judged issues only', () => {
    const s = summariseSla([
      { response: 'met', resolution: 'met', responseHours: 2, resolutionHours: 20, daysToClose: 2 },
      { response: 'breached', resolution: 'breached', responseHours: 10, resolutionHours: 100, daysToClose: 6 },
      { response: 'met', resolution: 'within', responseHours: 4, resolutionHours: 12, daysToClose: null },
    ]);
    expect(s.issues).toBe(3);
    expect(s.response.pctWithinSla).toBe(66.7);
    expect(s.response.medianHours).toBe(4);
    expect(s.resolution.pctWithinSla).toBe(50); // the "within" one is not judged yet
    expect(s.avgDaysToClose).toBe(4);
    expect(s.closedCount).toBe(2);
  });
  it('handles an empty set', () => {
    const s = summariseSla([]);
    expect(s.response.pctWithinSla).toBeNull();
    expect(s.avgDaysToClose).toBeNull();
  });
});
