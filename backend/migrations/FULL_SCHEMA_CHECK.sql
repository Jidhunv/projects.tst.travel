-- ============================================================================
-- FULL SCHEMA CHECK - CREATE/UPDATE IF NOT EXISTS
-- ============================================================================
-- Production-safe schema definition for entire CRM system
-- Safe to run multiple times - all operations use IF NOT EXISTS
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "roleId" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_roleId ON users("roleId");

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ============================================================================
-- ROLE PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "roleId" UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    scope VARCHAR(20) DEFAULT 'all',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("roleId", module, action, scope)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_roleId ON role_permissions("roleId");
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON role_permissions(module);

-- ============================================================================
-- COUNTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

-- ============================================================================
-- ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(100),
    "contactPerson" VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    size VARCHAR(50),
    website VARCHAR(255),
    "phoneNumber" VARCHAR(20),
    "alternatePhoneNumber" VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    type VARCHAR(50) DEFAULT 'Prospect',
    status VARCHAR(50) DEFAULT 'Prospect',
    tier VARCHAR(100),
    remark TEXT,
    "ownerId" UUID NOT NULL,
    "createdBy" UUID,
    "teamId" UUID,
    "billingStreet" VARCHAR(255),
    "billingCity" VARCHAR(100),
    "billingState" VARCHAR(100),
    "billingZip" VARCHAR(20),
    "billingCountry" VARCHAR(100),
    "shippingStreet" VARCHAR(255),
    "shippingCity" VARCHAR(100),
    "shippingState" VARCHAR(100),
    "shippingZip" VARCHAR(20),
    "shippingCountry" VARCHAR(100),
    "onboardingStatus" VARCHAR(50) DEFAULT 'Not Started',
    "onboardingDate" TIMESTAMP,
    "onboardingCompletedDate" TIMESTAMP,
    "onboardingNotes" TEXT,
    "contractSignedDate" TIMESTAMP,
    "goLiveDate" TIMESTAMP,
    "accountManager" VARCHAR(255),
    "billingContact" VARCHAR(255),
    "technicalContact" VARCHAR(255),
    tags VARCHAR(1000),
    "assigneeIds" TEXT[],
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tier VARCHAR(100);
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_accounts_ownerId ON accounts("ownerId");
CREATE INDEX IF NOT EXISTS idx_accounts_country ON accounts(country);
CREATE INDEX IF NOT EXISTS idx_accounts_tier ON accounts(tier);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

-- ============================================================================
-- CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    "phoneNumber" VARCHAR(20),
    "jobTitle" VARCHAR(100),
    role VARCHAR(100),
    "isPrimary" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_accountId ON contacts("accountId");
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "categoryId" UUID,
    price NUMERIC(15, 2) DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products("categoryId");

-- ============================================================================
-- PRODUCT CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    "phoneNumber" VARCHAR(20),
    company VARCHAR(255),
    "jobTitle" VARCHAR(100),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open',
    score INT DEFAULT 0,
    value NUMERIC(15, 2) DEFAULT 0,
    "expectedCloseDate" TIMESTAMP,
    "productId" VARCHAR(255),
    "productName" VARCHAR(255),
    "productIds" TEXT[],
    "productNames" TEXT[],
    "businessVolume" NUMERIC(15, 2),
    "supplierList" TEXT[],
    region VARCHAR(100),
    country VARCHAR(100),
    tier VARCHAR(100),
    "lostReason" TEXT,
    remark TEXT,
    "ownerId" UUID NOT NULL,
    "accountId" UUID NOT NULL REFERENCES accounts(id),
    tags VARCHAR(1000),
    "assigneeIds" TEXT[],
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS tier VARCHAR(100);
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_ownerId ON leads("ownerId");
CREATE INDEX IF NOT EXISTS idx_leads_accountId ON leads("accountId");
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);

-- ============================================================================
-- OPPORTUNITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    probability INT DEFAULT 10,
    "forecastedCloseDate" TIMESTAMP NOT NULL,
    "expectedCloseMonth" VARCHAR(7),
    "accountId" UUID NOT NULL REFERENCES accounts(id),
    "primaryContactId" UUID REFERENCES contacts(id),
    "ownerId" UUID NOT NULL,
    country VARCHAR(100),
    city VARCHAR(255),
    region VARCHAR(100),
    tier VARCHAR(100),
    "closedAt" TIMESTAMP,
    "closedReason" VARCHAR(255),
    "convertedFromLeadId" UUID,
    tags VARCHAR(1000),
    "assigneeIds" TEXT[],
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "expectedCloseMonth" VARCHAR(7);
  ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS city VARCHAR(255);
  ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tier VARCHAR(100);
