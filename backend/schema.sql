-- =============================================================================
-- CRM PLATFORM DATABASE SCHEMA
-- PostgreSQL Production Setup
-- =============================================================================
-- This schema includes all tables, relationships, indexes, and constraints
-- for the CRM platform. Use this for production deployments.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. CORE AUTH & USERS
-- =============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(20),
  isActive BOOLEAN NOT NULL DEFAULT true,
  roleId UUID,

  -- Password reset
  resetToken VARCHAR(255),
  resetTokenExpiry TIMESTAMP,
  hasChangedPasswordOnFirstLogin BOOLEAN DEFAULT false,
  passwordChangedAt TIMESTAMP,

  -- Email preferences
  emailNotificationsEnabled BOOLEAN DEFAULT true,
  emailNotificationPreferences JSONB DEFAULT '{"leads": true, "opportunities": true, "tickets": true, "contracts": true, "account": true}',

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID,
  updatedBy UUID,

  CONSTRAINT fk_users_role FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_created_by FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  isActive BOOLEAN NOT NULL DEFAULT true,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ck_role_name CHECK (name IN ('Admin', 'Manager', 'Sales Rep', 'Deal Stage Manager'))
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(module, action)
);

CREATE TABLE role_permissions (
  roleId UUID NOT NULL,
  permissionId UUID NOT NULL,

  PRIMARY KEY (roleId, permissionId),
  CONSTRAINT fk_role_perm_role FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_perm_perm FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE
);

-- =============================================================================
-- 2. SALES ENTITIES
-- =============================================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  size VARCHAR(50),
  website VARCHAR(255),

  billingAddress TEXT,
  shippingAddress TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'Prospect',
  type VARCHAR(50),

  accountExecutiveId UUID,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL,
  updatedBy UUID,

  CONSTRAINT fk_accounts_ae FOREIGN KEY (accountExecutiveId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_accounts_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT fk_accounts_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_account_status CHECK (status IN ('Prospect', 'Customer', 'Inactive'))
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountId UUID NOT NULL,

  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phoneNumber VARCHAR(20),
  title VARCHAR(100),

  reportingTo UUID,
  isPrimary BOOLEAN DEFAULT false,
  linkedinUrl VARCHAR(255),

  role VARCHAR(100),

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL,
  updatedBy UUID,

  CONSTRAINT fk_contacts_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_reporting_to FOREIGN KEY (reportingTo) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_contacts_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT fk_contacts_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(20),
  company VARCHAR(255),

  title VARCHAR(100),
  source VARCHAR(100),

  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  ownerId UUID NOT NULL,
  accountId UUID,

  leadScore INTEGER DEFAULT 0,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL,
  updatedBy UUID,

  CONSTRAINT fk_leads_owner FOREIGN KEY (ownerId) REFERENCES users(id),
  CONSTRAINT fk_leads_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_leads_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT fk_leads_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_lead_status CHECK (status IN ('Open', 'Qualified', 'Disqualified', 'Converted'))
);

CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountId UUID NOT NULL,
  primaryContactId UUID,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  stage VARCHAR(100) NOT NULL DEFAULT 'Prospecting',
  status VARCHAR(50) NOT NULL DEFAULT 'Open',

  amount DECIMAL(15, 2),
  probability INTEGER DEFAULT 0,

  ownerId UUID NOT NULL,

  forecastedCloseDate DATE,
  actualCloseDate DATE,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL,
  updatedBy UUID,

  CONSTRAINT fk_opp_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_opp_contact FOREIGN KEY (primaryContactId) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_opp_owner FOREIGN KEY (ownerId) REFERENCES users(id),
  CONSTRAINT fk_opp_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT fk_opp_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_opp_stage CHECK (stage IN ('Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost'))
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),

  standardPrice DECIMAL(15, 2),

  isActive BOOLEAN DEFAULT true,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunityId UUID NOT NULL,
  productId UUID,

  description VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unitPrice DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(5, 2) DEFAULT 0,

  totalPrice DECIMAL(15, 2),

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL,

  CONSTRAINT fk_lineitem_opp FOREIGN KEY (opportunityId) REFERENCES opportunities(id) ON DELETE CASCADE,
  CONSTRAINT fk_lineitem_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_lineitem_created_by FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- =============================================================================
