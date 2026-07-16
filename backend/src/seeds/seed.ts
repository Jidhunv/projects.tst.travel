import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { Product } from '../models/Product';
import { ProductCategory } from '../models/ProductCategory';
import { Country } from '../models/Country';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';
import { countriesData } from '../utils/countriesData';

async function seed() {
  await AppDataSource.initialize();

  try {
    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const userRepository = AppDataSource.getRepository(User);

    // Create permissions
    const permissions: any[] = [
      // Lead permissions
      { module: 'leads', action: 'read', scope: 'all', description: 'View all leads' },
      { module: 'leads', action: 'read', scope: 'self', description: 'View own leads' },
      { module: 'leads', action: 'create', scope: 'all', description: 'Create leads' },
      { module: 'leads', action: 'create', scope: 'self', description: 'Create own leads' },
      { module: 'leads', action: 'update', scope: 'all', description: 'Update leads' },
      { module: 'leads', action: 'update', scope: 'self', description: 'Update own leads' },
      { module: 'leads', action: 'delete', scope: 'all', description: 'Delete leads' },
      { module: 'leads', action: 'delete', scope: 'self', description: 'Delete own leads' },

      // Account permissions
      { module: 'accounts', action: 'read', scope: 'all', description: 'View all accounts' },
      { module: 'accounts', action: 'read', scope: 'self', description: 'View own accounts' },
      { module: 'accounts', action: 'create', scope: 'all', description: 'Create accounts' },
      { module: 'accounts', action: 'create', scope: 'self', description: 'Create own accounts' },
      { module: 'accounts', action: 'update', scope: 'all', description: 'Update accounts' },
      { module: 'accounts', action: 'update', scope: 'self', description: 'Update own accounts' },
      { module: 'accounts', action: 'delete', scope: 'all', description: 'Delete accounts' },
      { module: 'accounts', action: 'delete', scope: 'self', description: 'Delete own accounts' },

      // Opportunity permissions
      { module: 'opportunities', action: 'read', scope: 'all', description: 'View all opportunities' },
      { module: 'opportunities', action: 'read', scope: 'self', description: 'View own opportunities' },
      { module: 'opportunities', action: 'create', scope: 'all', description: 'Create opportunities' },
      { module: 'opportunities', action: 'create', scope: 'self', description: 'Create own opportunities' },
      { module: 'opportunities', action: 'update', scope: 'all', description: 'Update opportunities' },
      { module: 'opportunities', action: 'update', scope: 'self', description: 'Update own opportunities' },
      { module: 'opportunities', action: 'delete', scope: 'all', description: 'Delete opportunities' },
      { module: 'opportunities', action: 'delete', scope: 'self', description: 'Delete own opportunities' },

      // Contacts permissions
      { module: 'contacts', action: 'read', scope: 'all', description: 'View all contacts' },
      { module: 'contacts', action: 'read', scope: 'self', description: 'View own contacts' },
      { module: 'contacts', action: 'create', scope: 'all', description: 'Create contacts' },
      { module: 'contacts', action: 'create', scope: 'self', description: 'Create own contacts' },
      { module: 'contacts', action: 'update', scope: 'all', description: 'Update contacts' },
      { module: 'contacts', action: 'update', scope: 'self', description: 'Update own contacts' },
      { module: 'contacts', action: 'delete', scope: 'all', description: 'Delete contacts' },
      { module: 'contacts', action: 'delete', scope: 'self', description: 'Delete own contacts' },

      // Contracts permissions
      { module: 'contracts', action: 'read', scope: 'all', description: 'View all contracts' },
      { module: 'contracts', action: 'read', scope: 'self', description: 'View own contracts' },
      { module: 'contracts', action: 'create', scope: 'all', description: 'Create contracts' },
      { module: 'contracts', action: 'create', scope: 'self', description: 'Create own contracts' },
      { module: 'contracts', action: 'update', scope: 'all', description: 'Update contracts' },
      { module: 'contracts', action: 'update', scope: 'self', description: 'Update own contracts' },
      { module: 'contracts', action: 'delete', scope: 'all', description: 'Delete contracts' },
      { module: 'contracts', action: 'delete', scope: 'self', description: 'Delete own contracts' },

      // Projects permissions
      { module: 'projects', action: 'read', scope: 'all', description: 'View all projects' },
      { module: 'projects', action: 'read', scope: 'self', description: 'View own projects' },
      { module: 'projects', action: 'create', scope: 'all', description: 'Create projects' },
      { module: 'projects', action: 'create', scope: 'self', description: 'Create own projects' },
      { module: 'projects', action: 'update', scope: 'all', description: 'Update projects' },
      { module: 'projects', action: 'update', scope: 'self', description: 'Update own projects' },
      { module: 'projects', action: 'delete', scope: 'all', description: 'Delete projects' },
      { module: 'projects', action: 'delete', scope: 'self', description: 'Delete own projects' },

      // Tickets permissions
      { module: 'tickets', action: 'read', scope: 'all', description: 'View all tickets' },
      { module: 'tickets', action: 'read', scope: 'self', description: 'View own tickets' },
      { module: 'tickets', action: 'create', scope: 'all', description: 'Create tickets' },
      { module: 'tickets', action: 'create', scope: 'self', description: 'Create own tickets' },
      { module: 'tickets', action: 'update', scope: 'all', description: 'Update tickets' },
      { module: 'tickets', action: 'update', scope: 'self', description: 'Update own tickets' },
      { module: 'tickets', action: 'delete', scope: 'all', description: 'Delete tickets' },
      { module: 'tickets', action: 'delete', scope: 'self', description: 'Delete own tickets' },

      // Audit Log permissions
      { module: 'audit_log', action: 'read', scope: 'all', description: 'View all audit logs' },
      { module: 'audit_log', action: 'read', scope: 'self', description: 'View own audit logs' },

      // Users permissions
      { module: 'users', action: 'read', scope: 'all', description: 'View all users' },
      { module: 'users', action: 'read', scope: 'self', description: 'View own profile' },
      { module: 'users', action: 'create', scope: 'all', description: 'Create users' },
      { module: 'users', action: 'update', scope: 'all', description: 'Update users' },
      { module: 'users', action: 'delete', scope: 'all', description: 'Delete users' },

      // Reports permissions
      { module: 'reports', action: 'read', scope: 'all', description: 'View all reports' },
      { module: 'reports', action: 'read', scope: 'self', description: 'View own reports' },

      // Admin permissions
      { module: 'admin', action: 'manage_users', scope: 'all', description: 'Manage users' },
      { module: 'admin', action: 'manage_roles', scope: 'all', description: 'Manage roles' },
      { module: 'admin', action: 'manage_settings', scope: 'all', description: 'Manage settings' },
      { module: 'admin', action: 'view_audit_log', scope: 'all', description: 'View audit logs' },
    ];

    for (const perm of permissions) {
      const existing = await permissionRepository.findOne({
        where: { module: perm.module, action: perm.action, scope: perm.scope },
      });
      if (!existing) {
        await permissionRepository.save(
          permissionRepository.create({
            module: perm.module,
            action: perm.action,
            scope: perm.scope,
            description: perm.description,
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

    // Deal Stage Manager role - can only update lead status and opportunity stages/probability
    let dealManagerRole = await roleRepository.findOne({
      where: { name: 'Deal Stage Manager' },
    });
    if (!dealManagerRole) {
      const dealManagerPerms = allPermissions.filter((p) => {
        // Can read leads and opportunities, update read permissions
        return (p.module === 'leads' && p.action === 'read') ||
               (p.module === 'opportunities' && p.action === 'read') ||
               (p.module === 'contacts' && p.action === 'read') ||
               (p.module === 'accounts' && p.action === 'read') ||
               (p.module === 'reports' && p.action === 'read');
      });
      dealManagerRole = roleRepository.create({
        name: 'Deal Stage Manager',
        description: 'Can update lead status and opportunity stages/probability',
        permissions: dealManagerPerms,
      });
      await roleRepository.save(dealManagerRole);
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

    // Create demo users with default passwords
    // SECURITY: These are default demo accounts for development only
    // In production, use secure random passwords and send via secure email
    const DEFAULT_PASSWORDS = {
      admin: process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe@Admin2026!',
      sales: process.env.SALES_DEFAULT_PASSWORD || 'ChangeMe@Sales2026!',
      manager: process.env.MANAGER_DEFAULT_PASSWORD || 'ChangeMe@Manager2026!',
    };

    const adminUser = await userRepository.findOne({
      where: { email: 'admin@tst.travel' },
    });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORDS.admin, 13);
      await userRepository.save(
        userRepository.create({
          email: 'admin@tst.travel',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: adminRole,
          isActive: true,
        })
      );
      logger.info('Admin user created with default password. CHANGE THIS IMMEDIATELY.');
    }

    const salesRepUser = await userRepository.findOne({
      where: { email: 'sales@tst.travel' },
    });
    if (!salesRepUser) {
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORDS.sales, 13);
      await userRepository.save(
        userRepository.create({
          email: 'sales@tst.travel',
          password: hashedPassword,
          firstName: 'John',
          lastName: 'Smith',
          phoneNumber: '+1-555-0100',
          role: repRole,
          isActive: true,
        })
      );
      logger.info('Sales Rep user created with default password. CHANGE THIS IMMEDIATELY.');
    }

    const stageManagerUser = await userRepository.findOne({
      where: { email: 'manager@tst.travel' },
    });
    if (!stageManagerUser) {
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORDS.manager, 13);
      await userRepository.save(
        userRepository.create({
          email: 'manager@tst.travel',
          password: hashedPassword,
          firstName: 'Sarah',
          lastName: 'Johnson',
          phoneNumber: '+1-555-0101',
          role: dealManagerRole,
          isActive: true,
        })
      );
      logger.info('Manager user created with default password. CHANGE THIS IMMEDIATELY.');
    }

    logger.info('Demo users created');

    // Seed sample tickets
    const ticketRepository = AppDataSource.getRepository(require('../models/Ticket').Ticket);
    const accountRepository = AppDataSource.getRepository(require('../models/Account').Account);

    const ticketReporter = await userRepository.findOne({ where: { email: 'admin@tst.travel' } });
    const accounts = await accountRepository.find({ take: 2 });

    if (accounts.length > 0 && ticketReporter) {
      const sampleTickets = [
        {
          ticketNumber: 'TKT-000001',
          title: 'Login issues on mobile app',
          description: 'Users unable to login on iOS app after latest update',
          priority: 'Critical',
          status: 'Open',
          category: 'Technical Support',
          account: accounts[0],
          reporter: ticketReporter,
          slaResponseHours: 1,
          slaResolutionHours: 4,
        },
        {
          ticketNumber: 'TKT-000002',
          title: 'Missing invoice for last month',
          description: 'Invoice for November 2026 not received',
          priority: 'High',
          status: 'In Progress',
          category: 'Billing',
          account: accounts[0],
          reporter: ticketReporter,
          slaResponseHours: 2,
          slaResolutionHours: 8,
        },
        {
          ticketNumber: 'TKT-000003',
          title: 'Feature request: Dark mode',
          description: 'Request to add dark mode theme to the dashboard',
          priority: 'Low',
          status: 'Open',
          category: 'Feature Request',
          account: accounts[1] || accounts[0],
          reporter: ticketReporter,
          slaResponseHours: 4,
          slaResolutionHours: 48,
        },
        {
          ticketNumber: 'TKT-000004',
          title: 'API rate limit exceeded',
          description: 'Getting 429 errors when integrating with third-party system',
          priority: 'High',
          status: 'Pending Customer',
          category: 'Technical Support',
          account: accounts[1] || accounts[0],
          reporter: ticketReporter,
          slaResponseHours: 2,
          slaResolutionHours: 12,
        },
        {
          ticketNumber: 'TKT-000005',
          title: 'Data export not working',
          description: 'CSV export feature returns empty file',
          priority: 'Medium',
          status: 'Resolved',
          category: 'Bug',
          account: accounts[0],
          reporter: ticketReporter,
          slaResponseHours: 3,
          slaResolutionHours: 12,
          resolvedAt: new Date(),
        },
      ];

      for (const ticket of sampleTickets) {
        const existing = await ticketRepository.findOne({ where: { ticketNumber: ticket.ticketNumber } });
        if (!existing) {
          await ticketRepository.save(ticketRepository.create(ticket));
        }
      }
      logger.info('Sample tickets created');
    }

    // Seed sample projects
    const projectRepository = AppDataSource.getRepository(require('../models/Project').Project);

    if (accounts.length > 0 && ticketReporter) {
      const sampleProjects = [
        {
          projectName: 'Platform Migration to Cloud',
          status: 'In Progress',
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-08-30'),
          goLiveDate: new Date('2026-08-30'),
          budget: 150000,
          revenue: 150000,
          progressPercent: 65,
          description: 'Migrate legacy system to AWS cloud infrastructure',
          account: accounts[0],
          owner: ticketReporter,
        },
        {
          projectName: 'Mobile App Redesign',
          status: 'Planning',
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-10-31'),
          goLiveDate: new Date('2026-10-31'),
          budget: 85000,
          revenue: 85000,
          progressPercent: 15,
          description: 'Complete redesign of mobile application UI/UX',
          account: accounts[1] || accounts[0],
          owner: ticketReporter,
        },
        {
          projectName: 'Data Analytics Dashboard',
          status: 'Completed',
          startDate: new Date('2026-03-15'),
          endDate: new Date('2026-05-30'),
          goLiveDate: new Date('2026-05-30'),
          budget: 45000,
          revenue: 45000,
          progressPercent: 100,
          description: 'Build comprehensive analytics dashboard with real-time reporting',
          account: accounts[0],
          owner: ticketReporter,
        },
        {
          projectName: 'Security Audit & Compliance',
          status: 'On Hold',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-07-31'),
          goLiveDate: null,
          budget: 35000,
          revenue: 35000,
          progressPercent: 30,
          description: 'Complete security audit and implement SOC 2 compliance',
          account: accounts[1] || accounts[0],
          owner: ticketReporter,
        },
      ];

      for (const project of sampleProjects) {
        const existing = await projectRepository.findOne({ where: { projectName: project.projectName } });
        if (!existing) {
          await projectRepository.save(projectRepository.create(project));
        }
      }
      logger.info('Sample projects created');
    }

    // Seed sample contracts
    const contractRepository = AppDataSource.getRepository(require('../models/Contract').Contract);

    if (accounts.length > 0) {
      const sampleContracts = [
        {
          contractNumber: 'CTR-2026-001',
          title: 'Annual SaaS Subscription Agreement',
          type: 'SaaS Subscription',
          value: 50000,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-01-01'),
          renewalDate: new Date('2026-11-01'),
          status: 'Active',
          paymentTerms: 'Net 30',
          slaTerms: '99.9% uptime SLA',
          account: accounts[0],
        },
        {
          contractNumber: 'CTR-2026-002',
          title: 'Professional Services - Implementation',
          type: 'Professional Services',
          value: 75000,
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-08-31'),
          renewalDate: null,
          status: 'Active',
          paymentTerms: 'Milestone based',
          slaTerms: '48-hour response time',
          account: accounts[1] || accounts[0],
        },
        {
          contractNumber: 'CTR-2026-003',
          title: 'Support & Maintenance Contract',
          type: 'Support',
          value: 25000,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-02-01'),
          renewalDate: new Date('2027-01-01'),
          status: 'Active',
          paymentTerms: 'Net 15',
          slaTerms: '24-hour response, 4-hour critical',
          account: accounts[0],
        },
        {
          contractNumber: 'CTR-2026-004',
          title: 'Data Migration Services',
          type: 'Services',
          value: 35000,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-06-30'),
          renewalDate: null,
          status: 'Sent for Approval',
          paymentTerms: 'Fixed price',
          slaTerms: 'Project completion within 90 days',
          account: accounts[1] || accounts[0],
        },
        {
          contractNumber: 'CTR-2026-005',
          title: 'Annual Licensing Agreement',
          type: 'License',
          value: 120000,
          startDate: new Date('2026-01-15'),
          endDate: new Date('2027-01-15'),
          renewalDate: new Date('2026-12-15'),
          status: 'Approved',
          paymentTerms: 'Quarterly',
          slaTerms: 'Enterprise support included',
          account: accounts[0],
        },
      ];

      for (const contract of sampleContracts) {
        const existing = await contractRepository.findOne({ where: { contractNumber: contract.contractNumber } });
        if (!existing) {
          await contractRepository.save(contractRepository.create(contract));
        }
      }
      logger.info('Sample contracts created');
    }

    // Seed product categories
    const categoryRepository = AppDataSource.getRepository(ProductCategory);
    const demoCategories = [
      { name: 'Subscription', code: 'SUB', description: 'Subscription-based products', displayOrder: 1 },
      { name: 'Service', code: 'SVC', description: 'Professional services', displayOrder: 2 },
      { name: 'Add-on', code: 'ADDON', description: 'Add-on products', displayOrder: 3 },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of demoCategories) {
      const existing = await categoryRepository.findOne({ where: { code: cat.code } });
      if (!existing) {
        const created = await categoryRepository.save(categoryRepository.create(cat));
        categoryMap[cat.name] = created.id;
      } else {
        categoryMap[cat.name] = existing.id;
      }
    }

    // Seed a small product catalog
    const productRepository = AppDataSource.getRepository(Product);
    const demoProducts = [
      { name: 'Starter Plan', sku: 'PLAN-START', categoryId: categoryMap['Subscription'], unitPrice: 49, billingType: 'subscription' },
      { name: 'Professional Plan', sku: 'PLAN-PRO', categoryId: categoryMap['Subscription'], unitPrice: 149, billingType: 'subscription' },
      { name: 'Enterprise Plan', sku: 'PLAN-ENT', categoryId: categoryMap['Subscription'], unitPrice: 499, billingType: 'subscription' },
      { name: 'Implementation & Onboarding', sku: 'SVC-IMPL', categoryId: categoryMap['Service'], unitPrice: 2000, billingType: 'one-time' },
      { name: 'Premium Support (Annual)', sku: 'SVC-SUPPORT', categoryId: categoryMap['Service'], unitPrice: 1200, billingType: 'subscription' },
      { name: 'Additional User Seat', sku: 'ADDON-SEAT', categoryId: categoryMap['Add-on'], unitPrice: 15, billingType: 'subscription' },
    ];

    for (const p of demoProducts) {
      const existing = await productRepository.findOne({ where: { sku: p.sku } });
      if (!existing) {
        const product = productRepository.create({
          name: p.name,
          sku: p.sku,
          categoryId: p.categoryId,
          unitPrice: p.unitPrice,
          billingType: p.billingType,
          isActive: true,
        });
        await productRepository.save(product);
      }
    }

    logger.info('Demo products and categories created');

    // Seed countries
    const countryRepository = AppDataSource.getRepository(Country);
    for (const countryData of countriesData) {
      const existing = await countryRepository.findOne({
        where: { code: countryData.code },
      });
      if (!existing) {
        await countryRepository.save(
          countryRepository.create({
            code: countryData.code,
            name: countryData.name,
            region: countryData.region,
          })
        );
      }
    }
    logger.info(`Countries seeded: ${countriesData.length} countries created/updated`);

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
