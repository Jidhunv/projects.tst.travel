import { AppDataSource } from '../config/database';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { AppError } from '../middleware/errorHandler';

class RoleService {
  private roleRepository = AppDataSource.getRepository(Role);
  private permissionRepository = AppDataSource.getRepository(Permission);

  async createRole(data: { name: string; description?: string }): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new AppError(409, 'Role with this name already exists');
    }

    const role = this.roleRepository.create(data);
    return await this.roleRepository.save(role);
  }

  async getRoles(): Promise<Role[]> {
    return await this.roleRepository.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async getRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    return role;
  }

  async updateRole(id: string, data: { name?: string; description?: string }): Promise<Role> {
    const role = await this.getRoleById(id);

    if (data.name && data.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: data.name },
      });

      if (existingRole) {
        throw new AppError(409, 'A role with this name already exists');
      }
    }

    Object.assign(role, data);
    return await this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRoleById(id);

    // Don't allow deleting default roles
    if (['Admin', 'Manager', 'Sales Rep'].includes(role.name)) {
      throw new AppError(400, `Cannot delete default role: ${role.name}`);
    }

    await this.roleRepository.remove(role);
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.getRoleById(roleId);

    const permissions = await this.permissionRepository.find({
      where: permissionIds.map((id) => ({ id })),
    });

    if (permissions.length !== permissionIds.length) {
      throw new AppError(400, 'One or more permissions not found');
    }

    role.permissions = permissions;
    return await this.roleRepository.save(role);
  }

  async getPermissions(): Promise<Permission[]> {
    return await this.permissionRepository.find({
      order: { module: 'ASC', action: 'ASC' },
    });
  }
}

export default new RoleService();
