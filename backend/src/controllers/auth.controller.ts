import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'Email and password are required');
      }

      const user = await UserService.authenticateUser(email, password);
      const token = generateToken(user.id, user.email);

      logger.info(`User logged in: ${user.email}`);

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role?.name,
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

      const user = await UserService.getUserByEmail(email);

      // TODO: Send password reset email
      logger.info(`Password reset requested for: ${email}`);

      return res.json({
        success: true,
        data: { message: 'Password reset email sent' },
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

      // TODO: Verify reset token and update password
      logger.info('Password reset confirmed');

      return res.json({
        success: true,
        data: { message: 'Password reset successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
