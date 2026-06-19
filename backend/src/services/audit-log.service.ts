import { AppDataSource } from '../config/database';
import { AuditLog } from '../models/AuditLog';

class AuditLogService {
  private repository = AppDataSource.getRepository(AuditLog);

  async logChange(data: {
    entityType: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    oldValues?: Record<string, any>;
    newValues: Record<string, any>;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
  }) {
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

  async getAuditLogs(filters: {
    page?: number;
    limit?: number;
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
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

  async getEntityAuditTrail(entityType: string, entityId: string) {
    return await this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.entityType = :entityType', { entityType })
      .andWhere('log.entityId = :entityId', { entityId })
      .orderBy('log.createdAt', 'ASC')
      .getMany();
  }
}

export default new AuditLogService();
