import { buildTimeline } from '../../src/services/stageHistory.service';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const rows = [
  { id: '1', stage: 'Qualification', enteredAt: d('2026-10-01'), actorName: 'Ann', note: 'Deal created' },
  { id: '2', stage: 'Demonstration', enteredAt: d('2026-10-04'), actorName: 'Ann', note: null },
  { id: '3', stage: 'Proposal', enteredAt: d('2026-10-11'), actorName: 'Bob', note: null },
];

describe('buildTimeline', () => {
  it('gives each stage its entry date, the date it was left, and the days spent', () => {
    const t = buildTimeline(rows, d('2026-10-15'), false);
    expect(t.map((e) => e.days)).toEqual([3, 7, 4]);
    expect(t[0].leftAt).toEqual(d('2026-10-04'));
    expect(t[2].leftAt).toBeNull();
  });

  it('marks only the latest stage as current while the deal is open', () => {
    const t = buildTimeline(rows, d('2026-10-15'), false);
    expect(t.map((e) => e.current)).toEqual([false, false, true]);
  });

  it('does not mark a closed deal as current, and times the last stage to the close', () => {
    const closedRows = [...rows, { id: '4', stage: 'Closed-Won', enteredAt: d('2026-10-20'), actorName: 'Bob', note: null }];
    const t = buildTimeline(closedRows, d('2026-10-30'), true);
    expect(t.find((e) => e.id === '4')?.current).toBe(false);
    expect(t.find((e) => e.id === '4')?.days).toBe(10);
  });

  it('handles a deal with one entry', () => {
    const t = buildTimeline([rows[0]], d('2026-10-03'), false);
    expect(t).toHaveLength(1);
    expect(t[0].days).toBe(2);
    expect(t[0].current).toBe(true);
  });

  it('returns an empty timeline for no history', () => {
    expect(buildTimeline([], d('2026-10-03'), false)).toEqual([]);
  });
});
