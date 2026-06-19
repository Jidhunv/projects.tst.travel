import { Response, NextFunction } from 'express';
import roleService from '../services/role.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class RoleController {
  async createRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      if (!name) {
        throw new AppError(400, 'Role name is required');
      }

      const role = await roleService.createRole({ name, description });
      logger.info(`Role created: ${role.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const roles = await roleService.getRoles();
      return res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async getRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const role = await roleService.getRoleById(req.params.id);
      return res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      if (!name) {
        throw new AppError(400, 'Role name is required');
      }

      const role = await roleService.updateRole(req.params.id, { name, description });
      logger.info(`Role updated: ${role.name} by ${req.user?.email}`);
      return res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const role = await roleService.getRoleById(req.params.id);
      await roleService.deleteRole(req.params.id);
      logger.info(`Role deleted: ${role.name} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Role deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async assignPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { permissionIds } = req.body;

      if (!Array.isArray(permissionIds)) {
        throw new AppError(400, 'permissionIds must be an array');
      }

      const role = await roleService.assignPermissions(req.params.id, permissionIds);
      logger.info(`Permissions assigned to role: ${role.name} by ${req.user?.email}`);
      return res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const permissions = await roleService.getPermissions();
      return res.json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleController();
