"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const project_service_1 = __importDefault(require("../services/project.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
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
];
class ProjectController {
    async createProject(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create projects');
            }
            const { projectName, accountId, contractId, projectManagerId, startDate, endDate, budget, description } = req.body;
            if (!projectName || !accountId || !contractId || !projectManagerId || !startDate || !endDate) {
                throw new errorHandler_1.AppError(400, 'Required fields: projectName, accountId, contractId, projectManagerId, startDate, endDate');
            }
            const project = await project_service_1.default.createProject({
                projectName,
                accountId,
                contractId,
                projectManagerId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                budget: budget ? Number(budget) : undefined,
                description,
            });
            logger_1.default.info(`Project created: ${project.projectName} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: project });
        }
        catch (error) {
            next(error);
        }
    }
    async getProjects(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view projects');
            }
            const { page = 1, limit = 20, accountId, contractId, status, search } = req.query;
            const { data, total } = await project_service_1.default.getProjects({
                page: Number(page),
                limit: Number(limit),
                accountId: accountId,
                contractId: contractId,
                status: status,
                search: search,
                // undefined at "all" scope; the user's id at "self" scope.
                scopeUserId: (0, auth_1.getOwnerScope)(req.user, 'projects'),
            });
            return res.json({
                success: true,
                data,
                meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getProject(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view projects');
            }
            const project = await project_service_1.default.getProjectById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'projects', 'view', project.account?.ownerId, [project.projectManagerId]);
            return res.json({ success: true, data: project });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProject(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update projects');
            }
            const record = await project_service_1.default.getProjectById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'projects', 'update', record.account?.ownerId, [record.projectManagerId]);
            const project = await project_service_1.default.updateProject(req.params.id, (0, pick_1.default)(req.body, PROJECT_UPDATABLE));
            logger_1.default.info(`Project updated: ${project.id} by ${req.user?.email}`);
            return res.json({ success: true, data: project });
        }
        catch (error) {
            next(error);
        }
    }
    async addMilestone(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to change project milestones');
            }
            const record = await project_service_1.default.getProjectById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'projects', 'update', record.account?.ownerId, [record.projectManagerId]);
            const { milestoneType, milestoneName, completedDate, responsibleUserId, remarks } = req.body;
            if (!milestoneType || !milestoneName || !completedDate) {
                throw new errorHandler_1.AppError(400, 'Required fields: milestoneType, milestoneName, completedDate');
            }
            const milestone = await project_service_1.default.addMilestone(req.params.id, {
                milestoneType,
                milestoneName,
                completedDate: new Date(completedDate),
                responsibleUserId,
                remarks,
            });
            logger_1.default.info(`Milestone added to project ${req.params.id}: ${milestoneName}`);
            return res.status(201).json({ success: true, data: milestone });
        }
        catch (error) {
            next(error);
        }
    }
    async getMilestones(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view projects');
            }
            const record = await project_service_1.default.getProjectById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'projects', 'view', record.account?.ownerId, [record.projectManagerId]);
            const milestones = await project_service_1.default.getMilestones(req.params.id);
            return res.json({ success: true, data: milestones });
        }
        catch (error) {
            next(error);
        }
    }
    async approveMilestone(req, res, next) {
        try {
            // Approving mutates the milestone's project, so it requires update rights.
            // The route carries only the milestone id, so resolve its project to scope.
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to approve milestones');
            }
            const parent = await project_service_1.default.getMilestoneById(req.params.milestoneId);
            const record = await project_service_1.default.getProjectById(parent.projectId);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'projects', 'approve milestones on', record.account?.ownerId, [record.projectManagerId]);
            const milestone = await project_service_1.default.approveMilestone(req.params.milestoneId, req.user?.email || 'Unknown');
            logger_1.default.info(`Milestone approved: ${req.params.milestoneId}`);
            return res.json({ success: true, data: milestone });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteProject(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'projects', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete projects');
            }
            const record = await project_service_1.default.getProjectById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'projects', 'delete', record.account?.ownerId, [record.projectManagerId]);
            await project_service_1.default.deleteProject(req.params.id);
            logger_1.default.info(`Project deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Project deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProjectController = ProjectController;
exports.default = new ProjectController();
//# sourceMappingURL=project.controller.js.map