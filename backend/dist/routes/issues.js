"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const issue_controller_1 = __importDefault(require("../controllers/issue.controller"));
const auth_1 = require("../middleware/auth");
// Mounted at /api/issues: the per-client issue log inside tickets.
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/workflow', (req, res) => issue_controller_1.default.workflow(req, res));
router.get('/assignees', (req, res, next) => issue_controller_1.default.assignees(req, res, next));
router.get('/clients', (req, res, next) => issue_controller_1.default.clients(req, res, next));
router.get('/sla-report', (req, res, next) => issue_controller_1.default.slaReport(req, res, next));
router.get('/', (req, res, next) => issue_controller_1.default.list(req, res, next));
router.post('/', (req, res, next) => issue_controller_1.default.create(req, res, next));
router.patch('/:id', (req, res, next) => issue_controller_1.default.update(req, res, next));
router.post('/:id/stage', (req, res, next) => issue_controller_1.default.move(req, res, next));
router.get('/:id/history', (req, res, next) => issue_controller_1.default.history(req, res, next));
router.delete('/:id', (req, res, next) => issue_controller_1.default.remove(req, res, next));
exports.default = router;
//# sourceMappingURL=issues.js.map