"use strict";
// Report rules for a KPI row in the KPI summary. Pure functions, so they can be
// tested without a database.
Object.defineProperty(exports, "__esModule", { value: true });
exports.kpiMet = kpiMet;
exports.weightedScore = weightedScore;
// Did this KPI get done in the range?
//  - with a target: the total (or, for text, the number of answers) reaches it
//  - without a target: yes/no is done once a "yes" is given; text once any answer is given
//  - a plain number without a target has no done/not-done answer
function kpiMet(r) {
    if (r.target !== null) {
        const value = r.type === 'text' ? r.entries : r.total;
        return value >= r.target;
    }
    if (r.type === 'yes_no')
        return r.total > 0;
    if (r.type === 'text')
        return r.entries > 0;
    return null;
}
// Achievement of one KPI as a percentage. With a target it is the share of the
// target reached (capped at 100 when scored). Without a target it is 100 when done
// and 0 when not; a plain number with no target has no achievement.
const achievement = (r) => {
    if (r.pctOfTarget !== null)
        return Math.min(Number(r.pctOfTarget), 100);
    if (r.met === true)
        return 100;
    if (r.met === false)
        return 0;
    return null;
};
// Weighted score for one person's KPIs. weightTotal is the sum of their weights
// (ideally 100). weightedScore is the part of that total they earned. scorePct is
// the earned share of the weight.
function weightedScore(rows) {
    const weighted = rows.filter((r) => r.weightage !== null && r.weightage > 0);
    const weightTotal = weighted.reduce((sum, r) => sum + Number(r.weightage), 0);
    const scored = weighted.filter((r) => achievement(r) !== null);
    if (scored.length === 0 || weightTotal === 0) {
        return { weightTotal: round1(weightTotal), weightedScore: null, scorePct: null };
    }
    const earned = scored.reduce((sum, r) => sum + (Number(achievement(r)) / 100) * Number(r.weightage), 0);
    return {
        weightTotal: round1(weightTotal),
        weightedScore: round1(earned),
        scorePct: round1((earned / weightTotal) * 100),
    };
}
const round1 = (n) => Math.round(n * 10) / 10;
//# sourceMappingURL=kpiReport.js.map