"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const user_service_1 = __importDefault(require("../services/user.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const passwordValidator_1 = __importDefault(require("../utils/passwordValidator"));
const email_service_1 = __importDefault(require("../services/email.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const securityLogger_1 = require("../utils/securityLogger");
const token_blacklist_service_1 = __importDefault(require("../services/token-blacklist.service"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                throw new errorHandler_1.AppError(400, 'Email and password are required');
            }
            let user;
            try {
                user = await user_service_1.default.authenticateUser(email, password);
            }
            catch (authError) {
                // Distinguish a lockout (HTTP 423) from an ordinary failed attempt.
                const isLockout = authError instanceof errorHandler_1.AppError && authError.statusCode === 423;
                (0, securityLogger_1.logSecurityEvent)(isLockout ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILURE', {
                    ...(0, securityLogger_1.requestContext)(req),
                    email,
                    reason: authError instanceof errorHandler_1.AppError ? authError.message : 'authentication failed',
                });
                throw authError;
            }
            // Never invent a role: issuing a default token on an unresolved role means
            // authentication silently guesses at authorisation.
            if (!user.role?.name) {
                logger_1.default.error(`Login blocked: user ${user.email} has no resolvable role`);
                throw new errorHandler_1.AppError(403, 'Your account has no role assigned. Contact an administrator.');
            }
            const token = (0, auth_1.generateToken)(user.id, user.email, user.role.name);
            logger_1.default.info(`User logged in: ${user.email}`);
            (0, securityLogger_1.logSecurityEvent)('LOGIN_SUCCESS', {
                ...(0, securityLogger_1.requestContext)(req),
                email: user.email,
                userId: user.id,
                role: user.role?.name,
            });
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
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            // Revoke the presented token so it cannot be reused before its expiry.
            const token = (0, auth_1.extractToken)(req);
            if (token) {
                const decoded = jsonwebtoken_1.default.decode(token);
                await token_blacklist_service_1.default.revoke(token, decoded?.exp, req.user?.id);
            }
            // Clear the auth cookie on logout
            res.clearCookie('authToken', { path: '/' });
            logger_1.default.info('User logged out');
            (0, securityLogger_1.logSecurityEvent)('LOGOUT', {
                ...(0, securityLogger_1.requestContext)(req),
                userId: req.user?.id,
                email: req.user?.email,
            });
            return res.json({
                success: true,
                data: { message: 'Logged out successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async passwordReset(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) {
                throw new errorHandler_1.AppError(400, 'Email is required');
            }
            const token = await user_service_1.default.createPasswordResetToken(email);
            // Send password reset email only if token was generated (user exists)
            if (token) {
                try {
                    const user = await user_service_1.default.getUserByEmail(email);
                    if (user) {
                        await email_service_1.default.sendPasswordResetEmail(user, token);
                        (0, securityLogger_1.logSecurityEvent)('PASSWORD_RESET_REQUESTED', { ...(0, securityLogger_1.requestContext)(req), email });
                    }
                }
                catch (emailError) {
                    logger_1.default.warn(`Failed to send password reset email to ${email}:`, emailError);
                    // Continue even if email fails - user can use the link if they have it
                }
            }
            logger_1.default.info(`Password reset requested for: ${email}`);
            // Always return the same 200 response regardless of whether user exists
            return res.json({
                success: true,
                data: {
                    message: 'If an account exists with this email, a password reset link has been sent',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async passwordResetConfirm(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                throw new errorHandler_1.AppError(400, 'Token and new password are required');
            }
            const validation = passwordValidator_1.default.validatePasswordComplexity(newPassword);
            if (!validation.valid) {
                throw new errorHandler_1.AppError(400, validation.errors.join(', '));
            }
            await user_service_1.default.resetPasswordWithToken(token, newPassword);
            logger_1.default.info('Password reset confirmed');
            (0, securityLogger_1.logSecurityEvent)('PASSWORD_RESET_COMPLETED', { ...(0, securityLogger_1.requestContext)(req) });
            return res.json({
                success: true,
                data: { message: 'Password reset successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async changePasswordOnFirstLogin(req, res, next) {
        try {
            const { newPassword } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            if (!newPassword) {
                throw new errorHandler_1.AppError(400, 'New password is required');
            }
            const validation = passwordValidator_1.default.validatePasswordComplexity(newPassword);
            if (!validation.valid) {
                throw new errorHandler_1.AppError(400, validation.errors.join(', '));
            }
            await user_service_1.default.changePasswordOnFirstLogin(userId, newPassword);
            logger_1.default.info(`User ${userId} changed password on first login`);
            return res.json({
                success: true,
                data: { message: 'Password changed successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            if (!currentPassword || !newPassword) {
                throw new errorHandler_1.AppError(400, 'Current and new passwords are required');
            }
            const validation = passwordValidator_1.default.validatePasswordComplexity(newPassword);
            if (!validation.valid) {
                throw new errorHandler_1.AppError(400, validation.errors.join(', '));
            }
            await user_service_1.default.changePassword(userId, currentPassword, newPassword);
            logger_1.default.info(`User ${userId} changed password`);
            (0, securityLogger_1.logSecurityEvent)('PASSWORD_CHANGED', { ...(0, securityLogger_1.requestContext)(req), userId, email: req.user?.email });
            return res.json({
                success: true,
                data: { message: 'Password changed successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async setUserPassword(req, res, next) {
        try {
            const { userId, newPassword } = req.body;
            // Only admins can set user passwords
            if (req.user?.role !== 'Admin') {
                throw new errorHandler_1.AppError(403, 'Only admins can set user passwords');
            }
            if (!userId || !newPassword) {
                throw new errorHandler_1.AppError(400, 'User ID and password are required');
            }
            const validation = passwordValidator_1.default.validatePasswordComplexity(newPassword);
            if (!validation.valid) {
                throw new errorHandler_1.AppError(400, validation.errors.join(', '));
            }
            await user_service_1.default.setUserPassword(userId, newPassword);
            logger_1.default.info(`Admin ${req.user?.id} set password for user ${userId}`);
            (0, securityLogger_1.logSecurityEvent)('ADMIN_SET_PASSWORD', {
                ...(0, securityLogger_1.requestContext)(req),
                userId: req.user?.id,
                email: req.user?.email,
                targetUserId: userId,
            });
            return res.json({
                success: true,
                data: { message: 'Password set successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.default = new AuthController();
//# sourceMappingURL=auth.controller.js.map