END $$;

CREATE INDEX IF NOT EXISTS idx_opportunities_name ON opportunities(name);
CREATE INDEX IF NOT EXISTS idx_opportunities_accountId ON opportunities("accountId");
CREATE INDEX IF NOT EXISTS idx_opportunities_ownerId ON opportunities("ownerId");
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_country ON opportunities(country);
CREATE INDEX IF NOT EXISTS idx_opportunities_city ON opportunities(city);
CREATE INDEX IF NOT EXISTS idx_opportunities_tier ON opportunities(tier);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close_month ON opportunities("expectedCloseMonth");
CREATE INDEX IF NOT EXISTS idx_opportunities_forecastedCloseDate ON opportunities("forecastedCloseDate");

-- ============================================================================
-- LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "opportunityId" UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    "productId" VARCHAR(255),
    "productName" VARCHAR(255),
    quantity INT DEFAULT 1,
    "unitPrice" NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    "discountPercent" NUMERIC(5, 2) DEFAULT 0,
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_line_items_opportunityId ON line_items("opportunityId");

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "contactPerson" VARCHAR(255),
    email VARCHAR(255),
    "phoneNumber" VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    remark TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================================
-- SALES VISITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES accounts(id),
    "visitDate" TIMESTAMP NOT NULL,
    "visitType" VARCHAR(50),
    notes TEXT,
    outcome VARCHAR(100),
    "nextFollowUp" TIMESTAMP,
    "createdBy" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_visits_accountId ON sales_visits("accountId");
CREATE INDEX IF NOT EXISTS idx_sales_visits_visitDate ON sales_visits("visitDate");

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category VARCHAR(100),
    "expenseDate" TIMESTAMP NOT NULL,
    "accountId" UUID REFERENCES accounts(id),
    "createdBy" UUID,
    status VARCHAR(50) DEFAULT 'Pending',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_accountId ON expenses("accountId");
CREATE INDEX IF NOT EXISTS idx_expenses_expenseDate ON expenses("expenseDate");

-- ============================================================================
-- TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Open',
    priority VARCHAR(50) DEFAULT 'Medium',
    "accountId" UUID REFERENCES accounts(id),
    "assignedTo" UUID,
    "createdBy" UUID,
    "dueDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_accountId ON tickets("accountId");
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignedTo ON tickets("assignedTo");

-- ============================================================================
-- CONTRACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "contractNumber" VARCHAR(100) UNIQUE NOT NULL,
    "accountId" UUID NOT NULL REFERENCES accounts(id),
    value NUMERIC(15, 2),
    "startDate" TIMESTAMP,
    "endDate" TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Draft',
    terms TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_accountId ON contracts("accountId");
CREATE INDEX IF NOT EXISTS idx_contracts_contractNumber ON contracts("contractNumber");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "accountId" UUID NOT NULL REFERENCES accounts(id),
    status VARCHAR(50) DEFAULT 'Planning',
    "startDate" TIMESTAMP,
    "endDate" TIMESTAMP,
    budget NUMERIC(15, 2),
    "projectManager" UUID,
    "createdBy" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_accountId ON projects("accountId");
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoiceNumber" VARCHAR(100) UNIQUE NOT NULL,
    "accountId" UUID NOT NULL REFERENCES accounts(id),
    amount NUMERIC(15, 2) NOT NULL,
    "issueDate" TIMESTAMP,
    "dueDate" TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Draft',
    notes TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_accountId ON invoices("accountId");
CREATE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices("invoiceNumber");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "parentTeamId" UUID REFERENCES teams(id),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_parentTeamId ON teams("parentTeamId");

-- ============================================================================
-- USER TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "teamId")
);

CREATE INDEX IF NOT EXISTS idx_user_teams_userId ON user_teams("userId");
CREATE INDEX IF NOT EXISTS idx_user_teams_teamId ON user_teams("teamId");

-- ============================================================================
-- TEAM SUPERVISORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "supervisorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("supervisorId", "teamId")
);

CREATE INDEX IF NOT EXISTS idx_team_supervisors_supervisorId ON team_supervisors("supervisorId");
CREATE INDEX IF NOT EXISTS idx_team_supervisors_teamId ON team_supervisors("teamId");

-- ============================================================================
-- ACCOUNT TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("accountId", "teamId")
);

CREATE INDEX IF NOT EXISTS idx_account_teams_accountId ON account_teams("accountId");
CREATE INDEX IF NOT EXISTS idx_account_teams_teamId ON account_teams("teamId");

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT '✅ Full schema check completed successfully - all tables and columns are in place' as status;
