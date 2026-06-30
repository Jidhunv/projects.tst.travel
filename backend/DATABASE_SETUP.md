# CRM Platform - Database Setup Guide

## Overview

This guide provides complete instructions for setting up the CRM platform database in production and development environments.

---

## Prerequisites

- PostgreSQL 12+ installed
- `psql` CLI tool available
- Superuser or admin access to PostgreSQL server
- Database name: `crm_db` (configurable)
- Database user: `crm_user` (configurable)

---

## Quick Start (Recommended)

### 1. Create Database & User

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database
CREATE DATABASE crm_db ENCODING 'UTF8' LOCALE 'en_US.UTF-8';

# Create user with password
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT CONNECT ON DATABASE crm_db TO crm_user;
GRANT CREATE ON DATABASE crm_db TO crm_user;

# Connect to database and grant schema privileges
\c crm_db
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;

\q
```

### 2. Apply Schema

```bash
# From the backend directory
psql -U crm_user -d crm_db -h localhost -f schema.sql

# Or provide password when prompted
# Password: your_secure_password_here
```

### 3. Verify Installation

```bash
# Connect to database
psql -U crm_user -d crm_db -h localhost

# Check tables
\dt

# Check roles (should show: Admin, Manager, Sales Rep, Deal Stage Manager)
SELECT name, isActive FROM roles;

# Check permissions
SELECT module, action, COUNT(*) FROM permissions GROUP BY module, action;

# Exit
\q
```

---

## Docker Setup (Production)

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: crm_postgres
    environment:
      POSTGRES_DB: crm_db
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-your_secure_password}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./init-data.sql:/docker-entrypoint-initdb.d/02-init-data.sql
    
    ports:
      - "5432:5432"
    
    networks:
      - crm_network
    
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user -d crm_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: crm_backend
    environment:
      DATABASE_URL: postgresql://crm_user:${DB_PASSWORD:-your_secure_password}@postgres:5432/crm_db
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET:-your_jwt_secret_key}
      PORT: 3001
    
    ports:
      - "3001:3001"
    
    depends_on:
      postgres:
        condition: service_healthy
    
    networks:
      - crm_network

volumes:
  postgres_data:

networks:
  crm_network:
    driver: bridge
```

### Deploy with Docker Compose

```bash
# Set environment variables
export DB_PASSWORD="your_secure_password"
export JWT_SECRET="your_jwt_secret_key"

# Start services
docker-compose up -d

# Verify
docker-compose logs postgres
docker-compose logs backend

# Stop services
docker-compose down

# Remove data (WARNING: irreversible)
docker-compose down -v
```

---

## Environment Configuration

### .env File (Backend)

```env
# Database
DATABASE_URL=postgresql://crm_user:your_password@localhost:5432/crm_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_db
DB_USER=crm_user
DB_PASSWORD=your_password

# Server
NODE_ENV=production
PORT=3001

# JWT
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_min_32_chars
JWT_EXPIRATION=3600

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@crm.local
SMTP_FROM_NAME=CRM System
ENABLE_EMAIL_NOTIFICATIONS=true

# Frontend
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

---

## Backup & Restore

### Backup Database

```bash
# Full backup
pg_dump -U crm_user -h localhost crm_db > crm_db_backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U crm_user -h localhost -F c crm_db > crm_db_backup_$(date +%Y%m%d_%H%M%S).dump

# Backup specific table
pg_dump -U crm_user -h localhost -t users crm_db > users_backup.sql
```

### Restore Database

```bash
# From SQL file
psql -U crm_user -h localhost crm_db < crm_db_backup.sql

# From compressed dump
pg_restore -U crm_user -h localhost -d crm_db crm_db_backup.dump

# Drop and recreate (careful!)
dropdb -U crm_user -h localhost crm_db
createdb -U crm_user -h localhost crm_db
psql -U crm_user -h localhost crm_db < crm_db_backup.sql
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/crm"
DB_USER="crm_user"
DB_NAME="crm_db"
DB_HOST="localhost"
RETENTION_DAYS=30

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U $DB_USER -h $DB_HOST -F c $DB_NAME > "$BACKUP_DIR/crm_db_$TIMESTAMP.dump"

# Compress
gzip "$BACKUP_DIR/crm_db_$TIMESTAMP.dump"

# Remove old backups
find $BACKUP_DIR -name "crm_db_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: crm_db_$TIMESTAMP.dump.gz"
```

### Schedule with Cron

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh

# Weekly backup every Sunday at 3 AM
0 3 * * 0 /path/to/backup.sh
```

---

## Database Maintenance

### Vacuum & Analyze

```bash
# Vacuum (removes dead rows)
psql -U crm_user -d crm_db -c "VACUUM ANALYZE;"

# Vacuum specific table
psql -U crm_user -d crm_db -c "VACUUM ANALYZE users;"

# In psql interactive mode
\c crm_db
VACUUM ANALYZE;
```

