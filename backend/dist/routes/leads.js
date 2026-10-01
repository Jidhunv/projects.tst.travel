"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_controller_1 = __importDefault(require("../controllers/lead.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => lead_controller_1.default.createLead(req, res, next));
router.get('/', (req, res, next) => lead_controller_1.default.getLeads(req, res, next));
router.get('/:id', (req, res, next) => lead_controller_1.default.getLead(req, res, next));
router.patch('/:id', (req, res, next) => lead_controller_1.default.updateLead(req, res, next));
router.delete('/:id', (req, res, next) => lead_controller_1.default.deleteLead(req, res, next));
router.patch('/:id/status', (req, res, next) => lead_controller_1.default.updateLeadStatus(req, res, next));
router.patch('/:id/assign', (req, res, next) => lead_controller_1.default.assignLead(req, res, next));
router.post('/:id/convert-to-account', (req, res, next) => lead_controller_1.default.convertLeadToAccount(req, res, next));
router.post('/:id/convert-to-opportunity', (req, res, next) => lead_controller_1.default.convertToOpportunity(req, res, next));
router.patch('/:id/lost', (req, res, next) => lead_controller_1.default.markLost(req, res, next));
router.post('/bulk-import', (req, res, next) => lead_controller_1.default.bulkImport(req, res, next));
exports.default = router;
//# sourceMappingURL=leads.js.map