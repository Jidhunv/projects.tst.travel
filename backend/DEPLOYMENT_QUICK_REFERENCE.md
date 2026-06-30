# CRM Platform - Deployment Quick Reference

## ⚡ Quick Commands

### Local Development Setup
```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE crm_db;"
psql -U postgres -c "CREATE USER crm_user WITH ENCRYPTED PASSWORD 'password123';"
psql -U postgres -d crm_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;"

# 2. Apply schema
psql -U crm_user -d crm_db -f schema.sql

# 3. Verify
psql -U crm_user -d crm_db -c "SELECT name FROM roles;"
```

### Docker Deployment
```bash
# 1. Set environment
export DB_PASSWORD="your_secure_password"
export JWT_SECRET="your_jwt_secret_key"

# 2. Start
docker-compose up -d

# 3. Verify
docker-compose logs -f postgres
docker-compose logs -f backend
```

### Backup & Restore
```bash
# Backup
pg_dump -U crm_user crm_db > backup.sql

# Restore
psql -U crm_user crm_db < backup.sql

# Automated daily backup
0 2 * * * pg_dump -U crm_user crm_db > /backups/crm_$(date +\%Y\%m\%d).sql
```

---

## 📊 Database Schema Overview

| Table | Purpose | Rows (est.) |
|-------|---------|-------------|
| `users` | Authentication & team | 100 |
| `roles` | RBAC | 4 (Admin, Manager, Sales Rep, Deal Stage Manager) |
| `permissions` | Access control | 30+ |
| `role_permissions` | Role-permission mapping | 100+ |
| `leads` | Sales leads | 10,000+ |
| `accounts` | Customer accounts | 1,000+ |
| `contacts` | People at accounts | 5,000+ |
| `opportunities` | Deal pipeline | 5,000+ |
| `line_items` | Products in deals | 10,000+ |
| `tickets` | Support tickets | 5,000+ |
| `contracts` | Legal agreements | 2,000+ |
| `activities` | Audit trail | 100,000+ |
| `notes` | Internal notes | 50,000+ |
| `audit_logs` | System audit log | 1,000,000+ |
| `email_settings` | SMTP config | 1 |
| `tags` | Metadata tags | 100+ |
| `entity_tags` | Tag assignments | 10,000+ |

---

## 🔑 Key Tables & Relationships

### Authentication Flow
```
users → roles → role_permissions → permissions
        ↓
     (email, password, isActive)
```

### Sales Pipeline
```
leads → accounts ← contacts
         ↓          ↓
    opportunities ← (primaryContactId)
         ↓
    line_items → products
```

### Support
```
tickets ← accounts
         ↓
      contracts
```

### Audit Trail
```
activities ← users (createdBy)
audit_logs ← (tracks all changes)
notes ← (internal comments)
```

---

## 📋 Default Roles & Permissions

### Admin
- Full system access
- Can manage users, roles, permissions
- Can access email settings
- Can view all data

### Manager
- Manage team and reports
- Create/read/update leads, accounts, opportunities
- View reports and exports

### Sales Rep
- Manage own leads and opportunities
- Create/read/update own records
- View personal pipeline and forecast

### Deal Stage Manager
- Update opportunity stages only
- Read-only access to other modules

---

## 🔐 Security Checklist

- [ ] Change default JWT_SECRET to random 32+ char string
- [ ] Change all database passwords
- [ ] Enable SSL/TLS for connections
- [ ] Setup automated backups (daily)
- [ ] Configure email credentials securely
- [ ] Enable audit logging
- [ ] Restrict database user permissions
- [ ] Use environment variables for secrets
- [ ] Enable PostgreSQL connection logging
- [ ] Setup monitoring & alerts

---

## 📈 Performance Checklist

- [ ] Indexes created on frequently queried columns
- [ ] Vacuum & analyze scheduled (weekly)
- [ ] Query logs enabled for > 1 second queries
- [ ] Database connection pooling configured
- [ ] Backup size monitored
- [ ] Slow query optimization completed
- [ ] Cache strategy implemented
- [ ] Monitoring dashboard setup

---

## 🚨 Common Issues & Solutions

### "cannot connect to database"
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Check connection
psql -U crm_user -h localhost -d crm_db

# Check password
sudo -u postgres psql -d crm_db -c "ALTER USER crm_user PASSWORD 'newpassword';"
```

### "permission denied"
```sql
-- Fix permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
```

### "disk space full"
```bash
# Check size
du -sh /var/lib/postgresql/

# Cleanup old backups
find /backups -name "*.sql" -mtime +30 -delete

# Vacuum database
psql -U crm_user -d crm_db -c "VACUUM ANALYZE;"
```

### "slow queries"
```sql
-- Check slow queries
SELECT query, calls, mean_time FROM pg_stat_statements 
WHERE mean_time > 100 ORDER BY mean_time DESC;

-- Add index
CREATE INDEX idx_table_column ON table(column);

-- Analyze
ANALYZE table;
```

---

## 📞 Support Resources

### Useful Commands
```bash
# Connect to database
psql -U crm_user -h localhost -d crm_db

# List tables
\dt

# View table structure
\d users

# List indexes
\di

# Check database size
SELECT pg_size_pretty(pg_database_size('crm_db'));

# Exit
\q
```

### Documentation Links
- Schema Details: `DATABASE_SETUP.md`
- Backend Setup: `backend/README.md`
- Frontend Setup: `frontend/README.md`
- API Docs: `backend/API.md`

---

## 🔄 Migration Checklist

For moving to new server:

1. [ ] Backup existing database
   ```bash
   pg_dump -U crm_user crm_db > backup.sql
   ```

2. [ ] Setup new PostgreSQL server
3. [ ] Create user and database
4. [ ] Apply schema
   ```bash
   psql -U crm_user -d crm_db -f schema.sql
   ```

5. [ ] Import data (if compatible)
   ```bash
   psql -U crm_user -d crm_db < backup.sql
   ```

6. [ ] Update backend .env with new connection string
7. [ ] Test connections
8. [ ] Setup backup schedule
9. [ ] Monitor for 24 hours

---

## 📅 Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Database Backup | Daily | `pg_dump` |
| Vacuum & Analyze | Weekly | `VACUUM ANALYZE;` |
| Check Disk Space | Daily | `du -sh` |
| Review Slow Queries | Weekly | `pg_stat_statements` |
| Update Statistics | Monthly | `ANALYZE;` |
| Security Audit | Monthly | Review logs |
| Major Backup | Monthly | Full compressed dump |

---

## 📊 Monitoring Queries

### Database Health
```sql
SELECT 
  datname, 
  numbackends as connections,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_stat_database 
WHERE datname = 'crm_db';
```

### Table Sizes
```sql
SELECT 
  tablename, 
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

### Connections
```sql
SELECT 
  usename, 
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity 
WHERE datname = 'crm_db';
```

---

**Last Updated:** 2026-06-30  
**Version:** 1.0  
**Status:** Production Ready ✅
