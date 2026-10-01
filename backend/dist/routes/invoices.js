"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoice_controller_1 = __importDefault(require("../controllers/invoice.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => invoice_controller_1.default.createInvoice(req, res, next));
router.get('/', (req, res, next) => invoice_controller_1.default.getInvoices(req, res, next));
router.get('/:id', (req, res, next) => invoice_controller_1.default.getInvoice(req, res, next));
router.patch('/:id', (req, res, next) => invoice_controller_1.default.updateInvoice(req, res, next));
router.delete('/:id', (req, res, next) => invoice_controller_1.default.deleteInvoice(req, res, next));
// Payments
router.post('/:id/payments', (req, res, next) => invoice_controller_1.default.recordPayment(req, res, next));
router.get('/:id/payments', (req, res, next) => invoice_controller_1.default.getPayments(req, res, next));
// Financial summary
router.get('/contract/:contractId/summary', (req, res, next) => invoice_controller_1.default.getFinancialSummary(req, res, next));
exports.default = router;
//# sourceMappingURL=invoices.js.map