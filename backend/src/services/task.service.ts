import { AppDataSource } from '../config/database';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { TaskCategory } from '../models/TaskCategory';
import { TaskFollowup } from '../models/TaskFollowup';

const repo = () => AppDataSource.getRepository(Task);

export interface TaskListOptions {
  userId: string;
  // true when the role's read scope is narrower than "all": only the user's own tasks
  restrictToUser: boolean;
  view: 'all' | 'assignedToMe' | 'assignedByMe';
  status?: string;
}

class TaskService {
  async list(o: TaskListOptions): Promise<Task[]> {
    const qb = repo()
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.owner', 'owner')
      .leftJoinAndSelect('t.assignee', 'assignee')
      .leftJoinAndSelect('t.category', 'category')
      .orderBy('t.followupDate', 'ASC', 'NULLS LAST')
      .addOrderBy('t.createdAt', 'DESC');

    if (o.restrictToUser) qb.andWhere('(t.ownerId = :uid OR t.assigneeId = :uid)', { uid: o.userId });
    if (o.view === 'assignedToMe') qb.andWhere('t.assigneeId = :uid', { uid: o.userId });
    if (o.view === 'assignedByMe') qb.andWhere('t.ownerId = :uid', { uid: o.userId });
    if (o.status) qb.andWhere('t.status = :status', { status: o.status });

    return qb.getMany();
  }

  findById(id: string): Promise<Task | null> {
    return repo().findOne({ where: { id }, relations: ['owner', 'assignee', 'category'] });
  }

  async create(data: Partial<Task>): Promise<Task> {
    const task = repo().create(data);
    return repo().save(task);
  }

  // Column-level write: update() never reloads or overwrites relation objects.
  async update(id: string, data: Partial<Task>): Promise<void> {
    await repo().update(id, data);
  }

  async remove(id: string): Promise<void> {
    await repo().delete(id);
  }

  // The follow-up conversation of a task, newest first. The creator's name only; no account details.
  followups(taskId: string): Promise<TaskFollowup[]> {
    return AppDataSource.getRepository(TaskFollowup)
      .createQueryBuilder('f')
      .leftJoin('f.createdBy', 'creator')
      .addSelect(['creator.id', 'creator.firstName', 'creator.lastName'])
      .where('f.taskId = :taskId', { taskId })
      .orderBy('f.createdAt', 'DESC')
      .getMany();
  }

  // Adds an entry. A next follow-up date also moves the task's follow-up date to it.
  async addFollowup(taskId: string, note: string, nextFollowupDate: string | null, userId: string): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      const entries = manager.getRepository(TaskFollowup);
      await entries.save(entries.create({ taskId, note, nextFollowupDate, createdById: userId }));
      if (nextFollowupDate) await manager.getRepository(Task).update(taskId, { followupDate: nextFollowupDate });
    });
  }

  // Users a task can be assigned to. Only id and name leave the server, never email or role.
  activeAssignees(): Promise<Pick<User, 'id' | 'firstName' | 'lastName'>[]> {
    return AppDataSource.getRepository(User).find({
      where: { isActive: true },
      select: ['id', 'firstName', 'lastName'],
      order: { firstName: 'ASC' },
    });
  }

  // Categories a task can be filed under. Inactive ones are kept out of the dropdown.
  activeCategories(): Promise<TaskCategory[]> {
    return AppDataSource.getRepository(TaskCategory).find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  findActiveCategory(id: string): Promise<TaskCategory | null> {
    return AppDataSource.getRepository(TaskCategory).findOne({ where: { id, isActive: true } });
  }

  findActiveUser(id: string): Promise<User | null> {
    return AppDataSource.getRepository(User).findOne({ where: { id, isActive: true } });
  }
}

export default new TaskService();
