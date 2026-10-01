"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const Expense_1 = require("../models/Expense");
const Account_1 = require("../models/Account");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(Expense_1.Expense);
class ExpenseController {
    async list(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'expenses', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view expenses');
            }
            const { status, search, fromDate, toDate } = req.query;
            const qb = repo()
                .createQueryBuilder('e')
                .leftJoinAndSelect('e.owner', 'owner')
                .leftJoinAndSelect('e.approvedBy', 'approver')
                .orderBy('e.createdAt', 'DESC');
            // Self-scope: users with only read:self see their own claims.
            const scope = (0, auth_1.getOwnerScope)(req.user, 'expenses');
            if (scope)
                qb.andWhere('e.ownerId = :scope', { scope });
            if (status)
                qb.andWhere('e.status = :status', { status });
            if (search)
                qb.andWhere('(e.location ILIKE :s OR e.reason ILIKE :s)', { s: `%${search}%` });
            if (fromDate)
                qb.andWhere('e.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
            if (toDate)
                qb.andWhere('e.createdAt <= :toDate', { toDate: new Date(toDate) });
            const data = await qb.getMany();
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'expenses', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create expenses');
            }
            const { location, days, accountIds, travelCost, reason } = req.body;
            if (!location)
                throw new errorHandler_1.AppError(400, 'Travel location is required');
            // Snapshot company names from the selected accounts.
            let companyNames = [];
            if (Array.isArray(accountIds) && accountIds.length) {
                const accounts = await database_1.AppDataSource.getRepository(Account_1.Account).find({ where: { id: (0, typeorm_1.In)(accountIds) } });
                companyNames = accounts.map((a) => a.name);
            }
            const expense = repo().create({
                location,
                days: days ? Number(days) : 1,
                accountIds: Array.isArray(accountIds) ? accountIds : [],
                companyNames,
                travelCost: travelCost !== undefined ? Number(travelCost) : 0,
                reason,
                status: 'Pending',
                ownerId: req.user.id,
            });
            await repo().save(expense);
            logger_1.default.info(`Expense submitted by ${req.user.email}`);
            const saved = await repo().findOne({ where: { id: expense.id }, relations: ['owner'] });
            return res.status(201).json({ success: true, data: saved });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'expenses', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update expenses');
            }
            const expense = await repo().findOne({ where: { id: req.params.id } });
            if (!expense)
                throw new errorHandler_1.AppError(404, 'Expense not found');
            // Only the owner may edit their own claim unless they have read:all reach.
            const scope = (0, auth_1.getOwnerScope)(req.user, 'expenses');
            if (scope && expense.ownerId !== scope) {
                throw new errorHandler_1.AppError(403, 'You can only edit your own expenses');
            }
            if (expense.status === 'Approved') {
                throw new errorHandler_1.AppError(400, 'Approved expenses cannot be edited');
            }
            const { location, days, accountIds, travelCost, reason } = req.body;
            if (location !== undefined)
                expense.location = location;
            if (days !== undefined)
                expense.days = Number(days);
            if (travelCost !== undefined)
                expense.travelCost = Number(travelCost);
            if (reason !== undefined)
                expense.reason = reason;
            if (Array.isArray(accountIds)) {
                expense.accountIds = accountIds;
                const accounts = await database_1.AppDataSource.getRepository(Account_1.Account).find({ where: { id: (0, typeorm_1.In)(accountIds) } });
                expense.companyNames = accounts.map((a) => a.name);
            }
            await repo().save(expense);
            return res.json({ success: true, data: expense });
        }
        catch (error) {
            next(error);
        }
    }
    // Approve or reject a claim. Requires the 'approve' permission (Admin/Manager).
    async decide(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'expenses', 'approve')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to approve or reject expenses');
            }
            const { decision, notes } = req.body;
            if (!['Approved', 'Rejected'].includes(decision)) {
                throw new errorHandler_1.AppError(400, 'decision must be Approved or Rejected');
            }
            const expense = await repo().findOne({ where: { id: req.params.id } });
            if (!expense)
                throw new errorHandler_1.AppError(404, 'Expense not found');
            expense.status = decision;
            expense.approvedById = req.user.id;
            expense.approvedAt = new Date();
            expense.approvalNotes = notes || null;
            await repo().save(expense);
            logger_1.default.info(`Expense ${req.params.id} ${decision.toLowerCase()} by ${req.user.email}`);
            const saved = await repo().findOne({ where: { id: expense.id }, relations: ['owner', 'approvedBy'] });
            return res.json({ success: true, data: saved });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'expenses', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete expenses');
            }
            const expense = await repo().findOne({ where: { id: req.params.id } });
            if (!expense)
                throw new errorHandler_1.AppError(404, 'Expense not found');
            const scope = (0, auth_1.getOwnerScope)(req.user, 'expenses');
            if (scope && expense.ownerId !== scope) {
                throw new errorHandler_1.AppError(403, 'You can only delete your own expenses');
            }
            await repo().remove(expense);
            return res.json({ success: true, data: { message: 'Expense deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ExpenseController = ExpenseController;
exports.default = new ExpenseController();
//# sourceMappingURL=expense.controller.js.map