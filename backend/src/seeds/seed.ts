import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

async function seed() {
  await AppDataSource.initialize();

  try {
    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const userRepository = AppDataSource.getRepository(User);

    // Create permissions
    const permissions = [
      // Lead permissions
      { module: 'leads', action: 'create' },
      { module: 'leads', action: 'read' },
      { module: 'leads', action: 'update' },
      { module: 'leads', action: 'delete' },
      { module: 'leads', action: 'bulk_action' },

      // Account permissions
      { module: 'accounts', action: 'create' },
      { module: 'accounts', action: 'read' },
      { module: 'accounts', action: 'update' },
      { module: 'accounts', action: 'delete' },
      { module: 'accounts', action: 'bulk_action' },

      // Opportunity permissions
      { module: 'opportunities', action: 'create' },
      { module: 'opportunities', action: 'read' },
      { module: 'opportunities', action: 'update' },
      { module: 'opportunities', action: 'delete' },
      { module: 'opportunities', action: 'bulk_action' },

      // Contact permissions
      { module: 'contacts', action: 'create' },
      { module: 'contacts', action: 'read' },
      { module: 'contacts', action: 'update' },
      { module: 'contacts', action: 'delete' },

      // Reports permissions
      { module: 'reports', action: 'read' },

      // Admin permissions
      { module: 'admin', action: 'manage_users' },
      { module: 'admin', action: 'manage_roles' },
      { module: 'admin', action: 'manage_settings' },
      { module: 'admin', action: 'view_audit_log' },
    ];

    for (const perm of permissions) {
      const existing = await permissionRepository.findOne({
        where: { module: perm.module, action: perm.action },
      });
      if (!existing) {
        await permissionRepository.save(
          permissionRepository.create({
            module: perm.module,
            action: perm.action,
          })
        );
      }
    }

    logger.info('Permissions created');

    // Create roles
    const allPermissions = await permissionRepository.find();

    // Admin role - all permissions
    let adminRole = await roleRepository.findOne({
      where: { name: 'Admin' },
    });
    if (!adminRole) {
      adminRole = roleRepository.create({
        name: 'Admin',
        description: 'Administrator with full system access',
        permissions: allPermissions,
      });
      await roleRepository.save(adminRole);
    }

    // Manager role - most permissions
    let managerRole = await roleRepository.findOne({
      where: { name: 'Manager' },
    });
    if (!managerRole) {
      const managerPerms = allPermissions.filter(
        (p) => !['admin'].includes(p.module)
      );
      managerRole = roleRepository.create({
        name: 'Manager',
        description: 'Sales Manager with team oversight',
        permissions: managerPerms,
      });
      await roleRepository.save(managerRole);
    }

    // Sales Rep role - basic permissions
    let repRole = await roleRepository.findOne({
      where: { name: 'Sales Rep' },
    });
    if (!repRole) {
      const repPerms = allPermissions.filter((p) => {
        // Sales reps can only create, read, update (not delete) and can't manage admin
        return !p.module.includes('admin') && p.action !== 'delete' && p.action !== 'bulk_action';
      });
      repRole = roleRepository.create({
        name: 'Sales Rep',
        description: 'Sales Representative',
        permissions: repPerms,
      });
      await roleRepository.save(repRole);
    }

    logger.info('Roles created');

    // Create demo users
    const adminUser = await userRepository.findOne({
      where: { email: 'admin@crm.local' },
    });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await userRepository.save(
        userRepository.create({
          email: 'admin@crm.local',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: adminRole,
          isActive: true,
        })
      );
    }

    const demoUser = await userRepository.findOne({
      where: { email: 'sales@crm.local' },
    });
    if (!demoUser) {
      const hashedPassword = await bcrypt.hash('sales123', 10);
      await userRepository.save(
        userRepository.create({
          email: 'sales@crm.local',
          password: hashedPassword,
          firstName: 'John',
          lastName: 'Smith',
          phoneNumber: '+1-555-0100',
          role: repRole,
          isActive: true,
        })
      );
    }

    logger.info('Demo users created');

    logger.info('Seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error) => {
  logger.error('Seed script error:', error);
  process.exit(1);
});
