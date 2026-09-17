# Complete CRM Schema Reference

## Overview

This document describes the complete database schema for the CRM system. All tables are defined with "CREATE TABLE IF NOT EXISTS" for production safety.

## Quick Start

To apply the complete schema:

```bash
psql -U your_user -d your_database -f FULL_SCHEMA_CHECK.sql
```

This script will:
- ✅ Create all tables if they don't exist
- ✅ Add any missing columns using "ALTER TABLE ADD COLUMN IF NOT EXISTS"
- ✅ Create all necessary indexes
- ✅ Enable required PostgreSQL extensions
- ✅ Safe to run multiple times - no errors if tables already exist

---

## Database Tables

### Core CRM Entities

#### 1. **users**
- Primary table for system users
- Linked to roles for RBAC
- Columns: email, firstName, lastName, roleId, timestamps
- Indexes: email (unique), roleId

#### 2. **roles**
- User role definitions (Admin, Manager, Sales Rep, etc.)
- Columns: name (unique), description, timestamps
- Indexes: name

#### 3. **role_permissions**
- Permission assignments to roles
- Pattern: module:action:scope (e.g., "accounts:create:all")
- Supports self/team/all scoping
- Indexes: roleId, module

#### 4. **teams**
- Organizational teams/departments
- Supports hierarchical structure (parentTeamId)
- Columns: name, description, parentTeamId, timestamps
- Indexes: name, parentTeamId

#### 5. **user_teams**
- Many-to-many: users to teams
- Columns: userId, teamId, role, timestamps
- Unique constraint: (userId, teamId)
- Indexes: userId, teamId

#### 6. **team_supervisors**
- Maps supervisors to teams they oversee
- Columns: supervisorId, teamId, timestamps
- Unique constraint: (supervisorId, teamId)

---

### Sales Entities

#### 7. **accounts** ⭐ Primary business entity
- Companies/prospects being worked with
- **Key fields:**
  - name (unique)
  - type: Prospect, Customer, Inactive
  - status: Prospect, Customer, Inactive
  - tier: T1, T2, T3, T4, T5 (NEW - client classification)
  - ownerId: primary owner
  - assigneeIds: array of secondary owners
  - createdBy: who created the account
  - teamId: assigned team
- **Geographic:** city, region, country
- **Billing/Shipping:** separate address fields
- **Onboarding tracking:** status, dates, notes
- **Contract/Go-live tracking:** contractSignedDate, goLiveDate
- Indexes: name, ownerId, country, tier, type

#### 8. **contacts**
- Individual people associated with accounts
- Linked to accounts (cascade delete)
- isPrimary: marks the primary contact
- Columns: firstName, lastName, email, phoneNumber, jobTitle, role
- Indexes: accountId, email

#### 9. **leads** ⭐ Sales pipeline
- Individual leads/prospects
- **Key fields:**
  - email (unique)
  - status: Open, Qualified, Disqualified, Converted
  - score: lead scoring
  - value: deal value estimate
  - tier: (NEW) client tier from account
  - ownerId: assigned sales rep
  - accountId: parent account
  - assigneeIds: array of secondary owners
- **Products:** productIds[], productNames[], productId (legacy)
- **Suppliers:** supplierList[]
- **Geographic:** region, country
- **Dates:** expectedCloseDate
- **Search:** remark field
- Indexes: email, ownerId, accountId, status, tier

#### 10. **opportunities** ⭐ Sales pipeline (advanced)
- Sales opportunities linked to accounts
- **Key fields:**
  - name
  - amount: deal size
  - stage: Prospecting, Qualification, Proposal, Negotiation, Closed-Won, Closed-Lost
  - status: Open, Won, Lost
  - probability: 0-100
  - forecastedCloseDate
  - tier: (NEW) client tier from account
  - ownerId: assigned sales rep
  - accountId: parent account
  - assigneeIds: array of secondary owners
- **New filtering fields:**
  - expectedCloseMonth: YYYY-MM format (NEW)
  - city: geographic location (NEW)
- **Geographic:** country, region
- **Contact:** primaryContactId
- **Tracking:** closedAt, closedReason, convertedFromLeadId
- Indexes: accountId, ownerId, stage, status, country, city, tier, expectedCloseMonth, forecastedCloseDate

#### 11. **line_items**
- Individual products in an opportunity
- Linked to opportunities (cascade delete)
- Columns: productId, productName, quantity, unitPrice, discount, discountPercent
- Indexes: opportunityId

#### 12. **products**
- Product catalog
- Columns: name, description, categoryId, price
- Indexes: name, categoryId

