import { Project } from '../models/Project';
import { ProjectMilestone } from '../models/ProjectMilestone';
interface ProjectFilters {
    accountId?: string;
    contractId?: string;
    status?: string;
    scopeUserId?: string;
    page?: number;
    limit?: number;
    search?: string;
}
export declare class ProjectService {
    private projectRepository;
    private milestoneRepository;
    createProject(data: {
        projectName: string;
        accountId: string;
        contractId: string;
        projectManagerId: string;
        startDate: Date;
        endDate: Date;
        budget?: number;
        description?: string;
    }): Promise<Project>;
    getProjectById(id: string): Promise<Project>;
    getProjects(filters?: ProjectFilters): Promise<{
        data: Project[];
        total: number;
    }>;
    updateProject(id: string, data: Partial<Project>): Promise<Project>;
    addMilestone(projectId: string, data: {
        milestoneType: string;
        milestoneName: string;
        completedDate: Date;
        responsibleUserId?: string;
        remarks?: string;
    }): Promise<ProjectMilestone>;
    getMilestones(projectId: string): Promise<ProjectMilestone[]>;
    getMilestoneById(milestoneId: string): Promise<ProjectMilestone>;
    approveMilestone(milestoneId: string, approvedBy: string): Promise<ProjectMilestone>;
    deleteProject(id: string): Promise<void>;
}
declare const _default: ProjectService;
export default _default;
//# sourceMappingURL=project.service.d.ts.map