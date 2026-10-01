"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_service_1 = __importDefault(require("../services/role.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
class RoleController {
    async createRole(req, res, next) {
        try {
            const { name, description } = req.body;
            if (!name) {
                throw new errorHandler_1.AppError(400, 'Role name is required');
            }
            const role = await role_service_1.default.createRole({ name, description });
            logger_1.default.info(`Role created: ${role.name} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async getRoles(req, res, next) {
        try {
            const roles = await role_service_1.default.getRoles();
            return res.json({ success: true, data: roles });
        }
        catch (error) {
            next(error);
        }
    }
    async getRole(req, res, next) {
        try {
            const role = await role_service_1.default.getRoleById(req.params.id);
            return res.json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRole(req, res, next) {
        try {
            const { name, description } = req.body;
            if (!name) {
                throw new errorHandler_1.AppError(400, 'Role name is required');
            }
            const role = await role_service_1.default.updateRole(req.params.id, { name, description });
            logger_1.default.info(`Role updated: ${role.name} by ${req.user?.email}`);
            return res.json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteRole(req, res, next) {
        try {
            const role = await role_service_1.default.getRoleById(req.params.id);
            await role_service_1.default.deleteRole(req.params.id);
            logger_1.default.info(`Role deleted: ${role.name} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Role deleted successfully' } });
        }
        catch (error) {
            next(error);
        }
    }
    async assignPermissions(req, res, next) {
        try {
            const { permissionIds } = req.body;
            if (!Array.isArray(permissionIds)) {
                throw new errorHandler_1.AppError(400, 'permissionIds must be an array');
            }
            const role = await role_service_1.default.assignPermissions(req.params.id, permissionIds);
            logger_1.default.info(`Permissions assigned to role: ${role.name} by ${req.user?.email}`);
            return res.json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async getPermissions(req, res, next) {
        try {
            const permissions = await role_service_1.default.getPermissions();
            return res.json({ success: true, data: permissions });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RoleController = RoleController;
exports.default = new RoleController();
//# sourceMappingURL=role.controller.js.map