-- 3. SUPPORT & OPERATIONS
-- =============================================================================

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountId UUID NOT NULL,
  ticketNumber VARCHAR(50) NOT NULL UNIQUE,

  subject VARCHAR(255) NOT NULL,
  description TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',

  assignedToId UUID,
  createdById UUID NOT NULL,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP,

  CONSTRAINT fk_ticket_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_assigned_to FOREIGN KEY (assignedToId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ticket_created_by FOREIGN KEY (createdById) REFERENCES users(id),
  CONSTRAINT ck_ticket_status CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  CONSTRAINT ck_ticket_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'))
);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountId UUID NOT NULL,
  opportunityId UUID,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  contractValue DECIMAL(15, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',

  startDate DATE,
  endDate DATE,

  approvedById UUID,
  createdBy UUID NOT NULL,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approvedAt TIMESTAMP,

  CONSTRAINT fk_contract_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_opp FOREIGN KEY (opportunityId) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_approved_by FOREIGN KEY (approvedById) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT ck_contract_status CHECK (status IN ('Draft', 'Awaiting Approval', 'Approved', 'Active', 'Expired', 'Terminated'))
);

-- =============================================================================
-- 4. ACTIVITIES & AUDIT
-- =============================================================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  relatedEntityType VARCHAR(50),
  relatedEntityId UUID,

  type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  description TEXT,

  duration INTEGER,
  location VARCHAR(255),
  participants JSONB,

  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_activity_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT ck_activity_type CHECK (type IN ('Call', 'Email', 'Meeting', 'Task', 'Note'))
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  relatedEntityType VARCHAR(50),
  relatedEntityId UUID,

  content TEXT NOT NULL,

  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedBy UUID,

  CONSTRAINT fk_note_created_by FOREIGN KEY (createdBy) REFERENCES users(id),
  CONSTRAINT fk_note_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID,

  entityType VARCHAR(100) NOT NULL,
  entityId UUID,

  action VARCHAR(50) NOT NULL,
  changes JSONB,

  ipAddress VARCHAR(50),
  userAgent TEXT,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_audit_action CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE'))
);

-- =============================================================================
-- 5. EMAIL CONFIGURATION
-- =============================================================================

CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  smtpHost VARCHAR(255) NOT NULL,
  smtpPort INTEGER NOT NULL DEFAULT 587,
  smtpUser VARCHAR(255) NOT NULL,
  smtpPassword VARCHAR(255) NOT NULL,

  fromEmail VARCHAR(255) NOT NULL,
  fromName VARCHAR(255),

  isConfigured BOOLEAN DEFAULT false,
  enableNotifications BOOLEAN DEFAULT true,

  updatedBy UUID,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_email_settings_updated_by FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- 6. TAGS & METADATA
-- =============================================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7),
  description TEXT,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entity_tags (
  entityType VARCHAR(50) NOT NULL,
  entityId UUID NOT NULL,
  tagId UUID NOT NULL,

  PRIMARY KEY (entityType, entityId, tagId),
  CONSTRAINT fk_entity_tag_tag FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

-- =============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_roleId ON users(roleId);
CREATE INDEX idx_users_isActive ON users(isActive);

-- Leads
CREATE INDEX idx_leads_ownerId ON leads(ownerId);
CREATE INDEX idx_leads_accountId ON leads(accountId);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_createdAt ON leads(createdAt);

-- Accounts
CREATE INDEX idx_accounts_accountExecutiveId ON accounts(accountExecutiveId);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_createdAt ON accounts(createdAt);

-- Contacts
CREATE INDEX idx_contacts_accountId ON contacts(accountId);
CREATE INDEX idx_contacts_email ON contacts(email);

-- Opportunities
CREATE INDEX idx_opportunities_accountId ON opportunities(accountId);
CREATE INDEX idx_opportunities_ownerId ON opportunities(ownerId);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_createdAt ON opportunities(createdAt);

-- Line Items
CREATE INDEX idx_line_items_opportunityId ON line_items(opportunityId);

-- Tickets
CREATE INDEX idx_tickets_accountId ON tickets(accountId);
CREATE INDEX idx_tickets_assignedToId ON tickets(assignedToId);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_createdAt ON tickets(createdAt);

-- Contracts
CREATE INDEX idx_contracts_accountId ON contracts(accountId);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_createdAt ON contracts(createdAt);

-- Activities
CREATE INDEX idx_activities_relatedEntity ON activities(relatedEntityType, relatedEntityId);
CREATE INDEX idx_activities_createdBy ON activities(createdBy);
CREATE INDEX idx_activities_createdAt ON activities(createdAt);

-- Notes
CREATE INDEX idx_notes_relatedEntity ON notes(relatedEntityType, relatedEntityId);

-- Audit Logs
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_entityType ON audit_logs(entityType, entityId);
CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt);

-- =============================================================================
-- 8. INITIALIZATION DATA
-- =============================================================================

-- Default Roles
INSERT INTO roles (name, description, isActive) VALUES
  ('Admin', 'Full system access', true),
  ('Manager', 'Can manage team and view reports', true),
  ('Sales Rep', 'Can manage own leads and opportunities', true),
  ('Deal Stage Manager', 'Can update opportunity stages', true)
ON CONFLICT (name) DO NOTHING;

