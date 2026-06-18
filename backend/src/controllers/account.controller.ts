import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class AccountController {
  async createAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, industry, size, website, phoneNumber, type } = req.body;

      if (!name) {
        throw new AppError(400, 'Account name is required');
      }

      const account = await AccountService.createAccount({
        name,
        industry,
        size,
        website,
        phoneNumber,
        type,
        ownerId: req.user!.id,
      });

      logger.info(`Account created: ${account.name} by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccounts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, type, ownerId, search } = req.query;

      const { data, total } = await AccountService.getAccounts({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        type: type as string,
        ownerId: ownerId as string,
        search: search as string,
      });

      return res.json({
        success: true,
        data,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const account = await AccountService.getAccountById(id);

      return res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const account = await AccountService.updateAccount(id, updates);

      logger.info(`Account updated: ${account.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AccountService.deleteAccount(id);

      logger.info(`Account deleted: ${id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  // Contact management
  async addContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;
      const { firstName, lastName, email, phoneNumber, jobTitle, role } = req.body;

      if (!firstName || !lastName || !email) {
        throw new AppError(400, 'First name, last name, and email are required');
      }

      const contact = await AccountService.addContact(accountId, {
        firstName,
        lastName,
        email,
        phoneNumber,
        jobTitle,
        role,
      });

      logger.info(`Contact added to account ${accountId}: ${contact.email}`);

      return res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async getContacts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;
      const contacts = await AccountService.getAccountContacts(accountId);

      return res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, contactId } = req.params;
      const updates = req.body;

      const contact = await AccountService.updateContact(accountId, contactId, updates);

      logger.info(`Contact updated: ${contactId} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, contactId } = req.params;
      await AccountService.deleteContact(accountId, contactId);

      logger.info(`Contact deleted: ${contactId} from account ${accountId}`);

      return res.json({
        success: true,
        data: { message: 'Contact deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async setPrimaryContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, contactId } = req.params;

      const contact = await AccountService.setPrimaryContact(accountId, contactId);

      logger.info(`Primary contact set for account ${accountId}: ${contactId}`);

      return res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AccountController();
