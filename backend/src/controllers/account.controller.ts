import { Request, Response, NextFunction } from 'express';
import accountService from '../services/account.service';
import { AuthRequest, getOwnerScope, canAccessRecord, canPerformAction, canReassign } from '../middleware/auth';
import userService from '../services/user.service';
import { AppError } from '../middleware/errorHandler';
import InputValidator from '../utils/inputValidator';
import pick from '../utils/pick';
import logger from '../utils/logger';

export class AccountController {
  async createAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Enforce RBAC: the account:create toggle must actually gate creation,
      // otherwise any authenticated user can create accounts regardless of role.
      if (!canPerformAction(req.user, 'accounts', 'create')) {
        throw new AppError(403, 'You do not have permission to create accounts');
      }

      const { name, industry, size, website, phoneNumber, alternatePhoneNumber, email, remark, type, contactPerson, city, region, country } = req.body;

      // Validate required fields
      const nameValidation = InputValidator.validateString(name, 'Account name', 1, 100);
      if (!nameValidation.valid) {
        throw new AppError(400, nameValidation.errors.join(', '));
      }

      // Validate optional fields
      if (website) {
        const urlValidation = InputValidator.validateUrl(website);
        if (!urlValidation.valid) {
          throw new AppError(400, urlValidation.errors.join(', '));
        }
      }

      if (phoneNumber) {
        const phoneValidation = InputValidator.validatePhone(phoneNumber);
        if (!phoneValidation.valid) {
          throw new AppError(400, phoneValidation.errors.join(', '));
        }
      }

      if (email) {
        const emailValidation = InputValidator.validateEmail(email);
        if (!emailValidation.valid) {
          throw new AppError(400, emailValidation.errors.join(', '));
        }
      }

