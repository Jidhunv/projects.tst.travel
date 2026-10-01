import { Project } from './Project';
import { User } from './User';
export declare class ProjectMilestone {
    id: string;
    project: Project;
    projectId: string;
    milestoneType: string;
    milestoneName: string;
    completedDate: Date;
    completedTime: string;
    responsibleUser: User;
    responsibleUserId: string;
    remarks: string;
    approvalStatus: string;
    approvedBy: string;
    approvedDate: Date;
    createdAt: Date;
}
//# sourceMappingURL=ProjectMilestone.d.ts.map