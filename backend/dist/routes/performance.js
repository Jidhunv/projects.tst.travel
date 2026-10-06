"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const performance_controller_1 = __importDefault(require("../controllers/performance.controller"));
const auth_1 = require("../middleware/auth");
// Mounted at /api/performance: sales statistics, targets, and staff KPIs.
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/overview', (req, res, next) => performance_controller_1.default.overview(req, res, next));
router.get('/targets', (req, res, next) => performance_controller_1.default.listTargets(req, res, next));
router.post('/targets', (req, res, next) => performance_controller_1.default.createTarget(req, res, next));
router.patch('/targets/:id', (req, res, next) => performance_controller_1.default.updateTarget(req, res, next));
router.delete('/targets/:id', (req, res, next) => performance_controller_1.default.deleteTarget(req, res, next));
router.get('/kpis', (req, res, next) => performance_controller_1.default.listDefinitions(req, res, next));
router.post('/kpis', (req, res, next) => performance_controller_1.default.createDefinition(req, res, next));
router.patch('/kpis/:id', (req, res, next) => performance_controller_1.default.updateDefinition(req, res, next));
router.delete('/kpis/:id', (req, res, next) => performance_controller_1.default.deleteDefinition(req, res, next));
router.get('/kpi-summary', (req, res, next) => performance_controller_1.default.kpiSummary(req, res, next));
router.get('/kpi-entries', (req, res, next) => performance_controller_1.default.listEntries(req, res, next));
router.post('/kpi-entries', (req, res, next) => performance_controller_1.default.createEntry(req, res, next));
router.patch('/kpi-entries/:id', (req, res, next) => performance_controller_1.default.updateEntry(req, res, next));
router.delete('/kpi-entries/:id', (req, res, next) => performance_controller_1.default.deleteEntry(req, res, next));
router.get('/projections', (req, res, next) => performance_controller_1.default.listProjections(req, res, next));
router.put('/projections', (req, res, next) => performance_controller_1.default.saveProjection(req, res, next));
router.delete('/projections/:id', (req, res, next) => performance_controller_1.default.deleteProjection(req, res, next));
router.get('/kpi-audit', (req, res, next) => performance_controller_1.default.auditTrail(req, res, next));
router.get('/meeting-report', (req, res, next) => performance_controller_1.default.meetingReport(req, res, next));
exports.default = router;
//# sourceMappingURL=performance.js.map