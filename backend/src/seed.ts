import { AppDataSource } from './config/database';
import { User } from './models/User';
import { Role } from './models/Role';
import { Permission } from './models/Permission';
import { Country } from './models/Country';
import { countriesData } from './data/countries';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

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
      console.log('✓ Admin role created');
    }

    let managerRole = await roleRepository.findOne({ where: { name: 'Manager' } });
    if (!managerRole) {
      managerRole = roleRepository.create({
        name: 'Manager',
        description: 'Sales Manager',
      });
      await roleRepository.save(managerRole);
      console.log('✓ Manager role created');
    }

    let repRole = await roleRepository.findOne({ where: { name: 'Sales Rep' } });
    if (!repRole) {
      repRole = roleRepository.create({
        name: 'Sales Rep',
        description: 'Sales Representative',
      });
      await roleRepository.save(repRole);
      console.log('✓ Sales Rep role created');
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
      console.log('✓ Admin user created (admin@example.com / password)');
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
      console.log('✓ Manager user created (manager@example.com / password)');
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
      console.log('✓ Sales Rep user created (sales@example.com / password)');
    }

    // Seed countries
    const countryRepository = AppDataSource.getRepository(Country);
    const existingCountries = await countryRepository.count();
    if (existingCountries === 0) {
      console.log('\nSeeding 183 countries...');
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
      console.log(`✓ ${countriesData.length} countries seeded`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\nTest Credentials:');
    console.log('  Admin:  admin@example.com / password');
    console.log('  Manager: manager@example.com / password');
    console.log('  Sales Rep: sales@example.com / password');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
