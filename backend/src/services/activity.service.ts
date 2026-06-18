import { AppDataSource } from '../config/database';
import { Activity } from '../models/Activity';
import { AppError } from '../middleware/errorHandler';
import { ACTIVITY_TYPES, RESOURCE_TYPES } from '../utils/constants';

export class ActivityService {
  private activityRepository = AppDataSource.getRepository(Activity);

  async createActivity(data: {
    type: string;
    title: string;
    description?: string;
    resourceType: string;
    resourceId: string;
    createdById: string;
    dueDate?: Date;
  }): Promise<Activity> {
    if (!ACTIVITY_TYPES.includes(data.type as never)) {
      throw new AppError(400, `Invalid activity type. Allowed: ${ACTIVITY_TYPES.join(', ')}`);
    }
    if (!RESOURCE_TYPES.includes(data.resourceType as never)) {
      throw new AppError(400, `Invalid resource type. Allowed: ${RESOURCE_TYPES.join(', ')}`);
    }

    const activity = this.activityRepository.create({
      ...data,
      isCompleted: false,
    });
    return await this.activityRepository.save(activity);
  }

  // List activities for a given record (e.g. all follow-ups on a lead).
  async getActivitiesForResource(
    resourceType: string,
    resourceId: string
  ): Promise<Activity[]> {
    return await this.activityRepository.find({
      where: { resourceType, resourceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // Upcoming follow-ups (incomplete, with a due date) for a user.
  async getUpcomingFollowUps(userId: string): Promise<Activity[]> {
    return await this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.createdById = :userId', { userId })
      .andWhere('activity.isCompleted = false')
      .andWhere('activity.dueDate IS NOT NULL')
      .orderBy('activity.dueDate', 'ASC')
      .getMany();
  }

  async completeActivity(id: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) {
      throw new AppError(404, 'Activity not found');
    }
    activity.isCompleted = true;
    activity.completedAt = new Date();
    return await this.activityRepository.save(activity);
  }

  async deleteActivity(id: string): Promise<void> {
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) {
      throw new AppError(404, 'Activity not found');
    }
    await this.activityRepository.remove(activity);
  }
}

export default new ActivityService();
