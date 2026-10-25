"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyTypeController = void 0;
const database_1 = require("../config/database");
const CompanyType_1 = require("../models/CompanyType");
const Account_1 = require("../models/Account");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const inputValidator_1 = __importDefault(require("../utils/inputValidator"));
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(CompanyType_1.CompanyType);
class CompanyTypeController {
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
            if (!(0, auth_1.canPerformAction)(req.user, 'company_types', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create company types');
            }
            const { name } = req.body;
            const nameCheck = inputValidator_1.default.validateString(name, 'Company type name', 1, 255);
            if (!nameCheck.valid) {
                throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
            }
            if (await repo().findOne({ where: { name } })) {
                throw new errorHandler_1.AppError(409, `Company type "${name}" already exists`);
            }
            const companyType = repo().create({ name, isActive: true });
            await repo().save(companyType);
            logger_1.default.info(`Company type created: ${companyType.name} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: companyType });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'company_types', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update company types');
            }
            const companyType = await repo().findOne({ where: { id: req.params.id } });
            if (!companyType)
                throw new errorHandler_1.AppError(404, 'Company type not found');
            const { name, isActive } = req.body;
            if (name !== undefined) {
                const nameCheck = inputValidator_1.default.validateString(name, 'Company type name', 1, 255);
                if (!nameCheck.valid)
                    throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
                const clash = await repo().findOne({ where: { name } });
                if (clash && clash.id !== companyType.id) {
                    throw new errorHandler_1.AppError(409, `Company type "${name}" already exists`);
                }
                companyType.name = name;
            }
            if (isActive !== undefined)
                companyType.isActive = Boolean(isActive);
            await repo().save(companyType);
            logger_1.default.info(`Company type updated: ${companyType.id} by ${req.user?.email}`);
            return res.json({ success: true, data: companyType });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'company_types', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete company types');
            }
            const companyType = await repo().findOne({ where: { id: req.params.id } });
            if (!companyType)
                throw new errorHandler_1.AppError(404, 'Company type not found');
            const inUse = await database_1.AppDataSource.getRepository(Account_1.Account).count({
                where: { companyTypeId: companyType.id },
            });
            if (inUse > 0) {
                companyType.isActive = false;
                await repo().save(companyType);
                logger_1.default.info(`Company type deactivated (in use by ${inUse}): ${companyType.id}`);
                return res.json({
                    success: true,
                    data: { message: `Company type is used by ${inUse} account(s), so it was deactivated rather than deleted.` },
                });
            }
            await repo().remove(companyType);
            logger_1.default.info(`Company type deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Company type deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanyTypeController = CompanyTypeController;
exports.default = new CompanyTypeController();
//# sourceMappingURL=companyType.controller.js.map