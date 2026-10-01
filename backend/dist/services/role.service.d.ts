import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
declare class RoleService {
    private roleRepository;
    private permissionRepository;
    createRole(data: {
        name: string;
        description?: string;
    }): Promise<Role>;
    getRoles(): Promise<Role[]>;
    getRoleById(id: string): Promise<Role>;
    updateRole(id: string, data: {
        name?: string;
        description?: string;
    }): Promise<Role>;
    deleteRole(id: string): Promise<void>;
    assignPermissions(roleId: string, permissionIds: string[]): Promise<Role>;
    getPermissions(): Promise<Permission[]>;
}
declare const _default: RoleService;
export default _default;
//# sourceMappingURL=role.service.d.ts.map