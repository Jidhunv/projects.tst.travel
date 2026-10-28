import { Task } from './Task';
import { User } from './User';
export declare class TaskFollowup {
    id: string;
    task: Task;
    taskId: string;
    note: string;
    nextFollowupDate: string | null;
    createdBy: User;
    createdById: string;
    createdAt: Date;
}
//# sourceMappingURL=TaskFollowup.d.ts.map