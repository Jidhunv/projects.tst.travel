"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_log_controller_1 = __importDefault(require("../controllers/audit-log.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Audit logs are sensitive - restrict to Admin users only
router.use(auth_1.verifyToken);
router.use((0, auth_1.requireRole)('Admin'));
router.get('/', (req, res, next) => audit_log_controller_1.default.getAuditLogs(req, res, next));
router.get('/:entityType/:entityId', (req, res, next) => audit_log_controller_1.default.getEntityAuditTrail(req, res, next));
exports.default = router;
//# sourceMappingURL=audit-logs.js.map