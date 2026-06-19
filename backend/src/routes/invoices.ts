import { Router } from 'express';
import InvoiceController from '../controllers/invoice.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => InvoiceController.createInvoice(req, res, next));
router.get('/', (req, res, next) => InvoiceController.getInvoices(req, res, next));
router.get('/:id', (req, res, next) => InvoiceController.getInvoice(req, res, next));
router.patch('/:id', (req, res, next) => InvoiceController.updateInvoice(req, res, next));
router.delete('/:id', (req, res, next) => InvoiceController.deleteInvoice(req, res, next));

// Payments
router.post('/:id/payments', (req, res, next) => InvoiceController.recordPayment(req, res, next));
router.get('/:id/payments', (req, res, next) => InvoiceController.getPayments(req, res, next));

// Financial summary
router.get('/contract/:contractId/summary', (req, res, next) =>
  InvoiceController.getFinancialSummary(req, res, next)
);

export default router;