      const account = await accountService.createAccount({
        name,
        industry,
        size,
        website,
        phoneNumber,
        alternatePhoneNumber,
        // The column is unique, so omit an empty address entirely (stored as
        // NULL) rather than saving "" -- a second blank would collide.
        email: email || undefined,
        remark,
        type,
        contactPerson,
        city,
        region,
        country,
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
      const { page = 1, limit = 20, status, type, ownerId, search, city, region, country } = req.query;

      // Sales Reps see only their own accounts; Admin/Manager see all.
      const scope = getOwnerScope(req.user, 'accounts');
      const effectiveOwnerId = scope ?? (ownerId as string);

      const { data, total } = await accountService.getAccounts({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        type: type as string,
        ownerId: effectiveOwnerId,
        search: search as string,
        city: city as string,
        region: region as string,
        country: country as string,
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
      const account = await accountService.getAccountById(id);

      if (!canAccessRecord(req.user, 'accounts', account.ownerId, 'read', account.assigneeIds)) {
        throw new AppError(403, 'You can only view your own accounts');
      }

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

      // Authorization: must have update permission AND be allowed to touch this record.
      if (!canPerformAction(req.user, 'accounts', 'update')) {
        throw new AppError(403, 'You do not have permission to update accounts');
      }
      const existing = await accountService.getAccountById(id);
      if (!canAccessRecord(req.user, 'accounts', existing.ownerId, 'update', existing.assigneeIds)) {
        throw new AppError(403, 'You can only update your own accounts');
      }

      // Whitelist updatable fields to prevent mass assignment (e.g. reassigning ownerId).
      // Anything missing here is silently dropped, so a field the edit form sends
      // will appear to save and then not persist -- which is exactly what happened
      // to email and remark. Keep this in step with the Account model.
      const allowed = [
        'name', 'industry', 'size', 'website', 'phoneNumber', 'alternatePhoneNumber', 'email', 'remark', 'type', 'status',
        'contactPerson', 'city', 'region', 'country',
        'billingStreet', 'billingCity', 'billingState', 'billingZip', 'billingCountry',
        'shippingStreet', 'shippingCity', 'shippingState', 'shippingZip', 'shippingCountry',
        'onboardingStatus', 'onboardingDate', 'onboardingCompletedDate', 'onboardingNotes',
        'contractSignedDate', 'goLiveDate', 'accountManager', 'billingContact', 'technicalContact', 'tags',
      ];
      const updates: any = pick(req.body, allowed);

      // Validate the same fields create does. An empty string clears the value.
      if (updates.email) {
        const emailCheck = InputValidator.validateEmail(updates.email);
        if (!emailCheck.valid) {
          throw new AppError(400, emailCheck.errors.join(', '));
        }
      }
      if (updates.website) {
        const urlCheck = InputValidator.validateUrl(updates.website);
        if (!urlCheck.valid) {
          throw new AppError(400, urlCheck.errors.join(', '));
        }
      }
      if (updates.phoneNumber) {
        const phoneCheck = InputValidator.validatePhone(updates.phoneNumber);
        if (!phoneCheck.valid) {
          throw new AppError(400, phoneCheck.errors.join(', '));
        }
      }
      // The column is unique, so normalise "" to null rather than letting a
      // second blank collide with the first.
      if (updates.email === '') updates.email = null;

      const account = await accountService.updateAccount(id, updates);

      logger.info(`Account updated: ${account.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  // Assign an account to one or more users (Admin/Manager only).
  async assignAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canReassign(req.user, 'accounts')) {
        throw new AppError(403, 'You do not have permission to reassign accounts');
      }
      const ids: string[] = Array.isArray(req.body.ownerIds)
        ? req.body.ownerIds
        : req.body.ownerId ? [req.body.ownerId] : [];
      if (!ids.length) throw new AppError(400, 'ownerIds is required');
      for (const id of ids) await userService.getUserById(id);
      const account = await accountService.updateAccount(req.params.id, { ownerId: ids[0], assigneeIds: ids } as any);
      logger.info(`Account ${account.id} assigned to [${ids.join(', ')}] by ${req.user!.email}`);
      return res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!canPerformAction(req.user, 'accounts', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete accounts');
      }
      const existing = await accountService.getAccountById(id);
      if (!canAccessRecord(req.user, 'accounts', existing.ownerId, 'delete', existing.assigneeIds)) {
        throw new AppError(403, 'You can only delete your own accounts');
      }

      await accountService.deleteAccount(id);

      logger.info(`Account deleted: ${id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  // Contacts belong to an account and inherit its ownership. Every contact
  // operation must therefore verify the caller may act on the parent account,
  // otherwise a user can read or mutate contacts on accounts they do not own
  // simply by passing another account's id (IDOR).
  private async assertCanAccessAccount(
    req: AuthRequest,
    accountId: string,
    action: 'read' | 'update' | 'delete'
  ) {
    const account = await accountService.getAccountById(accountId);
    if (!canAccessRecord(req.user, 'accounts', account.ownerId, action, account.assigneeIds)) {
      throw new AppError(403, 'You can only manage contacts for your own accounts');
    }
    return account;
  }

  // Contact management
  async addContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;
      await this.assertCanAccessAccount(req, accountId, 'update');
      const { firstName, lastName, email, phoneNumber, jobTitle, role } = req.body;

      if (!firstName || !lastName || !email) {
        throw new AppError(400, 'First name, last name, and email are required');
      }

      const contact = await accountService.addContact(accountId, {
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
      await this.assertCanAccessAccount(req, accountId, 'read');
      const contacts = await accountService.getAccountContacts(accountId);

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
      await this.assertCanAccessAccount(req, accountId, 'update');

      // Whitelist updatable fields to prevent mass assignment (e.g. a client
      // setting isPrimary, accountId, or system columns via the raw body).
      const updates = pick(req.body, ['firstName', 'lastName', 'email', 'phoneNumber', 'jobTitle', 'role']);

      const contact = await accountService.updateContact(accountId, contactId, updates);

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
      // Removing a contact modifies the parent account's contact list, so it
      // requires 'update' on the account -- not account-level 'delete'.
      await this.assertCanAccessAccount(req, accountId, 'update');
      await accountService.deleteContact(accountId, contactId);

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
      await this.assertCanAccessAccount(req, accountId, 'update');

      const contact = await accountService.setPrimaryContact(accountId, contactId);

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
