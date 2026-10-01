import { Activity } from '../models/Activity';
export declare class ActivityService {
    private activityRepository;
    createActivity(data: {
        type: string;
        title: string;
        description?: string;
        resourceType: string;
        resourceId: string;
        createdById: string;
        dueDate?: Date;
    }): Promise<Activity>;
    getActivitiesForResource(resourceType: string, resourceId: string): Promise<Activity[]>;
    getUpcomingFollowUps(userId: string): Promise<Activity[]>;
    completeActivity(id: string): Promise<Activity>;
    deleteActivity(id: string): Promise<void>;
}
declare const _default: ActivityService;
export default _default;
//# sourceMappingURL=activity.service.d.ts.map