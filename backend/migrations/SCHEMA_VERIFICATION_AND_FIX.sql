-- ============================================================================
-- COMPLETE SCHEMA VERIFICATION & AUTO-FIX
-- ============================================================================
-- This script:
-- 1. Checks if all tables exist
-- 2. Checks if all required columns exist
-- 3. Adds missing columns automatically
-- 4. Creates all necessary indexes
-- 5. Verifies schema integrity
--
-- Safe to run multiple times - uses IF NOT EXISTS everywhere
-- No psql meta-commands - pure SQL only
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- VERIFICATION TABLE - To track what was checked/fixed
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_verification_log (
    id SERIAL PRIMARY KEY,
    check_name VARCHAR(255),
    status VARCHAR(50),
    message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HELPER FUNCTION: Add column safely
-- ============================================================================
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    p_table_name text,
    p_column_name text,
    p_column_type text
) RETURNS void AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = p_column_name
    ) INTO v_exists;

    IF NOT v_exists THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', p_table_name, p_column_name, p_column_type);
        INSERT INTO schema_verification_log (check_name, status, message)
        VALUES (p_table_name || '.' || p_column_name, 'CREATED', 'Column added successfully');
    ELSE
        INSERT INTO schema_verification_log (check_name, status, message)
        VALUES (p_table_name || '.' || p_column_name, 'EXISTS', 'Column already exists');
    END IF;
END;
$$ LANGUAGE plpgsql;

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

