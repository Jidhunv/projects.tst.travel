import { Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import logger from '../utils/logger';
import { PasswordValidator } from '../utils/passwordValidator';


// One response shape for a user, so every endpoint returns the same fields and
// none of them can accidentally leak the password hash.
const toUserResponse = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phoneNumber: user.phoneNumber,
  isActive: user.isActive,
  role: user.role?.name,
  roleId: user.roleId,
});

export class UserController {
  async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phoneNumber, roleId } = req.body;

      if (!email || !password || !firstName || !lastName || !roleId) {
        throw new AppError(400, 'email, password, firstName, lastName and roleId are required');
      }

      // Same complexity policy as every other path that sets a password.
      // Creation was the one route that skipped it, so an admin could seed an
      // account with a password the user could never have chosen themselves.
      const validation = PasswordValidator.validatePasswordComplexity(password);
      if (!validation.valid) {
        throw new AppError(400, validation.errors.join('; '));
      }

      const user = await userService.createUser({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        roleId,
      });

      // Fetch full user with role to return in response
      const fullUser = await userService.getUserById(user.id);

      logger.info(`User created: ${user.email} by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: toUserResponse(fullUser),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, roleId, isActive } = req.query;

      const { data, total } = await userService.getUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        roleId: roleId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      // Never leak password hashes
      const sanitized = data.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber,
        isActive: u.isActive,
        role: u.role?.name,
        createdAt: u.createdAt,
      }));

      return res.json({
        success: true,
        data: sanitized,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id);
      return res.json({
        success: true,
        data: toUserResponse(user),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Whitelist updatable fields to prevent mass assignment.
      const allowed = ['firstName', 'lastName', 'phoneNumber', 'email', 'isActive',
        'emailNotificationsEnabled', 'emailNotificationPreferences'];
      const updates: any = pick(req.body, allowed);

      // Only Admins may (re)assign roles — prevents privilege escalation by Managers.
      if ('roleId' in req.body) {
        if (req.user?.role !== 'Admin') {
          throw new AppError(403, 'Only an administrator can change a user\'s role');
        }
        updates.roleId = req.body.roleId;
      }

      // If a new password is provided, enforce the same complexity policy as elsewhere.
      if (req.body.password) {
        const validation = PasswordValidator.validatePasswordComplexity(req.body.password);
        if (!validation.valid) {
          throw new AppError(400, validation.errors.join('; '));
        }
        updates.password = req.body.password;
      }

      const user = await userService.updateUser(req.params.id, updates);
      // Fetch full user with role to return in response
      const fullUser = await userService.getUserById(user.id);
      logger.info(`User updated: ${user.id} by ${req.user!.email}`);
      return res.json({
        success: true,
        data: toUserResponse(fullUser),
      });
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.activateUser(req.params.id);
      const fullUser = await userService.getUserById(req.params.id);
      logger.info(`User activated: ${req.params.id} by ${req.user!.email}`);
      return res.json({
        success: true,
        data: toUserResponse(fullUser),
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.deactivateUser(req.params.id);
      const fullUser = await userService.getUserById(user.id);
      logger.info(`User deactivated: ${user.email} by ${req.user!.email}`);
      return res.json({
        success: true,
        data: toUserResponse(fullUser),
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError(400, 'currentPassword and newPassword are required');
      }

      const validation = PasswordValidator.validatePasswordComplexity(newPassword);
      if (!validation.valid) {
        throw new AppError(400, validation.errors.join('; '));
      }

      const user = await userService.changePassword(req.params.id, currentPassword, newPassword);
      logger.info(`Password changed for user: ${user.email}`);
      return res.json({ success: true, data: { message: 'Password changed successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id);
      await userService.deleteUser(req.params.id);
      logger.info(`User deleted: ${user.email} by ${req.user!.email}`);
      return res.json({ success: true, data: { message: 'User deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id);
      const tempPassword = userService.generateTemporaryPassword();
      await userService.setUserPassword(req.params.id, tempPassword);
      logger.info(`Password reset for user: ${user.email} by ${req.user!.email}`);
      return res.json({
        success: true,
        data: {
          message: 'Password reset successfully',
          tempPassword,
          userId: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async sendInviteEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id);
      const tempPassword = userService.generateTemporaryPassword();
      await userService.setUserPassword(req.params.id, tempPassword);

      // Send invite email
      const emailService = await import('../services/email.service');
      await emailService.default.sendUserCreatedEmail(user, tempPassword, req.user! as any);

      logger.info(`Invite email sent to: ${user.email} by ${req.user!.email}`);
      return res.json({
        success: true,
        data: {
          message: 'Invite email sent successfully',
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSelf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const user = await userService.getUserById(req.user.id);

      // Flatten the role's permissions to "module:action:scope" strings so the
      // frontend can decide which modules/actions to show for this user.
      const permissions = (user.role?.permissions || []).map(
        (p) => `${p.module}:${p.action}:${p.scope || 'all'}`
      );

      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          role: user.role ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
          } : null,
          permissions,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
