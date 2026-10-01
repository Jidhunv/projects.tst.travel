"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const database_1 = require("../config/database");
const Activity_1 = require("../models/Activity");
const errorHandler_1 = require("../middleware/errorHandler");
const constants_1 = require("../utils/constants");
class ActivityService {
    constructor() {
        this.activityRepository = database_1.AppDataSource.getRepository(Activity_1.Activity);
    }
    async createActivity(data) {
        if (!constants_1.ACTIVITY_TYPES.includes(data.type)) {
            throw new errorHandler_1.AppError(400, `Invalid activity type. Allowed: ${constants_1.ACTIVITY_TYPES.join(', ')}`);
        }
        if (!constants_1.RESOURCE_TYPES.includes(data.resourceType)) {
            throw new errorHandler_1.AppError(400, `Invalid resource type. Allowed: ${constants_1.RESOURCE_TYPES.join(', ')}`);
        }
        const activity = this.activityRepository.create({
            ...data,
            isCompleted: false,
        });
        return await this.activityRepository.save(activity);
    }
    // List activities for a given record (e.g. all follow-ups on a lead).
    async getActivitiesForResource(resourceType, resourceId) {
        return await this.activityRepository.find({
            where: { resourceType, resourceId },
            relations: ['createdBy'],
            order: { createdAt: 'DESC' },
        });
    }
    // Upcoming follow-ups (incomplete, with a due date) for a user.
    async getUpcomingFollowUps(userId) {
        return await this.activityRepository
            .createQueryBuilder('activity')
            .where('activity.createdById = :userId', { userId })
            .andWhere('activity.isCompleted = false')
            .andWhere('activity.dueDate IS NOT NULL')
            .orderBy('activity.dueDate', 'ASC')
            .getMany();
    }
    async completeActivity(id) {
        const activity = await this.activityRepository.findOne({ where: { id } });
        if (!activity) {
            throw new errorHandler_1.AppError(404, 'Activity not found');
        }
        activity.isCompleted = true;
        activity.completedAt = new Date();
        return await this.activityRepository.save(activity);
    }
    async deleteActivity(id) {
        const activity = await this.activityRepository.findOne({ where: { id } });
        if (!activity) {
            throw new errorHandler_1.AppError(404, 'Activity not found');
        }
        await this.activityRepository.remove(activity);
    }
}
exports.ActivityService = ActivityService;
exports.default = new ActivityService();
//# sourceMappingURL=activity.service.js.map