import { Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class UserController {
  async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phoneNumber, roleId } = req.body;

      if (!email || !password || !firstName || !lastName || !roleId) {
        throw new AppError(400, 'email, password, firstName, lastName and roleId are required');
      }

      const user = await userService.createUser({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        roleId,
      });

      logger.info(`User created: ${user.email} by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();
      // Never leak password hashes
      const sanitized = users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber,
        isActive: u.isActive,
        role: u.role?.name,
      }));
      return res.json({ success: true, data: sanitized });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      logger.info(`User updated: ${user.id} by ${req.user!.email}`);
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.activateUser(req.params.id);
      logger.info(`User activated: ${req.params.id} by ${req.user!.email}`);
      return res.json({ success: true, data: { message: 'User activated' } });
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.deactivateUser(req.params.id);
      logger.info(`User deactivated: ${req.params.id} by ${req.user!.email}`);
      return res.json({ success: true, data: { message: 'User deactivated' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
