"use strict";
// Task Manager: one person assigns a task to another. Who can see a task follows the role's read
// scope (see controllers/task.controller.ts); this file only cleans and checks the fields.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_PRIORITIES = exports.TASK_STATUSES = void 0;
exports.pickTaskFields = pickTaskFields;
exports.taskFieldError = taskFieldError;
exports.TASK_STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled'];
exports.TASK_PRIORITIES = ['Low', 'Medium', 'High'];
const TASK_FIELDS = ['title', 'description', 'priority', 'categoryId', 'followupDate', 'assigneeId', 'status', 'actionsTaken'];
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 4000;
// Keeps only the task fields that the request actually sent, trimmed. An empty follow-up date means none.
function pickTaskFields(body) {
    const out = {};
    for (const key of TASK_FIELDS) {
        if (!body || !(key in body))
            continue;
        const raw = body[key];
        if (raw === null || raw === undefined) {
            out[key] = null;
            continue;
        }
        const text = typeof raw === 'string' ? raw.trim() : String(raw);
        out[key] = key === 'followupDate' && text === '' ? null : text;
    }
    return out;
}
// Returns the first problem with the fields, or null. `creating` requires a title and an assignee.
function taskFieldError(fields, creating) {
    if (creating && !fields.title)
        return 'A task needs a title';
    if (creating && !fields.assigneeId)
        return 'Choose who the task is assigned to';
    if (creating && !fields.categoryId)
        return 'Choose a category for the task';
    if (fields.categoryId !== undefined && !fields.categoryId)
        return 'Choose a category for the task';
    if (fields.title !== undefined && (!fields.title || fields.title.length > MAX_TITLE)) {
        return `The title is required and must be ${MAX_TITLE} characters or fewer`;
    }
    if (fields.description && fields.description.length > MAX_DESCRIPTION) {
        return `The description must be ${MAX_DESCRIPTION} characters or fewer`;
    }
    if (fields.actionsTaken && fields.actionsTaken.length > MAX_DESCRIPTION) {
        return `Actions taken must be ${MAX_DESCRIPTION} characters or fewer`;
    }
    if (fields.priority !== undefined && !exports.TASK_PRIORITIES.includes(fields.priority)) {
        return `Priority must be one of: ${exports.TASK_PRIORITIES.join(', ')}`;
    }
    if (fields.status !== undefined && !exports.TASK_STATUSES.includes(fields.status)) {
        return `Status must be one of: ${exports.TASK_STATUSES.join(', ')}`;
    }
    if (fields.followupDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.followupDate))
        return 'Enter a valid follow-up date';
    if (fields.assigneeId !== undefined && !fields.assigneeId)
        return 'Choose who the task is assigned to';
    return null;
}
//# sourceMappingURL=tasks.js.map