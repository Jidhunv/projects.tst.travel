import { Task } from '../models/Task';
import { User } from '../models/User';
export interface TaskListOptions {
    userId: string;
    restrictToUser: boolean;
    view: 'all' | 'assignedToMe' | 'assignedByMe';
    status?: string;
}
declare class TaskService {
    list(o: TaskListOptions): Promise<Task[]>;
    findById(id: string): Promise<Task | null>;
    create(data: Partial<Task>): Promise<Task>;
    update(id: string, data: Partial<Task>): Promise<void>;
    remove(id: string): Promise<void>;
    activeAssignees(): Promise<Pick<User, 'id' | 'firstName' | 'lastName'>[]>;
    findActiveUser(id: string): Promise<User | null>;
}
declare const _default: TaskService;
export default _default;
//# sourceMappingURL=task.service.d.ts.map