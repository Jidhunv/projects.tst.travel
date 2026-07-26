import { Response, NextFunction } from 'express';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class TeamController {
  async list(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return res.json({ success: true, data: await teamService.list() });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const team = await teamService.create({ name, description });
      logger.info(`Team created: ${team.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const team = await teamService.update(req.params.id, { name, description });
      return res.json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await teamService.remove(req.params.id);
      return res.json({ success: true, data: { message: 'Team deleted' } });
    } catch (error) {
      next(error);
    }
  }

  // Add a user to this team (many-to-many; append).
  async addMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      if (!userId) throw new AppError(400, 'userId is required');
      await userService.getUserById(userId); // 404 if invalid
      await teamService.addUserToTeam(userId, req.params.id);
      logger.info(`User ${userId} added to team ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { userId, teamId: req.params.id } });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await teamService.removeUserFromTeam(req.params.userId, req.params.id);
      return res.json({ success: true, data: { message: 'Member removed' } });
    } catch (error) {
      next(error);
    }
  }

  async members(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return res.json({ success: true, data: await teamService.members(req.params.id) });
    } catch (error) {
      next(error);
    }
  }
}

export default new TeamController();
