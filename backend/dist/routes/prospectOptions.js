"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const prospectOptions_service_1 = require("../services/prospectOptions.service");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// Anyone signed in can read the options (the Prospecting form needs them). Changing them needs the master-data privilege.
router.get('/', async (req, res, next) => {
    try {
        const where = typeof req.query.category === 'string' && (0, prospectOptions_service_1.isProspectOptionCategory)(req.query.category)
            ? 'WHERE category = $1' : '';
        const args = where ? [req.query.category] : [];
        const rows = await database_1.AppDataSource.query(`SELECT id, category, name, "isActive" FROM prospect_options ${where} ORDER BY category, name`, args);
        res.json({ success: true, data: rows });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        if (!(0, auth_1.canPerformAction)(req.user, 'prospect_options', 'create'))
            throw new errorHandler_1.AppError(403, 'You do not have permission to add prospect options');
        const { category, name } = req.body ?? {};
        if (!(0, prospectOptions_service_1.isProspectOptionCategory)(category))
            throw new errorHandler_1.AppError(400, 'Category must be businessType, employeeBand or branch');
        const clean = typeof name === 'string' ? name.trim() : '';
        if (!clean || clean.length > 255)
            throw new errorHandler_1.AppError(400, 'Option name is required (max 255 characters)');
        const [row] = await database_1.AppDataSource.query(`INSERT INTO prospect_options (category, name) VALUES ($1, $2)
       ON CONFLICT (category, name) DO UPDATE SET "isActive" = TRUE, "updatedAt" = now()
       RETURNING id, category, name, "isActive"`, [category, clean]);
        logger_1.default.info(`Prospect option added: ${category} ${clean} by ${req.user?.email}`);
        res.status(201).json({ success: true, data: row });
    }
    catch (error) {
        next(error);
    }
});
// Rename or activate/deactivate an option. Deactivating keeps existing answers readable.
router.patch('/:id', async (req, res, next) => {
    try {
        if (!(0, auth_1.canPerformAction)(req.user, 'prospect_options', 'update'))
            throw new errorHandler_1.AppError(403, 'You do not have permission to change prospect options');
        const sets = [];
        const args = [];
        if (typeof req.body?.name === 'string') {
            const clean = req.body.name.trim();
            if (!clean || clean.length > 255)
                throw new errorHandler_1.AppError(400, 'Option name is required (max 255 characters)');
            args.push(clean);
            sets.push(`name = $${args.length}`);
        }
        if (typeof req.body?.isActive === 'boolean') {
            args.push(req.body.isActive);
            sets.push(`"isActive" = $${args.length}`);
        }
        if (!sets.length)
            throw new errorHandler_1.AppError(400, 'Nothing to change');
        args.push(req.params.id);
        const [row] = await database_1.AppDataSource.query(`UPDATE prospect_options SET ${sets.join(', ')}, "updatedAt" = now() WHERE id = $${args.length}
       RETURNING id, category, name, "isActive"`, args);
        if (!row)
            throw new errorHandler_1.AppError(404, 'Option not found');
        res.json({ success: true, data: row });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=prospectOptions.js.map