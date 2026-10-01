"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCategoryController = void 0;
const database_1 = require("../config/database");
const ProductCategory_1 = require("../models/ProductCategory");
const Product_1 = require("../models/Product");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const inputValidator_1 = __importDefault(require("../utils/inputValidator"));
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(ProductCategory_1.ProductCategory);
class ProductCategoryController {
    async list(req, res, next) {
        try {
            // Product categories are reference/master data used by product dropdowns across the app.
            // Any authenticated user may read them; only create is permission-gated. No per-module
            // read permission is required.
            const { isActive } = req.query;
            const where = {};
            if (isActive !== undefined)
                where.isActive = isActive === 'true';
            const data = await repo().find({
                where,
                order: { displayOrder: 'ASC', name: 'ASC' },
            });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'product_categories', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create product categories');
            }
            const { name, description, code, displayOrder } = req.body;
            const nameCheck = inputValidator_1.default.validateString(name, 'Category name', 1, 100);
            if (!nameCheck.valid) {
                throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
            }
            if (await repo().findOne({ where: { name } })) {
                throw new errorHandler_1.AppError(409, 'A category with this name already exists');
            }
            if (code && (await repo().findOne({ where: { code } }))) {
                throw new errorHandler_1.AppError(409, 'A category with this code already exists');
            }
            const category = repo().create({
                name,
                description,
                code: code || undefined,
                displayOrder: displayOrder ? Number(displayOrder) : 0,
                isActive: true,
            });
            await repo().save(category);
            logger_1.default.info(`Product category created: ${category.name} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: category });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'product_categories', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update product categories');
            }
            const category = await repo().findOne({ where: { id: req.params.id } });
            if (!category)
                throw new errorHandler_1.AppError(404, 'Category not found');
            const { name, description, code, displayOrder, isActive } = req.body;
            if (name !== undefined) {
                const nameCheck = inputValidator_1.default.validateString(name, 'Category name', 1, 100);
                if (!nameCheck.valid)
                    throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
                const clash = await repo().findOne({ where: { name } });
                if (clash && clash.id !== category.id) {
                    throw new errorHandler_1.AppError(409, 'A category with this name already exists');
                }
                category.name = name;
            }
            if (code !== undefined) {
                if (code) {
                    const clash = await repo().findOne({ where: { code } });
                    if (clash && clash.id !== category.id) {
                        throw new errorHandler_1.AppError(409, 'A category with this code already exists');
                    }
                }
                category.code = code || null;
            }
            if (description !== undefined)
                category.description = description;
            if (displayOrder !== undefined)
                category.displayOrder = Number(displayOrder);
            if (isActive !== undefined)
                category.isActive = Boolean(isActive);
            await repo().save(category);
            logger_1.default.info(`Product category updated: ${category.id} by ${req.user?.email}`);
            return res.json({ success: true, data: category });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'product_categories', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete product categories');
            }
            const category = await repo().findOne({ where: { id: req.params.id } });
            if (!category)
                throw new errorHandler_1.AppError(404, 'Category not found');
            // Products reference categories by FK, so removing one that is still in
            // use would orphan those rows. Deactivate instead of deleting, matching
            // how products themselves are retired.
            const inUse = await database_1.AppDataSource.getRepository(Product_1.Product).count({
                where: { categoryId: category.id },
            });
            if (inUse > 0) {
                category.isActive = false;
                await repo().save(category);
                logger_1.default.info(`Product category deactivated (in use by ${inUse}): ${category.id}`);
                return res.json({
                    success: true,
                    data: { message: `Category is used by ${inUse} product(s), so it was deactivated rather than deleted.` },
                });
            }
            await repo().remove(category);
            logger_1.default.info(`Product category deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Category deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProductCategoryController = ProductCategoryController;
exports.default = new ProductCategoryController();
//# sourceMappingURL=product-category.controller.js.map