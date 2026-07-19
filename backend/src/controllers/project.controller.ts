import { Response, NextFunction } from 'express';
import projectService from '../services/project.service';
import { AuthRequest, canPerformAction, getOwnerScope, assertOwnsViaAccount } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import logger from '../utils/logger';

// The full project workflow is user-editable; only id/createdAt/updatedAt
// are withheld, which pick() drops by omission.
const PROJECT_UPDATABLE = [
  'projectName',
  'description',
  'status',
  'startDate',
  'endDate',
  'budget',
  'revenue',
  'progressPercent',
  'accountId',
  'contractId',
  'projectManagerId',
  'isLoaded',
  'loadedBy',
  'loadedDate',
  'demoConducted',
  'demoDate',
  'conductedBy',
  'clientDemoApproval',
  'uatStatus',
  'uatStartDate',
  'uatCompletedDate',
  'uatSignoffBy',
  'uatRemarks',
  'prodDeploymentStatus',
  'prodDeploymentDate',
  'prodDeploymentBy',
  'goLiveApproval',
  'goLiveDate',
  'projectClosureSigned',
  'projectClosureSignDate',
  'projectClosureSignedBy',
  'closureRemarks',
] as const;

export class ProjectController {

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
      assertOwnsViaAccount(req.user, 'projects', 'view', project.account?.ownerId, [project.projectManagerId]);
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
      const record = await projectService.getProjectById(req.params.id);
      assertOwnsViaAccount(req.user, 'projects', 'update', record.account?.ownerId, [record.projectManagerId]);

      const project = await projectService.updateProject(req.params.id, pick(req.body, PROJECT_UPDATABLE));
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
      const record = await projectService.getProjectById(req.params.id);
      assertOwnsViaAccount(req.user, 'projects', 'update', record.account?.ownerId, [record.projectManagerId]);

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
      const record = await projectService.getProjectById(req.params.id);
      assertOwnsViaAccount(req.user, 'projects', 'view', record.account?.ownerId, [record.projectManagerId]);

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
      const record = await projectService.getProjectById(parent.projectId);
      assertOwnsViaAccount(req.user, 'projects', 'approve milestones on', record.account?.ownerId, [record.projectManagerId]);

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
      const record = await projectService.getProjectById(req.params.id);
      assertOwnsViaAccount(req.user, 'projects', 'delete', record.account?.ownerId, [record.projectManagerId]);

      await projectService.deleteProject(req.params.id);
      logger.info(`Project deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Project deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();
