"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierController = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const Supplier_1 = require("../models/Supplier");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(Supplier_1.Supplier);
// createdById and timestamps are system-managed and must not be client-settable.
const SUPPLIER_UPDATABLE = ['name', 'contactPerson', 'email', 'phoneNumber', 'category', 'region', 'country', 'notes'];
class SupplierController {
    async list(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'suppliers', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view suppliers');
            }
            const { search, region, country, category } = req.query;
            const where = {};
            if (region)
                where.region = (0, typeorm_1.ILike)(`%${region}%`);
            if (country)
                where.country = (0, typeorm_1.ILike)(`%${country}%`);
            if (category)
                where.category = (0, typeorm_1.ILike)(`%${category}%`);
            if (search)
                where.name = (0, typeorm_1.ILike)(`%${search}%`);
            const data = await repo().find({ where, order: { name: 'ASC' } });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'suppliers', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create suppliers');
            }
            const { name, contactPerson, email, phoneNumber, category, region, country, notes } = req.body;
            if (!name)
                throw new errorHandler_1.AppError(400, 'Supplier name is required');
            const supplier = repo().create({
                name,
                contactPerson,
                email,
                phoneNumber,
                category,
                region,
                country,
                notes,
                createdById: req.user.id,
            });
            await repo().save(supplier);
            logger_1.default.info(`Supplier created: ${supplier.name} by ${req.user.email}`);
            return res.status(201).json({ success: true, data: supplier });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'suppliers', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update suppliers');
            }
            const supplier = await repo().findOne({ where: { id: req.params.id } });
            if (!supplier)
                throw new errorHandler_1.AppError(404, 'Supplier not found');
            // Whitelist to prevent mass assignment (e.g. forging createdById).
            Object.assign(supplier, (0, pick_1.default)(req.body, SUPPLIER_UPDATABLE));
            await repo().save(supplier);
            return res.json({ success: true, data: supplier });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'suppliers', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete suppliers');
            }
            const supplier = await repo().findOne({ where: { id: req.params.id } });
            if (!supplier)
                throw new errorHandler_1.AppError(404, 'Supplier not found');
            await repo().remove(supplier);
            return res.json({ success: true, data: { message: 'Supplier deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SupplierController = SupplierController;
exports.default = new SupplierController();
//# sourceMappingURL=supplier.controller.js.map