import { AppDataSource } from '../config/database';
import { Permission } from '../models/Permission';
import { Role } from '../models/Role';
import logger from './logger';

type PermSpec = { module: string; action: string; scope: string; description: string };

// Permission catalog for the modules added after the initial seed. This runs
// on every startup and is idempotent: it only inserts missing rows and only
// GRANTS missing permissions to the Admin role (never removes anything), so an
// admin's manual role customizations are preserved.
function buildCatalog(): PermSpec[] {
  const crud = (module: string, label: string): PermSpec[] => {
    const specs: PermSpec[] = [];
    for (const action of ['read', 'create', 'update', 'delete']) {
      for (const scope of ['all', 'self']) {
        specs.push({
          module,
          action,
          scope,
          description: `${action} ${scope === 'self' ? 'own ' : ''}${label}`,
        });
      }
    }
    return specs;
  };

  return [
    ...crud('suppliers', 'suppliers'),
    ...crud('sales_visits', 'sales visits'),
    ...crud('expenses', 'expenses'),
    // Approval is an organisation-level action (managers/admins).
    { module: 'expenses', action: 'approve', scope: 'all', description: 'Approve or reject expenses' },
  ];
}

export async function ensurePermissions(): Promise<void> {
  try {
    const permRepo = AppDataSource.getRepository(Permission);
    const roleRepo = AppDataSource.getRepository(Role);

    const catalog = buildCatalog();
    let created = 0;
    for (const spec of catalog) {
      const existing = await permRepo.findOne({
        where: { module: spec.module, action: spec.action, scope: spec.scope },
      });
      if (!existing) {
        await permRepo.save(permRepo.create(spec));
        created++;
      }
    }

    // Grant any permission the Admin role is missing (grant-only).
    const admin = await roleRepo.findOne({ where: { name: 'Admin' }, relations: ['permissions'] });
    if (admin) {
      const allPerms = await permRepo.find();
      const have = new Set(admin.permissions.map((p) => p.id));
      const missing = allPerms.filter((p) => !have.has(p.id));
      if (missing.length) {
        admin.permissions = [...admin.permissions, ...missing];
        await roleRepo.save(admin);
      }
    }

    if (created) logger.info(`ensurePermissions: added ${created} new permission(s)`);
  } catch (error) {
    logger.error('ensurePermissions failed:', error);
  }
}

export default ensurePermissions;
