"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const database_1 = require("../config/database");
const Project_1 = require("../models/Project");
const ProjectMilestone_1 = require("../models/ProjectMilestone");
const errorHandler_1 = require("../middleware/errorHandler");
class ProjectService {
    constructor() {
        this.projectRepository = database_1.AppDataSource.getRepository(Project_1.Project);
        this.milestoneRepository = database_1.AppDataSource.getRepository(ProjectMilestone_1.ProjectMilestone);
    }
    async createProject(data) {
        const project = this.projectRepository.create({
            ...data,
            status: 'Planning',
            progressPercent: 0,
            revenue: 0,
        });
        return await this.projectRepository.save(project);
    }
    async getProjectById(id) {
        const project = await this.projectRepository.findOne({
            where: { id },
            relations: ['account', 'contract', 'projectManager', 'milestones', 'invoices'],
        });
        if (!project) {
            throw new errorHandler_1.AppError(404, 'Project not found');
        }
        return project;
    }
    async getProjects(filters = {}) {
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
            query.andWhere('(account.ownerId = :scopeUserId OR project.projectManagerId = :scopeUserId)', { scopeUserId: where.scopeUserId });
        }
        const [data, total] = await query
            .orderBy('project.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async updateProject(id, data) {
        await this.getProjectById(id);
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.projectRepository.update(id, data);
        return await this.getProjectById(id);
    }
    // Milestone tracking
    async addMilestone(projectId, data) {
        const project = await this.getProjectById(projectId);
        const milestone = this.milestoneRepository.create({
            ...data,
            project,
            projectId,
            approvalStatus: 'Pending',
        });
        return await this.milestoneRepository.save(milestone);
    }
    async getMilestones(projectId) {
        return await this.milestoneRepository.find({
            where: { projectId },
            relations: ['responsibleUser'],
            order: { createdAt: 'ASC' },
        });
    }
    async getMilestoneById(milestoneId) {
        const milestone = await this.milestoneRepository.findOne({ where: { id: milestoneId } });
        if (!milestone) {
            throw new errorHandler_1.AppError(404, 'Milestone not found');
        }
        return milestone;
    }
    async approveMilestone(milestoneId, approvedBy) {
        const milestone = await this.milestoneRepository.findOne({
            where: { id: milestoneId },
        });
        if (!milestone) {
            throw new errorHandler_1.AppError(404, 'Milestone not found');
        }
        milestone.approvalStatus = 'Approved';
        milestone.approvedBy = approvedBy;
        milestone.approvedDate = new Date();
        return await this.milestoneRepository.save(milestone);
    }
    async deleteProject(id) {
        const project = await this.getProjectById(id);
        await this.projectRepository.remove(project);
    }
}
exports.ProjectService = ProjectService;
exports.default = new ProjectService();
//# sourceMappingURL=project.service.js.map