#### 13. **product_categories**
- Product categorization
- Columns: name, description
- Indexes: name

#### 14. **countries**
- Country master data
- Columns: code (unique, 2-char), name, region
- Indexes: code, name

#### 15. **suppliers**
- Vendor/supplier master
- Columns: name, contactPerson, email, phoneNumber, address, city, country, remark
- Indexes: name

---

### Activity Tracking

#### 16. **sales_visits**
- Track sales visits to accounts
- Columns: accountId, visitDate, visitType, notes, outcome, nextFollowUp, createdBy
- Indexes: accountId, visitDate

#### 17. **expenses**
- Track business expenses
- Columns: description, amount, category, expenseDate, accountId, createdBy, status
- Indexes: accountId, expenseDate

#### 18. **tickets**
- Support/task tracking
- Columns: title, description, status, priority, accountId, assignedTo, createdBy, dueDate
- Indexes: accountId, status, assignedTo

---

### Contract & Project Management

#### 19. **contracts**
- Sales contracts
- Columns: contractNumber (unique), accountId, value, startDate, endDate, status, terms, createdBy
- Indexes: accountId, contractNumber, status

#### 20. **projects**
- Implementation projects
- Columns: name, description, accountId, status, startDate, endDate, budget, projectManager, createdBy
- Indexes: accountId, status

#### 21. **invoices**
- Billing invoices
- Columns: invoiceNumber (unique), accountId, amount, issueDate, dueDate, status, notes, createdBy
- Indexes: accountId, invoiceNumber, status

#### 22. **account_teams**
- Many-to-many: accounts to teams
- Allows team visibility over accounts
- Columns: accountId, teamId, timestamps
- Unique constraint: (accountId, teamId)
- Indexes: accountId, teamId

---

## Key Features

### Ownership & Assignment
- All major entities support: ownerId (primary owner) + assigneeIds[] (secondary owners)
- Enables delegation while maintaining accountability
- Admin-only permission to change owners

### Tiering System (NEW)
- Accounts, Leads, Opportunities all support tier field
- 5 tiers: T1-T5
- Tier imported from MIDT or set manually
- Auto-populated from account when creating leads/opportunities

### Hierarchical Teams
- Teams support parent-child relationships
- Supervisors oversee teams
- Members inherit visibility from team relationships
- Supports complex organizational structures

### Multi-tenancy Support
- Every entity has createdBy tracking
- Role-based access control (RBAC) with module:action:scope permissions
- Team-based visibility scoping

### Audit Trail
- All tables have createdAt, updatedAt timestamps
- createdBy field tracks who created records
- Supports compliance and audit requirements

---

## Indexes Summary

Total: 80+ indexes optimizing:
- ✅ Primary lookups (email, name, contractNumber)
- ✅ Foreign key relationships (ownerId, accountId, etc.)
- ✅ Filtering operations (status, stage, type, tier, country, city)
- ✅ Date-based queries (visitDate, expenseDate, forecastedCloseDate)
- ✅ Search/sorting (name, email)

---

## Performance Considerations

### Large Tables
- **accounts**: millions of rows - indexed on ownerId, country, tier, type
- **opportunities**: millions of rows - indexed on stage, status, forecastedCloseDate
- **leads**: millions of rows - indexed on status, tier

### Query Patterns
- List by status/stage - indexed
- Filter by owner - indexed
- Filter by country/region - indexed
- Filter by tier - indexed
- Filter by date range - indexed

### Suggested Vacuum Schedule
```sql
-- Weekly maintenance
VACUUM ANALYZE accounts;
VACUUM ANALYZE opportunities;
VACUUM ANALYZE leads;
```

---

## Backup Strategy

### Tables to Backup Daily
1. accounts (business-critical)
2. opportunities (revenue-critical)
3. leads (sales-critical)
4. users (access-critical)
5. roles, role_permissions (configuration-critical)

### Tables to Backup Weekly
- All others (activity/support tables)

---

## Migration Path

### From Legacy System
1. Run FULL_SCHEMA_CHECK.sql to create all tables
2. Run production_update_postgres.sql for incremental updates
3. Run data migration scripts (custom per legacy system)
4. Validate data integrity
5. Gradual cutover by entity type

---

## Testing the Schema

### Verify All Tables Exist
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### Verify Key Indexes
```sql
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' ORDER BY tablename;
```

### Count Rows by Table
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Support

For schema questions:
1. Check this reference document
2. Review migration files in `backend/migrations/`
3. Review model definitions in `backend/src/models/`
4. Check entity service files in `backend/src/services/`
