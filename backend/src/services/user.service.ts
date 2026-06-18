import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { MoreThan } from 'typeorm';
import { AppError } from '../middleware/errorHandler';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private roleRepository = AppDataSource.getRepository(Role);

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    roleId: string;
  }): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    return await this.userRepository.save(user);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(401, 'User account is inactive');
    }

    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await this.getUserById(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    Object.assign(user, data);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['role', 'role.permissions'],
    });
  }

  async deactivateUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = false;
    return await this.userRepository.save(user);
  }

  async activateUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = true;
    return await this.userRepository.save(user);
  }

  async hasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const user = await this.getUserById(userId);

    if (!user.role) {
      return false;
    }

    return user.role.permissions?.some(
      (p) => p.module === module && p.action === action
    ) ?? false;
  }

  // --- Password reset ---

  // Generates a one-time reset token, stores its hash with a 1-hour expiry,
  // and returns the raw token (to be emailed in production).
  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists; surface a generic error.
      throw new AppError(404, 'If the account exists, a reset token was generated');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetToken = hashedToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepository.save(user);

    return rawToken;
  }

  async resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await this.userRepository.findOne({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null as unknown as string;
    user.resetTokenExpiry = null as unknown as Date;
    await this.userRepository.save(user);
  }
}

export default new UserService();
