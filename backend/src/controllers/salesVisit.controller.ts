import { Response, NextFunction } from 'express';
import { Between, ILike } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SalesVisit } from '../models/SalesVisit';
import { Account } from '../models/Account';
import { AuthRequest, canPerformAction, getOwnerScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(SalesVisit);

export class SalesVisitController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'sales_visits', 'read')) {
        throw new AppError(403, 'You do not have permission to view sales visits');
      }
      const { search, accountId, visitType, fromDate, toDate } = req.query;

      const qb = repo()
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.createdBy', 'creator')
        .leftJoinAndSelect('v.account', 'account')
        .orderBy('v.visitDate', 'DESC');

      // Self-scope: users with only read:self see their own visits.
      const scope = getOwnerScope(req.user, 'sales_visits');
      if (scope) qb.andWhere('v.createdById = :scope', { scope });

      if (accountId) qb.andWhere('v.accountId = :accountId', { accountId });
      if (visitType) qb.andWhere('v.visitType = :visitType', { visitType });
      if (search) qb.andWhere('(v.discussion ILIKE :s OR v.companyName ILIKE :s)', { s: `%${search}%` });
      if (fromDate) qb.andWhere('v.visitDate >= :fromDate', { fromDate: new Date(fromDate as string) });
      if (toDate) qb.andWhere('v.visitDate <= :toDate', { toDate: new Date(toDate as string) });

      const data = await qb.getMany();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'sales_visits', 'create')) {
        throw new AppError(403, 'You do not have permission to log sales visits');
      }
      const { accountId, companyName, visitType, discussion, visitDate, followupDate, followupNotes, followupCompleted } = req.body;
      if (!discussion) throw new AppError(400, 'Please describe what was discussed');

      // Snapshot the company name from the account when available.
      let resolvedCompany = companyName;
      if (accountId && !resolvedCompany) {
        const account = await AppDataSource.getRepository(Account).findOne({ where: { id: accountId } });
        resolvedCompany = account?.name;
      }

      const visit = repo().create({
        accountId: accountId || null,
        companyName: resolvedCompany,
        visitType: visitType || 'Visit',
        discussion,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        followupDate: followupDate && followupDate !== '' ? new Date(followupDate) : (null as any),
        followupNotes: followupNotes || null,
        followupCompleted: Boolean(followupCompleted) || false,
        createdById: req.user!.id,
      });

      try {
        await repo().save(visit);
        logger.info(`Sales visit logged by ${req.user!.email}`);
        const saved = await repo().findOne({ where: { id: visit.id }, relations: ['createdBy', 'account'] });
        return res.status(201).json({ success: true, data: saved });
      } catch (dbError: any) {
        logger.error('Failed to save sales visit:', dbError.message);
        throw new AppError(400, `Failed to save sales visit: ${dbError.message}`);
      }
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'sales_visits', 'update')) {
        throw new AppError(403, 'You do not have permission to update sales visits');
      }
      const visit = await repo().findOne({ where: { id: req.params.id } });
      if (!visit) throw new AppError(404, 'Sales visit not found');
      // self-scoped users may only edit their own entries
      const uScope = getOwnerScope(req.user, 'sales_visits');
      if (uScope && visit.createdById !== uScope) {
        throw new AppError(403, 'You can only edit your own sales visits');
      }
      const { companyName, visitType, discussion, visitDate, accountId, followupDate, followupNotes, followupCompleted } = req.body;

      try {
        if (companyName !== undefined) visit.companyName = companyName;
        if (visitType !== undefined) visit.visitType = visitType;
        if (discussion !== undefined) visit.discussion = discussion;
        if (accountId !== undefined) visit.accountId = accountId;
        if (visitDate !== undefined) visit.visitDate = visitDate ? new Date(visitDate) : visit.visitDate;
        if (followupDate !== undefined) visit.followupDate = followupDate && followupDate !== '' ? new Date(followupDate) : (null as any);
        if (followupNotes !== undefined) visit.followupNotes = followupNotes;
        if (followupCompleted !== undefined) visit.followupCompleted = Boolean(followupCompleted);

        await repo().save(visit);
        // Reload with relations for response
        const updated = await repo().findOne({ where: { id: visit.id }, relations: ['createdBy', 'account'] });
        logger.info(`Sales visit updated by ${req.user?.email}: ${visit.id}`);
        return res.json({ success: true, data: updated });
      } catch (dbError: any) {
        logger.error(`Failed to update sales visit ${req.params.id}:`, dbError.message);
        throw new AppError(400, `Failed to update sales visit: ${dbError.message}`);
      }
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'sales_visits', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete sales visits');
      }
      const visit = await repo().findOne({ where: { id: req.params.id } });
      if (!visit) throw new AppError(404, 'Sales visit not found');
      const dScope = getOwnerScope(req.user, 'sales_visits');
      if (dScope && visit.createdById !== dScope) {
        throw new AppError(403, 'You can only delete your own sales visits');
      }
      await repo().remove(visit);
      return res.json({ success: true, data: { message: 'Sales visit deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new SalesVisitController();
