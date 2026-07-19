import { AppDataSource } from '../config/database';
import { Project } from '../models/Project';
import { ProjectMilestone } from '../models/ProjectMilestone';
import { AppError } from '../middleware/errorHandler';

interface ProjectFilters {
  accountId?: string;
  contractId?: string;
  status?: string;
  // "self" scope: a Project has no owner column, so restrict to projects for an
  // account this user owns, or that they manage.
  scopeUserId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private milestoneRepository = AppDataSource.getRepository(ProjectMilestone);

  async createProject(data: {
    projectName: string;
    accountId: string;
    contractId: string;
    projectManagerId: string;
    startDate: Date;
    endDate: Date;
    budget?: number;
    description?: string;
  }): Promise<Project> {
    const project = this.projectRepository.create({
      ...data,
      status: 'Planning',
      progressPercent: 0,
      revenue: 0,
    });

    return await this.projectRepository.save(project);
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['account', 'contract', 'projectManager', 'milestones', 'invoices'],
    });
    if (!project) {
      throw new AppError(404, 'Project not found');
    }
    return project;
  }

  async getProjects(filters: ProjectFilters = {}): Promise<{ data: Project[]; total: number }> {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;

    const query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.account', 'account')
      .leftJoinAndSelect('project.contract', 'contract')
      .leftJoinAndSelect('project.projectManager', 'projectManager');

    if (search) {
      query.where('project.projectName ILIKE :search', { search: `%${search}%` });
    }
    if (where.accountId) {
      query.andWhere('project.accountId = :accountId', { accountId: where.accountId });
    }
    if (where.contractId) {
      query.andWhere('project.contractId = :contractId', { contractId: where.contractId });
    }
    if (where.status) {
      query.andWhere('project.status = :status', { status: where.status });
    }
    if (where.scopeUserId) {
      query.andWhere(
        '(account.ownerId = :scopeUserId OR project.projectManagerId = :scopeUserId)',
        { scopeUserId: where.scopeUserId }
      );
    }

    const [data, total] = await query
      .orderBy('project.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    await this.getProjectById(id);
    // Column-level update: the getById above eager-loads relations, and save()
    // gives a loaded relation precedence over its FK column -- so changing only
    // the FK would be silently overwritten by the stale relation object.
    // update() writes exactly the columns given.
    await this.projectRepository.update(id, data);
    return await this.getProjectById(id);
  }

  // Milestone tracking
  async addMilestone(projectId: string, data: {
    milestoneType: string;
    milestoneName: string;
    completedDate: Date;
    responsibleUserId?: string;
    remarks?: string;
  }): Promise<ProjectMilestone> {
    const project = await this.getProjectById(projectId);

    const milestone = this.milestoneRepository.create({
      ...data,
      project,
      projectId,
      approvalStatus: 'Pending',
    });

    return await this.milestoneRepository.save(milestone);
  }

  async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    return await this.milestoneRepository.find({
      where: { projectId },
      relations: ['responsibleUser'],
      order: { createdAt: 'ASC' },
    });
  }

  async getMilestoneById(milestoneId: string): Promise<ProjectMilestone> {
    const milestone = await this.milestoneRepository.findOne({ where: { id: milestoneId } });
    if (!milestone) {
      throw new AppError(404, 'Milestone not found');
    }
    return milestone;
  }

  async approveMilestone(milestoneId: string, approvedBy: string): Promise<ProjectMilestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
    });
    if (!milestone) {
      throw new AppError(404, 'Milestone not found');
    }
    milestone.approvalStatus = 'Approved';
    milestone.approvedBy = approvedBy;
    milestone.approvedDate = new Date();
    return await this.milestoneRepository.save(milestone);
  }

  async deleteProject(id: string): Promise<void> {
    const project = await this.getProjectById(id);
    await this.projectRepository.remove(project);
  }
}

export default new ProjectService();
