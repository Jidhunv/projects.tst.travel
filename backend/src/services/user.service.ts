import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { LoginSecurity } from '../models/LoginSecurity';
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

    const hashedPassword = await bcrypt.hash(data.password, 13);
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

  // Brute-force protection thresholds.
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_MINUTES = 15;
  private loginSecurityRepository = AppDataSource.getRepository(LoginSecurity);

  async authenticateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      // Generic message — do not reveal whether the email exists.
      throw new AppError(401, 'Invalid credentials');
    }

    // Load brute-force protection state (separate table).
    let sec = await this.loginSecurityRepository.findOne({ where: { userId: user.id } });

    // If the account is currently locked, reject before checking the password.
    if (sec?.lockoutUntil && sec.lockoutUntil.getTime() > Date.now()) {
      const mins = Math.ceil((sec.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new AppError(423, `Account locked due to too many failed attempts. Try again in ${mins} minute(s).`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      if (!sec) {
        sec = this.loginSecurityRepository.create({ userId: user.id, failedAttempts: 0, lockoutUntil: null });
      }
      sec.failedAttempts = (sec.failedAttempts || 0) + 1;

      if (sec.failedAttempts >= UserService.MAX_FAILED_ATTEMPTS) {
        sec.lockoutUntil = new Date(Date.now() + UserService.LOCKOUT_MINUTES * 60 * 1000);
        sec.failedAttempts = 0; // reset counter; the lock now gates access
        await this.loginSecurityRepository.save(sec);
        throw new AppError(
          423,
          `Account locked due to too many failed attempts. Try again in ${UserService.LOCKOUT_MINUTES} minutes.`
        );
      }

      await this.loginSecurityRepository.save(sec);
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(401, 'User account is inactive');
    }

    // Successful login — clear any accumulated failure state.
    if (sec && (sec.failedAttempts > 0 || sec.lockoutUntil)) {
      sec.failedAttempts = 0;
      sec.lockoutUntil = null;
      await this.loginSecurityRepository.save(sec);
    }

    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await this.getUserById(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 13);
    }

    Object.assign(user, data);
    await this.userRepository.save(user);

    // Reload the user with fresh role relationship after saving
    // This ensures roleId changes are reflected in the role object
    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['role', 'role.permissions'],
    });
  }

  async getUsers(filters: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.userRepository.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role');

    if (filters.search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.roleId) {
      query.andWhere('user.roleId = :roleId', { roleId: filters.roleId });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    const [data, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async deactivateUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = false;
    await this.userRepository.save(user);
    // Reload to ensure all relationships are fresh
    return await this.getUserById(id);
  }

  async activateUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = true;
    await this.userRepository.save(user);
    // Reload to ensure all relationships are fresh
    return await this.getUserById(id);
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
  // Returns null if user not found to prevent user enumeration via HTTP status codes.
  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Return null instead of throwing to avoid leaking user existence via HTTP status codes
      return null;
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

    user.password = await bcrypt.hash(newPassword, 13);
    user.resetToken = null as unknown as string;
    user.resetTokenExpiry = null as unknown as Date;
    user.hasChangedPasswordOnFirstLogin = true;
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);
  }

  async changePasswordOnFirstLogin(userId: string, newPassword: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.hasChangedPasswordOnFirstLogin) {
      throw new AppError(400, 'Password has already been changed on first login');
    }

    user.password = await bcrypt.hash(newPassword, 13);
    user.hasChangedPasswordOnFirstLogin = true;
    user.passwordChangedAt = new Date();
    return await this.userRepository.save(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.getUserById(userId);

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 13);
    user.passwordChangedAt = new Date();
    return await this.userRepository.save(user);
  }

  async setUserPassword(userId: string, newPassword: string): Promise<User> {
    const user = await this.getUserById(userId);

    user.password = await bcrypt.hash(newPassword, 13);
    user.hasChangedPasswordOnFirstLogin = false;
    user.passwordChangedAt = new Date();
    return await this.userRepository.save(user);
  }

  generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const passwordLength = 12;
    let password = '';
    const randomBytes = crypto.randomBytes(passwordLength);

    for (let i = 0; i < passwordLength; i++) {
      password += chars[randomBytes[i] % chars.length];
    }

    return password;
  }
}

export default new UserService();
