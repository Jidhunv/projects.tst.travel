"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Security alerts are shown to admins only.
router.use(auth_1.verifyToken);
router.use((0, auth_1.requireRole)('Admin'));
// Open alerts first, newest first. ?status=open (default) | acknowledged | all
router.get('/', async (req, res, next) => {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : 'open';
        const where = status === 'acknowledged' ? 'WHERE "acknowledgedAt" IS NOT NULL'
            : status === 'all' ? ''
                : 'WHERE "acknowledgedAt" IS NULL';
        const rows = await database_1.AppDataSource.query(`SELECT a.*, u."firstName" || ' ' || u."lastName" AS "acknowledgedBy"
         FROM security_alerts a LEFT JOIN users u ON u.id = a."acknowledgedById"
         ${where}
         ORDER BY a."acknowledgedAt" IS NULL DESC, a."createdAt" DESC
         LIMIT 200`);
        res.json({ success: true, data: rows });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/acknowledge', async (req, res, next) => {
    try {
        const [row] = await database_1.AppDataSource.query(`UPDATE security_alerts SET "acknowledgedAt" = now(), "acknowledgedById" = $2
        WHERE id = $1 AND "acknowledgedAt" IS NULL RETURNING id`, [req.params.id, req.user.id]);
        if (!row)
            throw new errorHandler_1.AppError(404, 'Alert not found or already acknowledged');
        logger_1.default.info(`Security alert ${req.params.id} acknowledged by ${req.user?.email}`);
        res.json({ success: true, data: { id: row.id } });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=securityAlerts.js.map