"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignationController = void 0;
const database_1 = require("../config/database");
const Designation_1 = require("../models/Designation");
const AccountStakeholder_1 = require("../models/AccountStakeholder");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const inputValidator_1 = __importDefault(require("../utils/inputValidator"));
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(Designation_1.Designation);
class DesignationController {
    async list(req, res, next) {
        try {
            // Reference/master data for dropdowns - any authenticated user may read.
            const { isActive } = req.query;
            const where = {};
            if (isActive !== undefined)
                where.isActive = isActive === 'true';
            const data = await repo().find({ where, order: { name: 'ASC' } });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'designations', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create designations');
            }
            const { name } = req.body;
            const nameCheck = inputValidator_1.default.validateString(name, 'Designation name', 1, 255);
            if (!nameCheck.valid) {
                throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
            }
            if (await repo().findOne({ where: { name } })) {
                throw new errorHandler_1.AppError(409, `Designation "${name}" already exists`);
            }
            const designation = repo().create({ name, isActive: true });
            await repo().save(designation);
            logger_1.default.info(`Designation created: ${designation.name} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: designation });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'designations', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update designations');
            }
            const designation = await repo().findOne({ where: { id: req.params.id } });
            if (!designation)
                throw new errorHandler_1.AppError(404, 'Designation not found');
            const { name, isActive } = req.body;
            if (name !== undefined) {
                const nameCheck = inputValidator_1.default.validateString(name, 'Designation name', 1, 255);
                if (!nameCheck.valid)
                    throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
                const clash = await repo().findOne({ where: { name } });
                if (clash && clash.id !== designation.id) {
                    throw new errorHandler_1.AppError(409, `Designation "${name}" already exists`);
                }
                designation.name = name;
            }
            if (isActive !== undefined)
                designation.isActive = Boolean(isActive);
            await repo().save(designation);
            logger_1.default.info(`Designation updated: ${designation.id} by ${req.user?.email}`);
            return res.json({ success: true, data: designation });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'designations', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete designations');
            }
            const designation = await repo().findOne({ where: { id: req.params.id } });
            if (!designation)
                throw new errorHandler_1.AppError(404, 'Designation not found');
            const inUse = await database_1.AppDataSource.getRepository(AccountStakeholder_1.AccountStakeholder).count({
                where: { designationId: designation.id },
            });
            if (inUse > 0) {
                designation.isActive = false;
                await repo().save(designation);
                logger_1.default.info(`Designation deactivated (in use by ${inUse}): ${designation.id}`);
                return res.json({
                    success: true,
                    data: { message: `Designation is used by ${inUse} stakeholder mapping(s), so it was deactivated rather than deleted.` },
                });
            }
            await repo().remove(designation);
            logger_1.default.info(`Designation deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Designation deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DesignationController = DesignationController;
exports.default = new DesignationController();
//# sourceMappingURL=designation.controller.js.map