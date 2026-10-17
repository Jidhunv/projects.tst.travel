import { User } from './User';
import { Permission } from './Permission';
export declare class Role {
    id: string;
    name: string;
    description: string;
    departments: string[] | null;
    users: User[];
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Role.d.ts.map