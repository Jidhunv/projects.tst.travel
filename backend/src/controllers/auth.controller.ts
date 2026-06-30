import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { generateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import PasswordValidator from '../utils/passwordValidator';
import emailService from '../services/email.service';
import logger from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'Email and password are required');
      }

      const user = await userService.authenticateUser(email, password);
      const token = generateToken(user.id, user.email, user.role?.name || 'Sales Rep');

      logger.info(`User logged in: ${user.email}`);

      // Set token in HTTPOnly cookie to prevent XSS attacks
      // Note: secure flag should be true in production, but can be false in local development
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: isProduction || process.env.FORCE_HTTPS === 'true',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour (matches JWT_EXPIRATION)
        path: '/',
      });

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role?.name,
            hasChangedPasswordOnFirstLogin: user.hasChangedPasswordOnFirstLogin,
            requiresPasswordChange: !user.hasChangedPasswordOnFirstLogin,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('User logged out');
      return res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async passwordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError(400, 'Email is required');
      }

      const token = await userService.createPasswordResetToken(email);

      // Send password reset email
      try {
        const user = await userService.getUserByEmail(email);
        if (user && token) {
          await emailService.sendPasswordResetEmail(user, token);
        }
      } catch (emailError) {
        logger.warn(`Failed to send password reset email to ${email}:`, emailError);
        // Continue even if email fails - user can use the link if they have it
      }

      logger.info(`Password reset requested for: ${email}`);

      return res.json({
        success: true,
        data: {
          message: 'Password reset email has been sent if an account exists with this email',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async passwordResetConfirm(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AppError(400, 'Token and new password are required');
      }

      const validation = PasswordValidator.validatePasswordComplexity(newPassword);
      if (!validation.valid) {
        throw new AppError(400, validation.errors.join(', '));
      }

      await userService.resetPasswordWithToken(token, newPassword);
      logger.info('Password reset confirmed');

      return res.json({
        success: true,
        data: { message: 'Password reset successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async changePasswordOnFirstLogin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      if (!newPassword) {
        throw new AppError(400, 'New password is required');
      }

      const validation = PasswordValidator.validatePasswordComplexity(newPassword);
      if (!validation.valid) {
        throw new AppError(400, validation.errors.join(', '));
      }

      await userService.changePasswordOnFirstLogin(userId, newPassword);
      logger.info(`User ${userId} changed password on first login`);

      return res.json({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      if (!currentPassword || !newPassword) {
        throw new AppError(400, 'Current and new passwords are required');
      }

      const validation = PasswordValidator.validatePasswordComplexity(newPassword);
      if (!validation.valid) {
        throw new AppError(400, validation.errors.join(', '));
      }

      await userService.changePassword(userId, currentPassword, newPassword);
      logger.info(`User ${userId} changed password`);

      return res.json({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async setUserPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, newPassword } = req.body;

      // Only admins can set user passwords
      if (req.user?.role !== 'Admin') {
        throw new AppError(403, 'Only admins can set user passwords');
      }

      if (!userId || !newPassword) {
        throw new AppError(400, 'User ID and password are required');
      }

      const validation = PasswordValidator.validatePasswordComplexity(newPassword);
      if (!validation.valid) {
        throw new AppError(400, validation.errors.join(', '));
      }

      await userService.setUserPassword(userId, newPassword);
      logger.info(`Admin ${req.user?.id} set password for user ${userId}`);

      return res.json({
        success: true,
        data: { message: 'Password set successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
