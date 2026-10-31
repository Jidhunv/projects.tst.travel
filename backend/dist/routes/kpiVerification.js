"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kpiVerification_controller_1 = __importDefault(require("../controllers/kpiVerification.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/days', (req, res, next) => kpiVerification_controller_1.default.getDays(req, res, next));
router.put('/values', (req, res, next) => kpiVerification_controller_1.default.saveSupervisorValue(req, res, next));
router.post('/approve', (req, res, next) => kpiVerification_controller_1.default.approveDay(req, res, next));
router.post('/unlock', (req, res, next) => kpiVerification_controller_1.default.unlockDay(req, res, next));
router.get('/weights', (req, res, next) => kpiVerification_controller_1.default.getWeights(req, res, next));
router.get('/targets', (req, res, next) => kpiVerification_controller_1.default.getTargets(req, res, next));
router.put('/targets', (req, res, next) => kpiVerification_controller_1.default.saveTarget(req, res, next));
router.put('/weights', (req, res, next) => kpiVerification_controller_1.default.saveWeights(req, res, next));
exports.default = router;
//# sourceMappingURL=kpiVerification.js.map