import { Response, NextFunction } from 'express';
import invoiceService from '../services/invoice.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class InvoiceController {
  async createInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { invoiceNumber, contractId, accountId, projectId, amount, tax, invoiceDate, dueDate, billingCycle, description } = req.body;

      if (!invoiceNumber || !contractId || !accountId || !amount || !invoiceDate || !dueDate) {
        throw new AppError(400, 'Required fields: invoiceNumber, contractId, accountId, amount, invoiceDate, dueDate');
      }

      const invoice = await invoiceService.createInvoice({
        invoiceNumber,
        contractId,
        accountId,
        projectId,
        amount: Number(amount),
        tax: tax ? Number(tax) : undefined,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        billingCycle,
        description,
      });

      logger.info(`Invoice created: ${invoice.invoiceNumber} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, accountId, contractId, projectId, status } = req.query;
      const { data, total } = await invoiceService.getInvoices({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        contractId: contractId as string,
        projectId: projectId as string,
        status: status as string,
      });

      return res.json({
        success: true,
        data,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id);
      return res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
      logger.info(`Invoice updated: ${invoice.id} by ${req.user?.email}`);
      return res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { amount, paymentDate, paymentMethod, transactionReference } = req.body;

      if (!amount || !paymentDate || !paymentMethod) {
        throw new AppError(400, 'Required fields: amount, paymentDate, paymentMethod');
      }

      const payment = await invoiceService.recordPayment(req.params.id, {
        amount: Number(amount),
        paymentDate: new Date(paymentDate),
        paymentMethod,
        transactionReference,
      });

      logger.info(`Payment recorded on invoice ${req.params.id}: ${amount} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payments = await invoiceService.getPayments(req.params.id);
      return res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await invoiceService.getFinancialSummary(req.params.contractId);
      return res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await invoiceService.deleteInvoice(req.params.id);
      logger.info(`Invoice deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Invoice deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();