### Monitor Database Size

```bash
psql -U crm_user -d crm_db << EOF
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

### Check Table Sizes

```bash
psql -U crm_user -d crm_db -c "
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size,
  (SELECT count(*) FROM public.$tablename) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;"
```

---

## Performance Tuning

### PostgreSQL Configuration (postgresql.conf)

```ini
# Connection settings
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB

# WAL settings
wal_level = minimal
checkpoint_completion_target = 0.9

# Query optimization
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log queries > 1 second
log_statement = 'all'
log_duration = on
```

### Create Essential Indexes (included in schema.sql)

```sql
-- Example indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_leads_ownerId ON leads(ownerId);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt);
```

---

## Security

### Database User Privileges

```sql
-- Restrict crm_user to schema only
REVOKE ALL PRIVILEGES ON DATABASE crm_db FROM crm_user;
GRANT CONNECT ON DATABASE crm_db TO crm_user;
GRANT USAGE ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;

-- Create read-only user (for backups/reports)
CREATE USER crm_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE crm_db TO crm_readonly;
GRANT USAGE ON SCHEMA public TO crm_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO crm_readonly;

-- Create app_user with limited privileges
CREATE USER crm_app WITH ENCRYPTED PASSWORD 'app_password';
GRANT CONNECT ON DATABASE crm_db TO crm_app;
GRANT USAGE ON SCHEMA public TO crm_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO crm_app;
```

### Enable SSL Connections

```bash
# Generate certificates
openssl req -new -x509 -days 365 -nodes -out server.crt -keyout server.key

# Move to PostgreSQL config directory
sudo mv server.* /etc/postgresql/

# Update postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Connection String Security

```env
# Development
DATABASE_URL=postgresql://crm_user:password@localhost:5432/crm_db

# Production (SSL)
DATABASE_URL=postgresql://crm_user:password@db.example.com:5432/crm_db?ssl=require

# Production (with certificate verification)
DATABASE_URL=postgresql://crm_user:password@db.example.com:5432/crm_db?ssl=require&sslmode=verify-full&sslrootcert=/path/to/ca-cert.pem
```

---

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql -U crm_user -h localhost -d crm_db -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Permissions Errors

```sql
-- Check user permissions
\du+ crm_user

-- Grant all permissions
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;
```

### Slow Queries

```sql
-- Enable query logging
ALTER DATABASE crm_db SET log_min_duration_statement = 1000;

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM opportunities WHERE stage = 'Proposal';
```

### Reset Database

```bash
# WARNING: This will delete all data!

psql -U postgres << EOF
DROP DATABASE IF EXISTS crm_db;
DROP USER IF EXISTS crm_user;

CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
CREATE DATABASE crm_db OWNER crm_user ENCODING 'UTF8';

\c crm_db
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
EOF

# Reapply schema
psql -U crm_user -d crm_db -f schema.sql
```

---

## Migration Path (From Existing Database)

### 1. Export existing data
```bash
pg_dump -U old_user -h old_host old_db > existing_data.sql
```

### 2. Create new database with schema
```bash
# Follow "Quick Start" section above
```

### 3. Import data (if compatible)
```bash
# Extract data portion only (skip schema)
grep "^INSERT INTO" existing_data.sql > data_only.sql

# Apply with caution
psql -U crm_user -d crm_db < data_only.sql
```

### 4. Verify data
```bash
# Count records
psql -U crm_user -d crm_db << EOF
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'opportunities', COUNT(*) FROM opportunities;
EOF
```

---

## Monitoring & Alerts

### Database Health Check Script

```bash
#!/bin/bash
# health_check.sh

DB_USER="crm_user"
DB_NAME="crm_db"
DB_HOST="localhost"

# Check connection
if ! psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
  echo "CRITICAL: Cannot connect to database"
  exit 2
fi

# Check disk space
DISK_USAGE=$(psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "
  SELECT (pg_database_size('$DB_NAME') / 1024 / 1024 / 1024)::numeric(10, 2);
")

if (( $(echo "$DISK_USAGE > 50" | bc -l) )); then
  echo "WARNING: Database using ${DISK_USAGE}GB"
fi

# Check table sizes
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "
  SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename))
  FROM pg_tables WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size('public.' || tablename) DESC LIMIT 5;"

echo "OK: Database health check passed"
```

---

## Support & Documentation

- PostgreSQL Docs: https://www.postgresql.org/docs/
- TypeORM Docs: https://typeorm.io/
- Database Backup Best Practices: https://wiki.postgresql.org/wiki/Backup_and_Restore

---

## Version History

- **v1.0** (2026-06-30): Initial schema with 22 tables, 3 views, comprehensive indexes
- Default roles: Admin, Manager, Sales Rep, Deal Stage Manager
- Default permissions: 30+ module:action pairs

---

**Last Updated:** 2026-06-30
**Schema Version:** 1.0
