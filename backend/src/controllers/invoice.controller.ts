import { Response, NextFunction } from 'express';
import invoiceService from '../services/invoice.service';
import accountService from '../services/account.service';
import { AuthRequest, canPerformAction, getOwnerScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class InvoiceController {
  // An invoice has no owner column; it inherits ownership from its account.
  // At "self" scope a user may only touch invoices for accounts they own.
  private async assertCanAccessInvoice(
    req: AuthRequest,
    invoice: { account?: { ownerId?: string } },
    action: string
  ) {
    if (getOwnerScope(req.user, 'invoices') === undefined) return; // "all" scope
    if (invoice.account?.ownerId !== req.user!.id) {
      throw new AppError(403, `You can only ${action} invoices for your own accounts`);
    }
  }

  async createInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'invoices', 'create')) {
        throw new AppError(403, 'You do not have permission to create invoices');
      }

      const { invoiceNumber, contractId, accountId, projectId, amount, tax, invoiceDate, dueDate, billingCycle, description } = req.body;

      if (!invoiceNumber || !contractId || !accountId || !amount || !invoiceDate || !dueDate) {
        throw new AppError(400, 'Required fields: invoiceNumber, contractId, accountId, amount, invoiceDate, dueDate');
      }

      // At "self" scope, only allow invoicing against an account the user owns.
      if (getOwnerScope(req.user, 'invoices') !== undefined) {
        const account = await accountService.getAccountById(accountId);
        if (account.ownerId !== req.user!.id) {
          throw new AppError(403, 'You can only create invoices for your own accounts');
        }
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
      if (!canPerformAction(req.user, 'invoices', 'read')) {
        throw new AppError(403, 'You do not have permission to view invoices');
      }

      const { page = 1, limit = 20, accountId, contractId, projectId, status } = req.query;
      const { data, total } = await invoiceService.getInvoices({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        contractId: contractId as string,
        projectId: projectId as string,
        status: status as string,
        // undefined at "all" scope; the user's id at "self" scope.
        accountOwnerId: getOwnerScope(req.user, 'invoices'),
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
      if (!canPerformAction(req.user, 'invoices', 'read')) {
        throw new AppError(403, 'You do not have permission to view invoices');
      }
      const invoice = await invoiceService.getInvoiceById(req.params.id);
      await this.assertCanAccessInvoice(req, invoice, 'view');
      return res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'invoices', 'update')) {
        throw new AppError(403, 'You do not have permission to update invoices');
      }
      const existing = await invoiceService.getInvoiceById(req.params.id);
      await this.assertCanAccessInvoice(req, existing, 'update');

      const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
      logger.info(`Invoice updated: ${invoice.id} by ${req.user?.email}`);
      return res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Recording a payment mutates the invoice, so it requires update rights.
      if (!canPerformAction(req.user, 'invoices', 'update')) {
        throw new AppError(403, 'You do not have permission to record payments');
      }
      const target = await invoiceService.getInvoiceById(req.params.id);
      await this.assertCanAccessInvoice(req, target, 'record payments on');

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
      if (!canPerformAction(req.user, 'invoices', 'read')) {
        throw new AppError(403, 'You do not have permission to view invoices');
      }
      const parent = await invoiceService.getInvoiceById(req.params.id);
      await this.assertCanAccessInvoice(req, parent, 'view');

      const payments = await invoiceService.getPayments(req.params.id);
      return res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'invoices', 'read')) {
        throw new AppError(403, 'You do not have permission to view invoices');
      }
      const summary = await invoiceService.getFinancialSummary(req.params.contractId);
      return res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'invoices', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete invoices');
      }
      const doomed = await invoiceService.getInvoiceById(req.params.id);
      await this.assertCanAccessInvoice(req, doomed, 'delete');

      await invoiceService.deleteInvoice(req.params.id);
      logger.info(`Invoice deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Invoice deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();
