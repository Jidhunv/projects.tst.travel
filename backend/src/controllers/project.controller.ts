import { Response, NextFunction } from 'express';
import projectService from '../services/project.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ProjectController {
  async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
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
      const { page = 1, limit = 20, accountId, contractId, status, search } = req.query;
      const { data, total } = await projectService.getProjects({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        contractId: contractId as string,
        status: status as string,
        search: search as string,
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
      const project = await projectService.getProjectById(req.params.id);
      return res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body);
      logger.info(`Project updated: ${project.id} by ${req.user?.email}`);
      return res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async addMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
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
      const milestones = await projectService.getMilestones(req.params.id);
      return res.json({ success: true, data: milestones });
    } catch (error) {
      next(error);
    }
  }

  async approveMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const milestone = await projectService.approveMilestone(req.params.milestoneId, req.user?.email || 'Unknown');
      logger.info(`Milestone approved: ${req.params.milestoneId}`);
      return res.json({ success: true, data: milestone });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await projectService.deleteProject(req.params.id);
      logger.info(`Project deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Project deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();
