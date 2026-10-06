"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetProgress = targetProgress;
exports.suggestPipeline = suggestPipeline;
exports.periodsInRange = periodsInRange;
exports.workdaysInRange = workdaysInRange;
exports.monthsInRange = monthsInRange;
exports.reportingCompliance = reportingCompliance;
const salesStrategy_1 = require("../utils/salesStrategy");
// Pure maths for target tracking; the service supplies the numbers.
const DAY = 86400000;
const utcDay = (s) => Date.parse(`${s}T00:00:00Z`);
function targetProgress(achieved, target, startDate, endDate, now = new Date()) {
    const start = utcDay(startDate);
    const end = utcDay(endDate) + DAY; // end date is inclusive
    const totalDays = Math.max(1, Math.round((end - start) / DAY));
    const nowMs = now.getTime();
    const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((nowMs - start) / DAY)));
    const daysLeft = Math.max(0, totalDays - elapsedDays);
    const elapsedPct = (elapsedDays / totalDays) * 100;
    const expectedByNow = target * (elapsedDays / totalDays);
    const pctComplete = target > 0 ? (achieved / target) * 100 : 0;
    let pace;
    if (target > 0 && achieved >= target)
        pace = 'achieved';
    else if (nowMs < start)
        pace = 'not-started';
    else if (nowMs >= end)
        pace = 'ended-short';
    else if (achieved >= expectedByNow * 1.1)
        pace = 'ahead';
    else if (achieved >= expectedByNow * 0.9)
        pace = 'on-pace';
    else
        pace = 'behind';
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
// "How much pipeline / new opportunity value do we need to still hit the target?"
// For a won-revenue target remaining value must come out of pipeline closing
// at the win rate; the larger of win-rate and coverage sizing is recommended.
function suggestPipeline(remaining, currentOpenPipeline, ownWinRate) {
    const useOwn = ownWinRate !== null && ownWinRate > 0;
    const winRate = useOwn ? ownWinRate : salesStrategy_1.GLOBAL_BENCHMARKS.winRate;
    const byWin = remaining / winRate;
    const byCoverage = remaining * salesStrategy_1.GLOBAL_BENCHMARKS.pipelineCoverage;
    const recommended = Math.max(byWin, byCoverage);
    return {
        remaining: Math.round(remaining),
        winRateUsed: round1(winRate * 100),
        winRateSource: useOwn ? 'own history' : 'global benchmark',
        coverage: salesStrategy_1.GLOBAL_BENCHMARKS.pipelineCoverage,
        pipelineNeededByWinRate: Math.round(byWin),
        pipelineNeededByCoverage: Math.round(byCoverage),
        recommendedPipeline: Math.round(recommended),
        currentOpenPipeline: Math.round(currentOpenPipeline),
        newOpportunityValueNeeded: Math.round(Math.max(0, recommended - currentOpenPipeline)),
        newOpportunityValueIfAhead: null,
    };
}
// How many reporting periods fall in a date range, to scale a per-period KPI target.
function periodsInRange(frequency, from, to) {
    const days = Math.max(1, Math.round((utcDay(to) - utcDay(from)) / DAY) + 1);
    if (frequency === 'daily')
        return days;
    if (frequency === 'monthly')
        return Math.max(1, Math.round(days / 30.4375));
    return Math.max(1, Math.ceil(days / 7)); // weekly
}
const round1 = (n) => Math.round(n * 10) / 10;
// Calendar dates (YYYY-MM-DD) in [from, to] that are working days.
function workdaysInRange(from, to, weekend = salesStrategy_1.WORKWEEK.weekendDays) {
    const out = [];
    for (let t = utcDay(from); t <= utcDay(to); t += DAY) {
        const d = new Date(t);
        if (!weekend.includes(d.getUTCDay()))
            out.push(d.toISOString().slice(0, 10));
    }
    return out;
}
// First day of the month containing `date` (YYYY-MM-DD) and of every month the range touches.
function monthsInRange(from, to) {
    const out = [];
    const end = new Date(utcDay(to));
    let y = new Date(utcDay(from)).getUTCFullYear();
    let m = new Date(utcDay(from)).getUTCMonth();
    while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth())) {
        out.push(`${y}-${String(m + 1).padStart(2, '0')}-01`);
        m++;
        if (m > 11) {
            m = 0;
            y++;
        }
    }
    return out;
}
// Daily-reporting compliance: of the working days that have fully passed, on how many did the person report?
function reportingCompliance(workdays, reportedDates, today) {
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
//# sourceMappingURL=targets.engine.js.map