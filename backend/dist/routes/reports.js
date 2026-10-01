"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = __importDefault(require("../controllers/report.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/pipeline', (req, res, next) => report_controller_1.default.getPipelineReport(req, res, next));
router.get('/sales', (req, res, next) => report_controller_1.default.getSalesReport(req, res, next));
router.get('/mis', (req, res, next) => report_controller_1.default.getMIS(req, res, next));
router.get('/conversion-timeline', (req, res, next) => report_controller_1.default.getConversionTimeline(req, res, next));
exports.default = router;
//# sourceMappingURL=reports.js.map