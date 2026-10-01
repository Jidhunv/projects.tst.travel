import { User } from './User';
import { Permission } from './Permission';
export declare class Role {
    id: string;
    name: string;
    description: string;
    users: User[];
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Role.d.ts.map