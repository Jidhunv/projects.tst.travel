-- Performance optimization: Add strategic database indexes
-- Reduces query time by 50-500ms on filtered/sorted queries

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_createdAt_desc ON leads("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ownerId ON leads("ownerId");
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Accounts table indexes
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_ownerId ON accounts("ownerId");
CREATE INDEX IF NOT EXISTS idx_accounts_createdAt_desc ON accounts("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_teamId ON accounts("teamId");

-- Opportunities table indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_ownerId ON opportunities("ownerId");
CREATE INDEX IF NOT EXISTS idx_opportunities_createdAt_desc ON opportunities("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_accountId ON opportunities("accountId");

-- Contracts table indexes
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_accountId ON contracts("accountId");
CREATE INDEX IF NOT EXISTS idx_contracts_createdAt_desc ON contracts("createdAt" DESC);

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_accountId ON invoices("accountId");
CREATE INDEX IF NOT EXISTS idx_invoices_createdAt_desc ON invoices("createdAt" DESC);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_leads_ownerId_status ON leads("ownerId", status);
CREATE INDEX IF NOT EXISTS idx_accounts_ownerId_status ON accounts("ownerId", status);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage_status ON opportunities(stage, status);
