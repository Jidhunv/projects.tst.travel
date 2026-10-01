"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trace_controller_1 = __importDefault(require("../controllers/trace.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Traces expose an inventory of every endpoint called, with query strings and
// timings. That was previously readable by anyone with the URL ("don't require
// auth (for debugging)"), which is unauthenticated information disclosure.
// It is a debugging tool, so restrict it to authenticated admins.
router.use(auth_1.verifyToken);
router.use((0, auth_1.requireRole)('Admin'));
router.get('/', (req, res, next) => trace_controller_1.default.getTraceList(req, res));
router.get('/:traceId', (req, res, next) => trace_controller_1.default.getTrace(req, res));
router.get('/:traceId/view', (req, res, next) => trace_controller_1.default.getTraceVisualization(req, res));
router.get('/:traceId/dot', (req, res, next) => trace_controller_1.default.getTraceDot(req, res));
exports.default = router;
//# sourceMappingURL=traces.js.map