"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Role_1 = require("../models/Role");
const Permission_1 = require("../models/Permission");
const errorHandler_1 = require("../middleware/errorHandler");
class RoleService {
    constructor() {
        this.roleRepository = database_1.AppDataSource.getRepository(Role_1.Role);
        this.permissionRepository = database_1.AppDataSource.getRepository(Permission_1.Permission);
    }
    async createRole(data) {
        const existingRole = await this.roleRepository.findOne({
            where: { name: data.name },
        });
        if (existingRole) {
            throw new errorHandler_1.AppError(409, 'Role with this name already exists');
        }
        const role = this.roleRepository.create(data);
        return await this.roleRepository.save(role);
    }
    async getRoles() {
        return await this.roleRepository.find({
            relations: ['permissions'],
            order: { name: 'ASC' },
        });
    }
    async getRoleById(id) {
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: ['permissions'],
        });
        if (!role) {
            throw new errorHandler_1.AppError(404, 'Role not found');
        }
        return role;
    }
    async updateRole(id, data) {
        const role = await this.getRoleById(id);
        if (data.name && data.name !== role.name) {
            const existingRole = await this.roleRepository.findOne({
                where: { name: data.name },
            });
            if (existingRole) {
                throw new errorHandler_1.AppError(409, 'A role with this name already exists');
            }
        }
        Object.assign(role, data);
        return await this.roleRepository.save(role);
    }
    async deleteRole(id) {
        const role = await this.getRoleById(id);
        // Don't allow deleting default roles
        if (['Admin', 'Manager', 'Sales Rep'].includes(role.name)) {
            throw new errorHandler_1.AppError(400, `Cannot delete default role: ${role.name}`);
        }
        await this.roleRepository.remove(role);
    }
    async assignPermissions(roleId, permissionIds) {
        const role = await this.getRoleById(roleId);
        const permissions = await this.permissionRepository.find({
            where: permissionIds.map((id) => ({ id })),
        });
        if (permissions.length !== permissionIds.length) {
            throw new errorHandler_1.AppError(400, 'One or more permissions not found');
        }
        role.permissions = permissions;
        return await this.roleRepository.save(role);
    }
    async getPermissions() {
        return await this.permissionRepository.find({
            order: { module: 'ASC', action: 'ASC' },
        });
    }
}
exports.default = new RoleService();
//# sourceMappingURL=role.service.js.map