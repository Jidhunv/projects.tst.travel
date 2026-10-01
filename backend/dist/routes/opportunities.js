"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const opportunity_controller_1 = __importDefault(require("../controllers/opportunity.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => opportunity_controller_1.default.createOpportunity(req, res, next));
router.get('/', (req, res, next) => opportunity_controller_1.default.getOpportunities(req, res, next));
router.get('/:id', (req, res, next) => opportunity_controller_1.default.getOpportunity(req, res, next));
router.patch('/:id', (req, res, next) => opportunity_controller_1.default.updateOpportunity(req, res, next));
router.patch('/:id/admin-dates', (req, res, next) => opportunity_controller_1.default.adminUpdateDates(req, res, next));
router.delete('/:id', (req, res, next) => opportunity_controller_1.default.deleteOpportunity(req, res, next));
router.patch('/:id/stage', (req, res, next) => opportunity_controller_1.default.updateStage(req, res, next));
router.patch('/:id/assign', (req, res, next) => opportunity_controller_1.default.assignOpportunity(req, res, next));
router.post('/:id/close', (req, res, next) => opportunity_controller_1.default.closeOpportunity(req, res, next));
// Line items
router.post('/:opportunityId/line-items', (req, res, next) => opportunity_controller_1.default.addLineItem(req, res, next));
router.patch('/:opportunityId/line-items/:lineItemId', (req, res, next) => opportunity_controller_1.default.updateLineItem(req, res, next));
router.delete('/:opportunityId/line-items/:lineItemId', (req, res, next) => opportunity_controller_1.default.deleteLineItem(req, res, next));
// Fixed rejection-reason list for the "lose deal" dropdown
router.get('/meta/rejection-reasons', (req, res, next) => opportunity_controller_1.default.getRejectionReasons(req, res, next));
// Pipeline and forecasting
router.get('/pipeline/view', (req, res, next) => opportunity_controller_1.default.getPipeline(req, res, next));
router.get('/pipeline/forecast', (req, res, next) => opportunity_controller_1.default.getForecast(req, res, next));
exports.default = router;
//# sourceMappingURL=opportunities.js.map