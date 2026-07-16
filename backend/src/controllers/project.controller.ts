import { Response, NextFunction } from 'express';
import projectService from '../services/project.service';
import { AuthRequest, canPerformAction, getOwnerScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ProjectController {
  // A Project has no owner column; it inherits ownership from its account.
  // At "self" scope a user may only touch projects for an account they own, or
  // that they manage.
  private async assertCanAccess(
    req: AuthRequest,
    project: { account?: { ownerId?: string }; projectManagerId?: string },
    action: string
  ) {
    if (getOwnerScope(req.user, 'projects') === undefined) return; // "all" scope
    const mine =
      project.account?.ownerId === req.user!.id || project.projectManagerId === req.user!.id;
    if (!mine) {
      throw new AppError(403, `You can only ${action} projects for your own accounts`);
    }
  }

  async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'create')) {
        throw new AppError(403, 'You do not have permission to create projects');
      }

      const { projectName, accountId, contractId, projectManagerId, startDate, endDate, budget, description } = req.body;

      if (!projectName || !accountId || !contractId || !projectManagerId || !startDate || !endDate) {
        throw new AppError(400, 'Required fields: projectName, accountId, contractId, projectManagerId, startDate, endDate');
      }

      const project = await projectService.createProject({
        projectName,
        accountId,
        contractId,
        projectManagerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget: budget ? Number(budget) : undefined,
        description,
      });

      logger.info(`Project created: ${project.projectName} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'read')) {
        throw new AppError(403, 'You do not have permission to view projects');
      }

      const { page = 1, limit = 20, accountId, contractId, status, search } = req.query;
      const { data, total } = await projectService.getProjects({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        contractId: contractId as string,
        status: status as string,
        search: search as string,
        // undefined at "all" scope; the user's id at "self" scope.
        scopeUserId: getOwnerScope(req.user, 'projects'),
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

  async getProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'read')) {
        throw new AppError(403, 'You do not have permission to view projects');
      }
      const project = await projectService.getProjectById(req.params.id);
      await this.assertCanAccess(req, project, 'view');
      return res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'update')) {
        throw new AppError(403, 'You do not have permission to update projects');
      }
      await this.assertCanAccess(req, await projectService.getProjectById(req.params.id), 'update');

      const project = await projectService.updateProject(req.params.id, req.body);
      logger.info(`Project updated: ${project.id} by ${req.user?.email}`);
      return res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async addMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'update')) {
        throw new AppError(403, 'You do not have permission to change project milestones');
      }
      await this.assertCanAccess(req, await projectService.getProjectById(req.params.id), 'update');

      const { milestoneType, milestoneName, completedDate, responsibleUserId, remarks } = req.body;

      if (!milestoneType || !milestoneName || !completedDate) {
        throw new AppError(400, 'Required fields: milestoneType, milestoneName, completedDate');
      }

      const milestone = await projectService.addMilestone(req.params.id, {
        milestoneType,
        milestoneName,
        completedDate: new Date(completedDate),
        responsibleUserId,
        remarks,
      });

      logger.info(`Milestone added to project ${req.params.id}: ${milestoneName}`);
      return res.status(201).json({ success: true, data: milestone });
    } catch (error) {
      next(error);
    }
  }

  async getMilestones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'read')) {
        throw new AppError(403, 'You do not have permission to view projects');
      }
      await this.assertCanAccess(req, await projectService.getProjectById(req.params.id), 'view');

      const milestones = await projectService.getMilestones(req.params.id);
      return res.json({ success: true, data: milestones });
    } catch (error) {
      next(error);
    }
  }

  async approveMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Approving mutates the milestone's project, so it requires update rights.
      // The route carries only the milestone id, so resolve its project to scope.
      if (!canPerformAction(req.user, 'projects', 'update')) {
        throw new AppError(403, 'You do not have permission to approve milestones');
      }
      const parent = await projectService.getMilestoneById(req.params.milestoneId);
      await this.assertCanAccess(req, await projectService.getProjectById(parent.projectId), 'approve milestones on');

      const milestone = await projectService.approveMilestone(req.params.milestoneId, req.user?.email || 'Unknown');
      logger.info(`Milestone approved: ${req.params.milestoneId}`);
      return res.json({ success: true, data: milestone });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'projects', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete projects');
      }
      await this.assertCanAccess(req, await projectService.getProjectById(req.params.id), 'delete');

      await projectService.deleteProject(req.params.id);
      logger.info(`Project deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Project deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();
