export declare const TASK_STATUSES: readonly ["Open", "In Progress", "Completed", "Cancelled"];
export declare const TASK_PRIORITIES: readonly ["Low", "Medium", "High"];
declare const TASK_FIELDS: readonly ["title", "description", "priority", "categoryId", "followupDate", "assigneeId", "status", "actionsTaken"];
export type TaskFields = Partial<Record<(typeof TASK_FIELDS)[number], string | null>>;
export declare function pickTaskFields(body: Record<string, unknown> | undefined): TaskFields;
export declare function followupError(note: string, nextFollowupDate: string | null): string | null;
export declare function taskFieldError(fields: TaskFields, creating: boolean): string | null;
export {};
//# sourceMappingURL=tasks.d.ts.map