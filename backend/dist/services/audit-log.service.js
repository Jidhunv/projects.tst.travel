"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const AuditLog_1 = require("../models/AuditLog");
class AuditLogService {
    constructor() {
        this.repository = database_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
    }
    async logChange(data) {
        const auditLog = this.repository.create({
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            oldValues: data.oldValues,
            newValues: data.newValues,
            user: { id: data.userId },
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            description: data.description,
        });
        return await this.repository.save(auditLog);
    }
    async getAuditLogs(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;
        const query = this.repository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user');
        if (filters.entityType) {
            query.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
        }
        if (filters.entityId) {
            query.andWhere('log.entityId = :entityId', { entityId: filters.entityId });
        }
        if (filters.userId) {
            query.andWhere('log.userId = :userId', { userId: filters.userId });
        }
        if (filters.action) {
            query.andWhere('log.action = :action', { action: filters.action });
        }
        if (filters.fromDate) {
            query.andWhere('log.createdAt >= :fromDate', { fromDate: filters.fromDate });
        }
        if (filters.toDate) {
            query.andWhere('log.createdAt <= :toDate', { toDate: filters.toDate });
        }
        const [data, total] = await query
            .orderBy('log.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async getEntityAuditTrail(entityType, entityId) {
        return await this.repository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .where('log.entityType = :entityType', { entityType })
            .andWhere('log.entityId = :entityId', { entityId })
            .orderBy('log.createdAt', 'ASC')
            .getMany();
    }
}
exports.default = new AuditLogService();
//# sourceMappingURL=audit-log.service.js.map