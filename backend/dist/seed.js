"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./config/database");
const User_1 = require("./models/User");
const Role_1 = require("./models/Role");
const Country_1 = require("./models/Country");
const countries_1 = require("./data/countries");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = __importDefault(require("./utils/logger"));
// SECURITY: Demo passwords come from env with strong defaults (never the literal "password").
// Change these immediately after first setup. Hashed with bcrypt cost 13.
const DEMO_PASSWORDS = {
    admin: process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe@Admin2026!',
    manager: process.env.MANAGER_DEFAULT_PASSWORD || 'ChangeMe@Manager2026!',
    sales: process.env.SALES_DEFAULT_PASSWORD || 'ChangeMe@Sales2026!',
};
const BCRYPT_COST = 13;
async function seed() {
    try {
        await database_1.AppDataSource.initialize();
        logger_1.default.info('Database connected');
        const roleRepository = database_1.AppDataSource.getRepository(Role_1.Role);
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        // Create default roles
        let adminRole = await roleRepository.findOne({ where: { name: 'Admin' } });
        if (!adminRole) {
            adminRole = roleRepository.create({
                name: 'Admin',
                description: 'Administrator with full access',
            });
            await roleRepository.save(adminRole);
            logger_1.default.info('✓ Admin role created');
        }
        let managerRole = await roleRepository.findOne({ where: { name: 'Manager' } });
        if (!managerRole) {
            managerRole = roleRepository.create({
                name: 'Manager',
                description: 'Sales Manager',
            });
            await roleRepository.save(managerRole);
            logger_1.default.info('✓ Manager role created');
        }
        let repRole = await roleRepository.findOne({ where: { name: 'Sales Rep' } });
        if (!repRole) {
            repRole = roleRepository.create({
                name: 'Sales Rep',
                description: 'Sales Representative',
            });
            await roleRepository.save(repRole);
            logger_1.default.info('✓ Sales Rep role created');
        }
        // Create default admin user
        let adminUser = await userRepository.findOne({ where: { email: 'admin@example.com' } });
        if (!adminUser) {
            const hashedPassword = await bcryptjs_1.default.hash(DEMO_PASSWORDS.admin, BCRYPT_COST);
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
            logger_1.default.info('✓ Admin user created (admin@example.com). CHANGE THE DEFAULT PASSWORD.');
        }
        // Create test manager user
        let managerUser = await userRepository.findOne({ where: { email: 'manager@example.com' } });
        if (!managerUser) {
            const hashedPassword = await bcryptjs_1.default.hash(DEMO_PASSWORDS.manager, BCRYPT_COST);
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
            logger_1.default.info('✓ Manager user created (manager@example.com). CHANGE THE DEFAULT PASSWORD.');
        }
        // Create test sales rep user
        let repUser = await userRepository.findOne({ where: { email: 'sales@example.com' } });
        if (!repUser) {
            const hashedPassword = await bcryptjs_1.default.hash(DEMO_PASSWORDS.sales, BCRYPT_COST);
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
            logger_1.default.info('✓ Sales Rep user created (sales@example.com). CHANGE THE DEFAULT PASSWORD.');
        }
        // Seed countries
        const countryRepository = database_1.AppDataSource.getRepository(Country_1.Country);
        const existingCountries = await countryRepository.count();
        if (existingCountries === 0) {
            logger_1.default.info('Seeding 183 countries...');
            for (const countryData of countries_1.countriesData) {
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
            logger_1.default.info(`✓ ${countries_1.countriesData.length} countries seeded`);
        }
        logger_1.default.info('✅ Seed completed successfully!');
        logger_1.default.info('Demo users: admin@example.com, manager@example.com, sales@example.com');
        logger_1.default.info('Passwords are set from env (ADMIN/MANAGER/SALES_DEFAULT_PASSWORD) or safe defaults — CHANGE THEM.');
        await database_1.AppDataSource.destroy();
    }
    catch (error) {
        logger_1.default.error('Seed failed:', error);
        process.exit(1);
    }
}
seed();
//# sourceMappingURL=seed.js.map