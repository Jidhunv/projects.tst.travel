import { Response, NextFunction } from 'express';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import logger from '../utils/logger';

export class TeamController {
  async list(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await teamService.list();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, parentTeamId } = req.body;
      const team = await teamService.create({ name, description, parentTeamId });
      logger.info(`Team created: ${team.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, parentTeamId } = req.body;
      const team = await teamService.update(req.params.id, { name, description, parentTeamId });
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

  // Assign a user to this team (or pass teamId: null in the body to unassign).
  async setUserTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      if (!userId) throw new AppError(400, 'userId is required');
      const teamId = req.params.id;
      await teamService.getById(teamId); // 404 if invalid
      await userService.getUserById(userId); // 404 if invalid
      await AppDataSource.getRepository(User).update(userId, { teamId } as any);
      logger.info(`User ${userId} assigned to team ${teamId} by ${req.user?.email}`);
      return res.json({ success: true, data: { userId, teamId } });
    } catch (error) {
      next(error);
    }
  }

  // List the members of a team (users whose teamId is this team).
  async members(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await AppDataSource.getRepository(User).find({ where: { teamId: req.params.id } as any });
      const data = users.map((u) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }));
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new TeamController();
