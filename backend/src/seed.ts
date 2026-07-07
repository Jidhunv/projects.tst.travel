import { AppDataSource } from './config/database';
import { User } from './models/User';
import { Role } from './models/Role';
import { Permission } from './models/Permission';
import { Country } from './models/Country';
import { countriesData } from './data/countries';
import bcrypt from 'bcryptjs';
import logger from './utils/logger';

async function seed() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected');

    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const userRepository = AppDataSource.getRepository(User);

    // Create default roles
    let adminRole = await roleRepository.findOne({ where: { name: 'Admin' } });
    if (!adminRole) {
      adminRole = roleRepository.create({
        name: 'Admin',
        description: 'Administrator with full access',
      });
      await roleRepository.save(adminRole);
      logger.info('✓ Admin role created');
    }

    let managerRole = await roleRepository.findOne({ where: { name: 'Manager' } });
    if (!managerRole) {
      managerRole = roleRepository.create({
        name: 'Manager',
        description: 'Sales Manager',
      });
      await roleRepository.save(managerRole);
      logger.info('✓ Manager role created');
    }

    let repRole = await roleRepository.findOne({ where: { name: 'Sales Rep' } });
    if (!repRole) {
      repRole = roleRepository.create({
        name: 'Sales Rep',
        description: 'Sales Representative',
      });
      await roleRepository.save(repRole);
      logger.info('✓ Sales Rep role created');
    }

    // Create default admin user
    let adminUser = await userRepository.findOne({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('password', 10);
      adminUser = userRepository.create({
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '+1-555-0100',
        isActive: true,
        role: adminRole,
      });
      await userRepository.save(adminUser);
      logger.info('✓ Admin user created (admin@example.com / password)');
    }

    // Create test manager user
    let managerUser = await userRepository.findOne({ where: { email: 'manager@example.com' } });
    if (!managerUser) {
      const hashedPassword = await bcrypt.hash('password', 10);
      managerUser = userRepository.create({
        email: 'manager@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        phoneNumber: '+1-555-0101',
        isActive: true,
        role: managerRole,
      });
      await userRepository.save(managerUser);
      logger.info('✓ Manager user created (manager@example.com / password)');
    }

    // Create test sales rep user
    let repUser = await userRepository.findOne({ where: { email: 'sales@example.com' } });
    if (!repUser) {
      const hashedPassword = await bcrypt.hash('password', 10);
      repUser = userRepository.create({
        email: 'sales@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Sales',
        phoneNumber: '+1-555-0102',
        isActive: true,
        role: repRole,
      });
      await userRepository.save(repUser);
      logger.info('✓ Sales Rep user created (sales@example.com / password)');
    }

    // Seed countries
    const countryRepository = AppDataSource.getRepository(Country);
    const existingCountries = await countryRepository.count();
    if (existingCountries === 0) {
      logger.info('Seeding 183 countries...');
      for (const countryData of countriesData) {
        const exists = await countryRepository.findOne({ where: { code: countryData.code } });
        if (!exists) {
          const country = countryRepository.create({
            code: countryData.code,
            name: countryData.name,
            region: countryData.region,
          });
          await countryRepository.save(country);
        }
      }
      logger.info(`✓ ${countriesData.length} countries seeded`);
    }

    logger.info('✅ Seed completed successfully!');
    logger.info('Test Credentials: admin@example.com, manager@example.com, sales@example.com (all with "password")');

    await AppDataSource.destroy();
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