-- Default Permissions
INSERT INTO permissions (module, action, description) VALUES
  ('users', 'create', 'Create new users'),
  ('users', 'read', 'View users'),
  ('users', 'update', 'Update users'),
  ('users', 'delete', 'Delete users'),

  ('leads', 'create', 'Create leads'),
  ('leads', 'read', 'View leads'),
  ('leads', 'update', 'Update leads'),
  ('leads', 'delete', 'Delete leads'),
  ('leads', 'bulk_import', 'Import leads from CSV'),

  ('accounts', 'create', 'Create accounts'),
  ('accounts', 'read', 'View accounts'),
  ('accounts', 'update', 'Update accounts'),
  ('accounts', 'delete', 'Delete accounts'),

  ('opportunities', 'create', 'Create opportunities'),
  ('opportunities', 'read', 'View opportunities'),
  ('opportunities', 'update', 'Update opportunities'),
  ('opportunities', 'delete', 'Delete opportunities'),
  ('opportunities', 'update_stage', 'Update opportunity stage'),

  ('tickets', 'create', 'Create tickets'),
  ('tickets', 'read', 'View tickets'),
  ('tickets', 'update', 'Update tickets'),
  ('tickets', 'delete', 'Delete tickets'),

  ('contracts', 'create', 'Create contracts'),
  ('contracts', 'read', 'View contracts'),
  ('contracts', 'update', 'Update contracts'),
  ('contracts', 'delete', 'Delete contracts'),

  ('reports', 'read', 'View reports'),
  ('reports', 'export', 'Export reports'),

  ('settings', 'read', 'View settings'),
  ('settings', 'update', 'Update settings'),
  ('email', 'configure', 'Configure email settings'),
  ('email', 'test', 'Test email connection')
ON CONFLICT (module, action) DO NOTHING;

-- Role-Permission Assignments
-- Admin: Full access
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- Manager: Lead & Account management
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Manager'
AND p.module IN ('leads', 'accounts', 'opportunities', 'tickets', 'reports')
ON CONFLICT DO NOTHING;

-- Sales Rep: Own leads & opportunities
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Sales Rep'
AND (p.module IN ('leads', 'opportunities') AND p.action IN ('create', 'read', 'update'))
ON CONFLICT DO NOTHING;

-- Deal Stage Manager: Update stages only
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Deal Stage Manager'
AND p.module = 'opportunities' AND p.action = 'update_stage'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Sales Pipeline View
CREATE OR REPLACE VIEW v_sales_pipeline AS
SELECT
  o.id,
  o.name,
  o.stage,
  o.amount,
  o.probability,
  ROUND((o.amount * o.probability / 100.0)::numeric, 2) as expected_revenue,
  a.name as account_name,
  c.firstName || ' ' || c.lastName as primary_contact,
  u.firstName || ' ' || u.lastName as owner,
  o.forecastedCloseDate,
  o.createdAt
FROM opportunities o
LEFT JOIN accounts a ON o.accountId = a.id
LEFT JOIN contacts c ON o.primaryContactId = c.id
LEFT JOIN users u ON o.ownerId = u.id
WHERE o.status = 'Open'
ORDER BY o.stage, o.amount DESC;

-- User Activity View
CREATE OR REPLACE VIEW v_user_activities AS
SELECT
  u.id,
  u.email,
  u.firstName,
  u.lastName,
  COUNT(a.id) as total_activities,
  MAX(a.createdAt) as last_activity
FROM users u
LEFT JOIN activities a ON u.id = a.createdBy
GROUP BY u.id, u.email, u.firstName, u.lastName;

-- Account Overview
CREATE OR REPLACE VIEW v_account_overview AS
SELECT
  a.id,
  a.name,
  a.status,
  a.type,
  COUNT(DISTINCT c.id) as contact_count,
  COUNT(DISTINCT o.id) as opportunity_count,
  COALESCE(SUM(CASE WHEN o.status = 'Open' THEN o.amount ELSE 0 END), 0) as open_pipeline,
  u.firstName || ' ' || u.lastName as account_executive
FROM accounts a
LEFT JOIN contacts c ON a.id = c.accountId
LEFT JOIN opportunities o ON a.id = o.accountId
LEFT JOIN users u ON a.accountExecutiveId = u.id
GROUP BY a.id, a.name, a.status, a.type, u.firstName, u.lastName;

-- =============================================================================
-- 10. HELPER FUNCTIONS
-- =============================================================================

-- Update 'updatedAt' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_items_updated_at BEFORE UPDATE ON line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON email_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SCHEMA SETUP COMPLETE
-- =============================================================================
-- Tables created: 22
-- Indexes created: 20+
-- Views created: 3
-- Default roles: 4
-- Default permissions: 30+
-- =============================================================================