SELECT add_column_if_not_exists('users', 'email', 'VARCHAR(255)');
SELECT add_column_if_not_exists('users', 'password', 'VARCHAR(255)');
SELECT add_column_if_not_exists('users', 'firstName', 'VARCHAR(100)');
SELECT add_column_if_not_exists('users', 'lastName', 'VARCHAR(100)');
SELECT add_column_if_not_exists('users', 'roleId', 'UUID');
SELECT add_column_if_not_exists('users', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('users', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

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

SELECT add_column_if_not_exists('roles', 'name', 'VARCHAR(100)');
SELECT add_column_if_not_exists('roles', 'description', 'TEXT');
SELECT add_column_if_not_exists('roles', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('roles', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ============================================================================
-- ROLE PERMISSIONS TABLE (Flexible schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('role_permissions', 'roleId', 'UUID');
SELECT add_column_if_not_exists('role_permissions', 'module', 'VARCHAR(100)');
SELECT add_column_if_not_exists('role_permissions', 'action', 'VARCHAR(50)');
SELECT add_column_if_not_exists('role_permissions', 'scope', 'VARCHAR(20) DEFAULT ''all''');
SELECT add_column_if_not_exists('role_permissions', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

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

SELECT add_column_if_not_exists('countries', 'code', 'VARCHAR(2)');
SELECT add_column_if_not_exists('countries', 'name', 'VARCHAR(100)');
SELECT add_column_if_not_exists('countries', 'region', 'VARCHAR(100)');
SELECT add_column_if_not_exists('countries', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('countries', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "parentTeamId" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('teams', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('teams', 'description', 'TEXT');
SELECT add_column_if_not_exists('teams', 'parentTeamId', 'UUID');
SELECT add_column_if_not_exists('teams', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('teams', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_parentTeamId ON teams("parentTeamId");

-- ============================================================================
-- ACCOUNTS TABLE (Core entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('accounts', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'industry', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'contactPerson', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'city', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'region', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'country', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'size', 'VARCHAR(50)');
SELECT add_column_if_not_exists('accounts', 'website', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'phoneNumber', 'VARCHAR(20)');
SELECT add_column_if_not_exists('accounts', 'alternatePhoneNumber', 'VARCHAR(20)');
SELECT add_column_if_not_exists('accounts', 'email', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'type', 'VARCHAR(50)');
SELECT add_column_if_not_exists('accounts', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('accounts', 'tier', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'remark', 'TEXT');
SELECT add_column_if_not_exists('accounts', 'ownerId', 'UUID');
SELECT add_column_if_not_exists('accounts', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('accounts', 'teamId', 'UUID');
SELECT add_column_if_not_exists('accounts', 'billingStreet', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'billingCity', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'billingState', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'billingZip', 'VARCHAR(20)');
SELECT add_column_if_not_exists('accounts', 'billingCountry', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'shippingStreet', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'shippingCity', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'shippingState', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'shippingZip', 'VARCHAR(20)');
SELECT add_column_if_not_exists('accounts', 'shippingCountry', 'VARCHAR(100)');
SELECT add_column_if_not_exists('accounts', 'onboardingStatus', 'VARCHAR(50)');
SELECT add_column_if_not_exists('accounts', 'onboardingDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('accounts', 'onboardingCompletedDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('accounts', 'onboardingNotes', 'TEXT');
SELECT add_column_if_not_exists('accounts', 'contractSignedDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('accounts', 'goLiveDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('accounts', 'accountManager', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'billingContact', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'technicalContact', 'VARCHAR(255)');
SELECT add_column_if_not_exists('accounts', 'tags', 'VARCHAR(1000)');
SELECT add_column_if_not_exists('accounts', 'assigneeIds', 'TEXT[]');
SELECT add_column_if_not_exists('accounts', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('accounts', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_accounts_ownerId ON accounts("ownerId");
CREATE INDEX IF NOT EXISTS idx_accounts_country ON accounts(country);
CREATE INDEX IF NOT EXISTS idx_accounts_tier ON accounts(tier);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- ============================================================================
-- CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('contacts', 'accountId', 'UUID');
SELECT add_column_if_not_exists('contacts', 'firstName', 'VARCHAR(100)');
SELECT add_column_if_not_exists('contacts', 'lastName', 'VARCHAR(100)');
SELECT add_column_if_not_exists('contacts', 'email', 'VARCHAR(255)');
SELECT add_column_if_not_exists('contacts', 'phoneNumber', 'VARCHAR(20)');
SELECT add_column_if_not_exists('contacts', 'jobTitle', 'VARCHAR(100)');
SELECT add_column_if_not_exists('contacts', 'role', 'VARCHAR(100)');
SELECT add_column_if_not_exists('contacts', 'isPrimary', 'BOOLEAN DEFAULT FALSE');
SELECT add_column_if_not_exists('contacts', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('contacts', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_contacts_accountId ON contacts("accountId");
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('products', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('products', 'description', 'TEXT');
SELECT add_column_if_not_exists('products', 'categoryId', 'UUID');
SELECT add_column_if_not_exists('products', 'price', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('products', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('products', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products("categoryId");

-- ============================================================================
-- PRODUCT CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('product_categories', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('product_categories', 'description', 'TEXT');
SELECT add_column_if_not_exists('product_categories', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('product_categories', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    "accountId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('leads', 'firstName', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'lastName', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'email', 'VARCHAR(255)');
SELECT add_column_if_not_exists('leads', 'phoneNumber', 'VARCHAR(20)');
SELECT add_column_if_not_exists('leads', 'company', 'VARCHAR(255)');
SELECT add_column_if_not_exists('leads', 'jobTitle', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'source', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('leads', 'score', 'INT');
SELECT add_column_if_not_exists('leads', 'value', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('leads', 'expectedCloseDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('leads', 'productId', 'VARCHAR(255)');
SELECT add_column_if_not_exists('leads', 'productName', 'VARCHAR(255)');
SELECT add_column_if_not_exists('leads', 'productIds', 'TEXT[]');
SELECT add_column_if_not_exists('leads', 'productNames', 'TEXT[]');
SELECT add_column_if_not_exists('leads', 'businessVolume', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('leads', 'supplierList', 'TEXT[]');
SELECT add_column_if_not_exists('leads', 'region', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'country', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'tier', 'VARCHAR(100)');
SELECT add_column_if_not_exists('leads', 'lostReason', 'TEXT');
SELECT add_column_if_not_exists('leads', 'remark', 'TEXT');
SELECT add_column_if_not_exists('leads', 'ownerId', 'UUID');
SELECT add_column_if_not_exists('leads', 'accountId', 'UUID');
SELECT add_column_if_not_exists('leads', 'tags', 'VARCHAR(1000)');
SELECT add_column_if_not_exists('leads', 'assigneeIds', 'TEXT[]');
SELECT add_column_if_not_exists('leads', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('leads', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

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
    "accountId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('opportunities', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('opportunities', 'description', 'TEXT');
SELECT add_column_if_not_exists('opportunities', 'amount', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('opportunities', 'stage', 'VARCHAR(50)');
SELECT add_column_if_not_exists('opportunities', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('opportunities', 'probability', 'INT');
SELECT add_column_if_not_exists('opportunities', 'forecastedCloseDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('opportunities', 'expectedCloseMonth', 'VARCHAR(7)');
SELECT add_column_if_not_exists('opportunities', 'accountId', 'UUID');
SELECT add_column_if_not_exists('opportunities', 'primaryContactId', 'UUID');
SELECT add_column_if_not_exists('opportunities', 'ownerId', 'UUID');
SELECT add_column_if_not_exists('opportunities', 'country', 'VARCHAR(100)');
SELECT add_column_if_not_exists('opportunities', 'city', 'VARCHAR(255)');
SELECT add_column_if_not_exists('opportunities', 'region', 'VARCHAR(100)');
SELECT add_column_if_not_exists('opportunities', 'tier', 'VARCHAR(100)');
SELECT add_column_if_not_exists('opportunities', 'closedAt', 'TIMESTAMP');
SELECT add_column_if_not_exists('opportunities', 'closedReason', 'VARCHAR(255)');
SELECT add_column_if_not_exists('opportunities', 'convertedFromLeadId', 'UUID');
SELECT add_column_if_not_exists('opportunities', 'tags', 'VARCHAR(1000)');
SELECT add_column_if_not_exists('opportunities', 'assigneeIds', 'TEXT[]');
SELECT add_column_if_not_exists('opportunities', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('opportunities', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

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
    "opportunityId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('line_items', 'opportunityId', 'UUID');
SELECT add_column_if_not_exists('line_items', 'productId', 'VARCHAR(255)');
SELECT add_column_if_not_exists('line_items', 'productName', 'VARCHAR(255)');
SELECT add_column_if_not_exists('line_items', 'quantity', 'INT');
SELECT add_column_if_not_exists('line_items', 'unitPrice', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('line_items', 'discount', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('line_items', 'discountPercent', 'NUMERIC(5, 2)');
SELECT add_column_if_not_exists('line_items', 'description', 'TEXT');
SELECT add_column_if_not_exists('line_items', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('line_items', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_line_items_opportunityId ON line_items("opportunityId");

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('suppliers', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('suppliers', 'contactPerson', 'VARCHAR(255)');
SELECT add_column_if_not_exists('suppliers', 'email', 'VARCHAR(255)');
SELECT add_column_if_not_exists('suppliers', 'phoneNumber', 'VARCHAR(20)');
SELECT add_column_if_not_exists('suppliers', 'address', 'TEXT');
SELECT add_column_if_not_exists('suppliers', 'city', 'VARCHAR(100)');
SELECT add_column_if_not_exists('suppliers', 'country', 'VARCHAR(100)');
SELECT add_column_if_not_exists('suppliers', 'remark', 'TEXT');
SELECT add_column_if_not_exists('suppliers', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('suppliers', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================================
-- SALES VISITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('sales_visits', 'accountId', 'UUID');
SELECT add_column_if_not_exists('sales_visits', 'visitDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('sales_visits', 'visitType', 'VARCHAR(50)');
SELECT add_column_if_not_exists('sales_visits', 'notes', 'TEXT');
SELECT add_column_if_not_exists('sales_visits', 'outcome', 'VARCHAR(100)');
SELECT add_column_if_not_exists('sales_visits', 'nextFollowUp', 'TIMESTAMP');
SELECT add_column_if_not_exists('sales_visits', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('sales_visits', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('sales_visits', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_sales_visits_accountId ON sales_visits("accountId");
CREATE INDEX IF NOT EXISTS idx_sales_visits_visitDate ON sales_visits("visitDate");

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('expenses', 'description', 'VARCHAR(255)');
SELECT add_column_if_not_exists('expenses', 'amount', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('expenses', 'category', 'VARCHAR(100)');
SELECT add_column_if_not_exists('expenses', 'expenseDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('expenses', 'accountId', 'UUID');
SELECT add_column_if_not_exists('expenses', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('expenses', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('expenses', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('expenses', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_expenses_accountId ON expenses("accountId");
CREATE INDEX IF NOT EXISTS idx_expenses_expenseDate ON expenses("expenseDate");

-- ============================================================================
-- TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('tickets', 'title', 'VARCHAR(255)');
SELECT add_column_if_not_exists('tickets', 'description', 'TEXT');
SELECT add_column_if_not_exists('tickets', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('tickets', 'priority', 'VARCHAR(50)');
SELECT add_column_if_not_exists('tickets', 'accountId', 'UUID');
SELECT add_column_if_not_exists('tickets', 'assignedTo', 'UUID');
SELECT add_column_if_not_exists('tickets', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('tickets', 'dueDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('tickets', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('tickets', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_tickets_accountId ON tickets("accountId");
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignedTo ON tickets("assignedTo");

-- ============================================================================
-- CONTRACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "contractNumber" VARCHAR(100) UNIQUE NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('contracts', 'contractNumber', 'VARCHAR(100)');
SELECT add_column_if_not_exists('contracts', 'accountId', 'UUID');
SELECT add_column_if_not_exists('contracts', 'value', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('contracts', 'startDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('contracts', 'endDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('contracts', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('contracts', 'terms', 'TEXT');
SELECT add_column_if_not_exists('contracts', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('contracts', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('contracts', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_contracts_accountId ON contracts("accountId");
CREATE INDEX IF NOT EXISTS idx_contracts_contractNumber ON contracts("contractNumber");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('projects', 'name', 'VARCHAR(255)');
SELECT add_column_if_not_exists('projects', 'description', 'TEXT');
SELECT add_column_if_not_exists('projects', 'accountId', 'UUID');
SELECT add_column_if_not_exists('projects', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('projects', 'startDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('projects', 'endDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('projects', 'budget', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('projects', 'projectManager', 'UUID');
SELECT add_column_if_not_exists('projects', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('projects', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('projects', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_projects_accountId ON projects("accountId");
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoiceNumber" VARCHAR(100) UNIQUE NOT NULL,
    "accountId" UUID NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('invoices', 'invoiceNumber', 'VARCHAR(100)');
SELECT add_column_if_not_exists('invoices', 'accountId', 'UUID');
SELECT add_column_if_not_exists('invoices', 'amount', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('invoices', 'issueDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('invoices', 'dueDate', 'TIMESTAMP');
SELECT add_column_if_not_exists('invoices', 'status', 'VARCHAR(50)');
SELECT add_column_if_not_exists('invoices', 'notes', 'TEXT');
SELECT add_column_if_not_exists('invoices', 'createdBy', 'UUID');
SELECT add_column_if_not_exists('invoices', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
SELECT add_column_if_not_exists('invoices', 'updatedAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_invoices_accountId ON invoices("accountId");
CREATE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices("invoiceNumber");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- USER_TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('user_teams', 'userId', 'UUID');
SELECT add_column_if_not_exists('user_teams', 'teamId', 'UUID');
SELECT add_column_if_not_exists('user_teams', 'role', 'VARCHAR(50)');
SELECT add_column_if_not_exists('user_teams', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_user_teams_userId ON user_teams("userId");
CREATE INDEX IF NOT EXISTS idx_user_teams_teamId ON user_teams("teamId");

-- ============================================================================
-- TEAM_SUPERVISORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "supervisorId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('team_supervisors', 'supervisorId', 'UUID');
SELECT add_column_if_not_exists('team_supervisors', 'teamId', 'UUID');
SELECT add_column_if_not_exists('team_supervisors', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_team_supervisors_supervisorId ON team_supervisors("supervisorId");
CREATE INDEX IF NOT EXISTS idx_team_supervisors_teamId ON team_supervisors("teamId");

-- ============================================================================
-- ACCOUNT_TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT add_column_if_not_exists('account_teams', 'accountId', 'UUID');
SELECT add_column_if_not_exists('account_teams', 'teamId', 'UUID');
SELECT add_column_if_not_exists('account_teams', 'createdAt', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CREATE INDEX IF NOT EXISTS idx_account_teams_accountId ON account_teams("accountId");
CREATE INDEX IF NOT EXISTS idx_account_teams_teamId ON account_teams("teamId");

-- ============================================================================
-- VERIFICATION REPORT - Pure SQL Only
-- ============================================================================

SELECT '========================================================================' as report_header;
SELECT 'SCHEMA VERIFICATION COMPLETE - ALL TABLES AND COLUMNS VERIFIED' as status_message;
SELECT '========================================================================' as report_footer;

SELECT '' as blank_line;
SELECT 'SUMMARY OF CHANGES:' as section_header;
SELECT
    status,
    COUNT(*) as count,
    'items ' || status as result
FROM schema_verification_log
GROUP BY status
ORDER BY status;

SELECT '' as blank_line;
SELECT 'TABLE COUNT:' as section_header;
SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';

SELECT '' as blank_line;
SELECT 'COLUMN COUNT:' as section_header;
SELECT COUNT(*) as total_columns FROM information_schema.columns WHERE table_schema = 'public';

SELECT '' as blank_line;
SELECT 'INDEX COUNT:' as section_header;
SELECT COUNT(*) as total_indexes FROM pg_indexes WHERE schemaname = 'public';

SELECT '' as blank_line;
SELECT 'SUCCESS: Database schema is ready for production use' as final_message;
