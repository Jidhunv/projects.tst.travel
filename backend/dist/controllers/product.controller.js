"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = __importDefault(require("../services/product.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// Every product column is user-editable.
const PRODUCT_UPDATABLE = [
    'name',
    'sku',
    'description',
    'categoryId',
    'unitPrice',
    'billingType',
    'isActive',
];
class ProductController {
    async createProduct(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'products', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create products');
            }
            const { name, sku, description, categoryId, unitPrice, billingType } = req.body;
            if (!name) {
                throw new errorHandler_1.AppError(400, 'Product name is required');
            }
            const product = await product_service_1.default.createProduct({
                name,
                sku,
                description,
                categoryId,
                unitPrice,
                billingType,
            });
            logger_1.default.info(`Product created: ${product.name} by ${req.user.email}`);
            return res.status(201).json({ success: true, data: product });
        }
        catch (error) {
            next(error);
        }
    }
    async getProducts(req, res, next) {
        try {
            // Products are reference/master data used by dropdowns across the app
            // (Leads, Accounts, Opportunities, Projects, Invoices, Contracts).
            // Any authenticated user may read them; only create is permission-gated.
            const { page = 1, limit = 20, categoryId, isActive, search } = req.query;
            const { data, total } = await product_service_1.default.getProducts({
                page: Number(page),
                limit: Number(limit),
                categoryId: categoryId,
                isActive: isActive === undefined ? undefined : isActive === 'true',
                search: search,
            });
            return res.json({
                success: true,
                data,
                meta: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getProduct(req, res, next) {
        try {
            // Products are reference/master data - accessible to all authenticated users
            const product = await product_service_1.default.getProductById(req.params.id);
            return res.json({ success: true, data: product });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProduct(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'products', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update products');
            }
            const product = await product_service_1.default.updateProduct(req.params.id, (0, pick_1.default)(req.body, PRODUCT_UPDATABLE));
            logger_1.default.info(`Product updated: ${product.id} by ${req.user.email}`);
            return res.json({ success: true, data: product });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteProduct(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'products', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete products');
            }
            await product_service_1.default.deleteProduct(req.params.id);
            logger_1.default.info(`Product deactivated: ${req.params.id} by ${req.user.email}`);
            return res.json({ success: true, data: { message: 'Product deactivated' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProductController = ProductController;
exports.default = new ProductController();
//# sourceMappingURL=product.controller.js.map