import { User } from './User';
import { TaskCategory } from './TaskCategory';
export declare class Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    category: TaskCategory | null;
    categoryId: string | null;
    followupDate: string | null;
    actionsTaken: string | null;
    owner: User;
    ownerId: string;
    assignee: User;
    assigneeId: string;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Task.d.ts.map