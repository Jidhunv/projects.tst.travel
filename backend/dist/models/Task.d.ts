import { User } from './User';
export declare class Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
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