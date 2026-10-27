"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Task_1 = require("../models/Task");
const User_1 = require("../models/User");
const TaskCategory_1 = require("../models/TaskCategory");
const repo = () => database_1.AppDataSource.getRepository(Task_1.Task);
class TaskService {
    async list(o) {
        const qb = repo()
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.owner', 'owner')
            .leftJoinAndSelect('t.assignee', 'assignee')
            .leftJoinAndSelect('t.category', 'category')
            .orderBy('t.followupDate', 'ASC', 'NULLS LAST')
            .addOrderBy('t.createdAt', 'DESC');
        if (o.restrictToUser)
            qb.andWhere('(t.ownerId = :uid OR t.assigneeId = :uid)', { uid: o.userId });
        if (o.view === 'assignedToMe')
            qb.andWhere('t.assigneeId = :uid', { uid: o.userId });
        if (o.view === 'assignedByMe')
            qb.andWhere('t.ownerId = :uid', { uid: o.userId });
        if (o.status)
            qb.andWhere('t.status = :status', { status: o.status });
        return qb.getMany();
    }
    findById(id) {
        return repo().findOne({ where: { id }, relations: ['owner', 'assignee', 'category'] });
    }
    async create(data) {
        const task = repo().create(data);
        return repo().save(task);
    }
    // Column-level write: update() never reloads or overwrites relation objects.
    async update(id, data) {
        await repo().update(id, data);
    }
    async remove(id) {
        await repo().delete(id);
    }
    // Users a task can be assigned to. Only id and name leave the server, never email or role.
    activeAssignees() {
        return database_1.AppDataSource.getRepository(User_1.User).find({
            where: { isActive: true },
            select: ['id', 'firstName', 'lastName'],
            order: { firstName: 'ASC' },
        });
    }
    // Categories a task can be filed under. Inactive ones are kept out of the dropdown.
    activeCategories() {
        return database_1.AppDataSource.getRepository(TaskCategory_1.TaskCategory).find({ where: { isActive: true }, order: { name: 'ASC' } });
    }
    findActiveCategory(id) {
        return database_1.AppDataSource.getRepository(TaskCategory_1.TaskCategory).findOne({ where: { id, isActive: true } });
    }
    findActiveUser(id) {
        return database_1.AppDataSource.getRepository(User_1.User).findOne({ where: { id, isActive: true } });
    }
}
exports.default = new TaskService();
//# sourceMappingURL=task.service.js.map