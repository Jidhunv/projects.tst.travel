"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryController = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const Country_1 = require("../models/Country");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(Country_1.Country);
class CountryController {
    async list(req, res, next) {
        try {
            // Countries are reference/master data used by dropdowns across the app
            // (Leads form, accounts, etc). Any authenticated user may read them; only
            // create is permission-gated. No per-module read permission is required.
            const { search } = req.query;
            const where = {};
            if (search) {
                where.name = (0, typeorm_1.ILike)(`%${search}%`);
            }
            const data = await repo().find({
                where,
                order: { name: 'ASC' },
            });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'countries', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create countries');
            }
            const { code, name, region } = req.body;
            if (!code || !name) {
                throw new errorHandler_1.AppError(400, 'Country code and name are required');
            }
            const upperCode = code.toUpperCase();
            const existing = await repo().findOne({ where: { code: upperCode } });
            if (existing) {
                throw new errorHandler_1.AppError(400, `Country with code "${upperCode}" already exists`);
            }
            const country = repo().create({
                code: upperCode,
                name,
                region,
            });
            await repo().save(country);
            logger_1.default.info(`Country created: ${country.name} (${country.code})`);
            return res.status(201).json({ success: true, data: country });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CountryController = CountryController;
exports.default = new CountryController();
//# sourceMappingURL=country.controller.js.map