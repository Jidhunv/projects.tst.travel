"use strict";
// The stages an issue moves through, from being logged to being closed, and the
// rules for moving between them. Pure - no database - so it is unit tested.
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGE_HELP = exports.stageIndex = exports.isFinished = exports.CUSTOMER_STAGES = exports.ALL_STAGES = exports.STAGE_CANCELLED = exports.STAGE_ON_HOLD = exports.ISSUE_STAGES = void 0;
exports.checkTransition = checkTransition;
exports.ticketStatusFor = ticketStatusFor;
exports.ISSUE_STAGES = [
    'Logged',
    'Actioning',
    'Picked up',
    'Under development',
    'Under testing',
    'Customer acceptance',
    'Approved for deployment',
    'Deployed to production',
    'Customer feedback',
    'Closed',
];
exports.STAGE_ON_HOLD = 'On hold';
exports.STAGE_CANCELLED = 'Cancelled';
exports.ALL_STAGES = [...exports.ISSUE_STAGES, exports.STAGE_ON_HOLD, exports.STAGE_CANCELLED];
// Stages in which the customer, not us, has the next move.
exports.CUSTOMER_STAGES = ['Customer acceptance', 'Customer feedback'];
// An issue is finished once it is Closed or Cancelled.
const isFinished = (stage) => stage === 'Closed' || stage === exports.STAGE_CANCELLED;
exports.isFinished = isFinished;
const stageIndex = (stage) => exports.ISSUE_STAGES.indexOf(stage);
exports.stageIndex = stageIndex;
// What each stage means, shown to everyone on the Issue Log page.
exports.STAGE_HELP = {
    Logged: 'Recorded and waiting to be looked at',
    Actioning: 'Being reviewed and planned',
    'Picked up': 'A developer has taken it',
    'Under development': 'The fix or change is being built',
    'Under testing': 'Being tested internally',
    'Customer acceptance': 'With the customer to test and accept',
    'Approved for deployment': 'The customer has accepted and given permission to deploy',
    'Deployed to production': 'Live in production',
    'Customer feedback': 'Open for the customer to confirm it is resolved',
    Closed: 'Resolved and confirmed',
    [exports.STAGE_ON_HOLD]: 'Paused (blocked or waiting)',
    [exports.STAGE_CANCELLED]: 'Will not be done',
};
// Returns an error message when the move is not allowed, or null when it is.
// Rules:
//  - forward moves go one stage at a time, so nothing skips testing or customer approval;
//  - moving backwards (rework, reopening) is allowed but needs a note;
//  - pausing or cancelling needs a note;
//  - "Picked up" needs an assignee; "Approved for deployment" needs the customer's name.
function checkTransition(t) {
    const { from, to } = t;
    const note = (t.note || '').trim();
    if (!exports.ALL_STAGES.includes(to))
        return `Unknown stage: ${to}`;
    if (from === to)
        return `The issue is already in "${to}"`;
    if (from === exports.STAGE_CANCELLED)
        return 'A cancelled issue cannot be moved. Log a new issue instead.';
    if (to === exports.STAGE_ON_HOLD || to === exports.STAGE_CANCELLED) {
        if (!note)
            return to === exports.STAGE_ON_HOLD ? 'Say why the issue is on hold' : 'Say why the issue is being cancelled';
        return null;
    }
    const toIdx = (0, exports.stageIndex)(to);
    if (from === exports.STAGE_ON_HOLD) {
        // Resuming can go to any working stage; the usual gates below still apply.
    }
    else {
        const fromIdx = (0, exports.stageIndex)(from);
        if (toIdx > fromIdx + 1)
            return `Move to "${exports.ISSUE_STAGES[fromIdx + 1]}" first - stages cannot be skipped`;
        if (toIdx < fromIdx && !note)
            return 'Say why the issue is going back a stage';
    }
    if (from === exports.STAGE_ON_HOLD && !note)
        return 'Say why the issue is resuming';
    if (to === 'Picked up' && !t.hasAssignee)
        return 'Assign a developer before the issue is picked up';
    if (to === 'Approved for deployment' && !(t.customerContact || '').trim()) {
        return 'Enter the customer who accepted it and gave permission to deploy';
    }
    return null;
}
// The ticket's status follows its issues.
function ticketStatusFor(stages) {
    if (stages.length === 0)
        return null; // no issues: leave the ticket as it is
    if (stages.every(exports.isFinished))
        return 'Closed';
    const open = stages.filter((s) => !(0, exports.isFinished)(s));
    if (open.every((s) => exports.CUSTOMER_STAGES.includes(s)))
        return 'Pending Customer';
    if (open.every((s) => s === 'Logged') && stages.every((s) => s === 'Logged' || (0, exports.isFinished)(s)))
        return 'Open';
    return 'In Progress';
}
//# sourceMappingURL=issueWorkflow.js.map