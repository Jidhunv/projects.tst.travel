"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = __importDefault(require("../services/user.service"));
const team_service_1 = __importDefault(require("../services/team.service"));
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
const passwordValidator_1 = require("../utils/passwordValidator");
// One response shape for a user, so every endpoint returns the same fields and
// none of them can accidentally leak the password hash.
const toUserResponse = (user, teamIds = [], supervisedTeamIds = []) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    role: user.role?.name,
    roleId: user.roleId,
    teamIds, // teams this user is a MEMBER of
    supervisedTeamIds, // teams this user SUPERVISES
});
class UserController {
    async createUser(req, res, next) {
        try {
            const { email, password, firstName, lastName, phoneNumber, roleId } = req.body;
            if (!email || !password || !firstName || !lastName || !roleId) {
                throw new errorHandler_1.AppError(400, 'email, password, firstName, lastName and roleId are required');
            }
            // Same complexity policy as every other path that sets a password.
            // Creation was the one route that skipped it, so an admin could seed an
            // account with a password the user could never have chosen themselves.
            const validation = passwordValidator_1.PasswordValidator.validatePasswordComplexity(password);
            if (!validation.valid) {
                throw new errorHandler_1.AppError(400, validation.errors.join('; '));
            }
            const user = await user_service_1.default.createUser({
                email,
                password,
                firstName,
                lastName,
                phoneNumber,
                roleId,
            });
            // Fetch full user with role to return in response
            const fullUser = await user_service_1.default.getUserById(user.id);
            logger_1.default.info(`User created: ${user.email} by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: toUserResponse(fullUser),
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUsers(req, res, next) {
        var _a, _b;
        try {
            const { page = 1, limit = 20, search, roleId, isActive } = req.query;
            const { data, total } = await user_service_1.default.getUsers({
                page: Number(page),
                limit: Number(limit),
                search: search,
                roleId: roleId,
                isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            });
            // Batch-load membership + supervision for the page in two queries.
            const membershipByUser = {};
            const supervisedByUser = {};
            if (data.length) {
                const ids = data.map((u) => u.id);
                const repo = database_1.AppDataSource.getRepository(User_1.User);
                const [mRows, sRows] = await Promise.all([
                    repo.query(`SELECT "userId", "teamId" FROM user_teams WHERE "userId" = ANY($1)`, [ids]),
                    repo.query(`SELECT "userId", "teamId" FROM team_supervisors WHERE "userId" = ANY($1)`, [ids]),
                ]);
                for (const r of mRows)
                    (membershipByUser[_a = r.userId] || (membershipByUser[_a] = [])).push(r.teamId);
                for (const r of sRows)
                    (supervisedByUser[_b = r.userId] || (supervisedByUser[_b] = [])).push(r.teamId);
            }
            // Never leak password hashes
            const sanitized = data.map((u) => ({
                id: u.id,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                phoneNumber: u.phoneNumber,
                isActive: u.isActive,
                role: u.role?.name,
                roleId: u.roleId,
                teamIds: membershipByUser[u.id] || [],
                supervisedTeamIds: supervisedByUser[u.id] || [],
                createdAt: u.createdAt,
            }));
            return res.json({
                success: true,
                data: sanitized,
                meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUser(req, res, next) {
        try {
            const user = await user_service_1.default.getUserById(req.params.id);
            const [teamIds, supervisedTeamIds] = await Promise.all([
                team_service_1.default.getUserTeamIds(user.id),
                team_service_1.default.getSupervisedTeamIds(user.id),
            ]);
            return res.json({
                success: true,
                data: toUserResponse(user, teamIds, supervisedTeamIds),
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateUser(req, res, next) {
        try {
            // Whitelist updatable fields to prevent mass assignment.
            const allowed = ['firstName', 'lastName', 'phoneNumber', 'email', 'isActive',
                'emailNotificationsEnabled', 'emailNotificationPreferences'];
            const updates = (0, pick_1.default)(req.body, allowed);
            // Only Admins may (re)assign roles — prevents privilege escalation by Managers.
            if ('roleId' in req.body) {
                if (req.user?.role !== 'Admin') {
                    throw new errorHandler_1.AppError(403, 'Only an administrator can change a user\'s role');
                }
                updates.roleId = req.body.roleId;
            }
            // Membership (teamIds) and supervision (supervisedTeamIds) change what a
            // user can see, so only Admins may set them. Both are string[] (m2m).
            const changingTeams = Array.isArray(req.body.teamIds);
            const changingSupervised = Array.isArray(req.body.supervisedTeamIds);
            if ((changingTeams || changingSupervised) && req.user?.role !== 'Admin') {
                throw new errorHandler_1.AppError(403, 'Only an administrator can change a user\'s teams');
            }
            // If a new password is provided, enforce the same complexity policy as elsewhere.
            if (req.body.password) {
                const validation = passwordValidator_1.PasswordValidator.validatePasswordComplexity(req.body.password);
                if (!validation.valid) {
                    throw new errorHandler_1.AppError(400, validation.errors.join('; '));
                }
                updates.password = req.body.password;
            }
            const user = await user_service_1.default.updateUser(req.params.id, updates);
            if (changingTeams)
                await team_service_1.default.setUserTeams(user.id, req.body.teamIds);
            if (changingSupervised)
                await team_service_1.default.setUserSupervisedTeams(user.id, req.body.supervisedTeamIds);
            // Fetch full user with role to return in response
            const fullUser = await user_service_1.default.getUserById(user.id);
            const [teamIds, supervisedTeamIds] = await Promise.all([
                team_service_1.default.getUserTeamIds(user.id),
                team_service_1.default.getSupervisedTeamIds(user.id),
            ]);
            logger_1.default.info(`User updated: ${user.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: toUserResponse(fullUser, teamIds, supervisedTeamIds),
            });
        }
        catch (error) {
            next(error);
        }
    }
    async activateUser(req, res, next) {
        try {
            await user_service_1.default.activateUser(req.params.id);
            const fullUser = await user_service_1.default.getUserById(req.params.id);
            logger_1.default.info(`User activated: ${req.params.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: toUserResponse(fullUser),
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deactivateUser(req, res, next) {
        try {
            const user = await user_service_1.default.deactivateUser(req.params.id);
            const fullUser = await user_service_1.default.getUserById(user.id);
            logger_1.default.info(`User deactivated: ${user.email} by ${req.user.email}`);
            return res.json({
                success: true,
                data: toUserResponse(fullUser),
            });
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                throw new errorHandler_1.AppError(400, 'currentPassword and newPassword are required');
            }
            const validation = passwordValidator_1.PasswordValidator.validatePasswordComplexity(newPassword);
            if (!validation.valid) {
                throw new errorHandler_1.AppError(400, validation.errors.join('; '));
            }
            const user = await user_service_1.default.changePassword(req.params.id, currentPassword, newPassword);
            logger_1.default.info(`Password changed for user: ${user.email}`);
            return res.json({ success: true, data: { message: 'Password changed successfully' } });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const user = await user_service_1.default.getUserById(req.params.id);
            await user_service_1.default.deleteUser(req.params.id);
            logger_1.default.info(`User deleted: ${user.email} by ${req.user.email}`);
            return res.json({ success: true, data: { message: 'User deleted successfully' } });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const user = await user_service_1.default.getUserById(req.params.id);
            const tempPassword = user_service_1.default.generateTemporaryPassword();
            await user_service_1.default.setUserPassword(req.params.id, tempPassword);
            logger_1.default.info(`Password reset for user: ${user.email} by ${req.user.email}`);
            return res.json({
                success: true,
                data: {
                    message: 'Password reset successfully',
                    tempPassword,
                    userId: user.id,
                    email: user.email,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async sendInviteEmail(req, res, next) {
        try {
            const user = await user_service_1.default.getUserById(req.params.id);
            const tempPassword = user_service_1.default.generateTemporaryPassword();
            await user_service_1.default.setUserPassword(req.params.id, tempPassword);
            // Send invite email
            const emailService = await Promise.resolve().then(() => __importStar(require('../services/email.service')));
            await emailService.default.sendUserCreatedEmail(user, tempPassword, req.user);
            logger_1.default.info(`Invite email sent to: ${user.email} by ${req.user.email}`);
            return res.json({
                success: true,
                data: {
                    message: 'Invite email sent successfully',
                    email: user.email,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSelf(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Not authenticated');
            }
            const user = await user_service_1.default.getUserById(req.user.id);
            // Flatten the role's permissions to "module:action:scope" strings so the
            // frontend can decide which modules/actions to show for this user.
            const permissions = (user.role?.permissions || []).map((p) => `${p.module}:${p.action}:${p.scope || 'all'}`);
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
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
exports.default = new UserController();
//# sourceMappingURL=user.controller.js.map