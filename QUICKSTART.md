# CRM System - Quick Start Guide

This guide will help you get the CRM system up and running in just a few minutes.

## Prerequisites

- **Node.js 16+** - Download from https://nodejs.org/
- **Docker & Docker Compose** - Download from https://www.docker.com/products/docker-desktop/
- **Git** - Already initialized in this project

## Setup (5 minutes)

### Step 1: Setup PostgreSQL Database

#### Option A: Local PostgreSQL Installation (Windows)

1. **Download PostgreSQL** from https://www.postgresql.org/download/windows/
2. **Run installer** and complete setup
3. **Remember your password** for the postgres user
4. **PostgreSQL runs on** `localhost:5432`

#### Option B: PostgreSQL on Windows (via Chocolatey)
```bash
choco install postgresql13
```

#### Option C: Cloud Database
Use PostgreSQL on AWS RDS, Azure Database, or Heroku (update .env with connection string)

### Step 2: Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Seed demo data (creates admin user and roles)
npm run seed

# Start development server
npm run dev
```

Backend runs on **http://localhost:3001**

### Step 3: Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs on **http://localhost:3000** (opens automatically)

## Demo Login

**Admin Account:**
- Email: `admin@tst.travel`
- Password: `admin123`

**Sales Rep Account:**
- Email: `sales@tst.travel`
- Password: `sales123`

## What's Included (MVP)

### ✅ Lead Management
- Create, view, edit, delete leads
- Lead qualification workflow
- Convert leads to accounts
- Lead scoring and tracking

### ✅ Account Management
- Manage customer/prospect accounts
- Add and manage contacts per account
- Track account relationships
- Account activity timeline

### ✅ Opportunity Management
- Sales pipeline tracking
- Create and manage opportunities
- Add products/services with pricing
- Opportunity stages (Prospecting → Closed)
- Deal close tracking

### ✅ Dashboard
- Key metrics and KPIs
- Pipeline summary
- Recent activities
- Sales statistics

### ✅ Security & Access Control
- JWT authentication
- Role-based access control
- Admin, Manager, Sales Rep roles
- Activity logging

## Project Structure

```
crm-platform/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── models/       # Database entities
│   │   ├── services/     # Business logic
│   │   ├── controllers/  # API handlers
│   │   └── routes/       # API endpoints
│   └── package.json
├── frontend/             # React + TypeScript UI
│   ├── src/
│   │   ├── pages/        # Main pages (Login, Dashboard, etc.)
│   │   ├── components/   # Reusable components
│   │   └── services/     # API client
│   └── package.json
└── docker-compose.yml    # Database setup
```

## API Endpoints (MVP)

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/password-reset
```

### Leads
```
GET    /api/leads                      # List leads
POST   /api/leads                      # Create lead
GET    /api/leads/:id                  # Get lead
PATCH  /api/leads/:id                  # Update lead
DELETE /api/leads/:id                  # Delete lead
PATCH  /api/leads/:id/status           # Update status
POST   /api/leads/:id/convert-to-account  # Convert to account
```

### Accounts
```
GET    /api/accounts                   # List accounts
POST   /api/accounts                   # Create account
GET    /api/accounts/:id               # Get account
PATCH  /api/accounts/:id               # Update account
DELETE /api/accounts/:id               # Delete account
POST   /api/accounts/:id/contacts      # Add contact
GET    /api/accounts/:id/contacts      # List contacts
```

### Opportunities
```
GET    /api/opportunities              # List opportunities
POST   /api/opportunities              # Create opportunity
GET    /api/opportunities/:id          # Get opportunity
PATCH  /api/opportunities/:id          # Update opportunity
PATCH  /api/opportunities/:id/stage    # Move stage
POST   /api/opportunities/:id/close    # Close deal
POST   /api/opportunities/:id/line-items  # Add product
GET    /api/pipeline/view              # Pipeline kanban data
GET    /api/pipeline/forecast          # Revenue forecast
```

## Common Tasks

### View Database (pgAdmin - Optional)
```bash
# Install pgAdmin locally or use web version
# Then connect to: localhost:5432
# Username: postgres
# Password: (your postgres password)
```

### View API Documentation
```bash
# Health check
curl http://localhost:3001/api/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tst.travel","password":"admin123"}'
```

### Reset Database
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS crm_db;"
psql -U postgres -c "CREATE DATABASE crm_db;"

# Re-run migrations and seed
cd backend
npm run migration:run
npm run seed
```

### View Logs

**Backend logs:**
```bash
cd backend
npm run dev
```

**Frontend logs:**
```bash
cd frontend
npm start
```

**Database logs:**
```bash
docker-compose logs postgres
```

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
# Windows: Check Services (search "Services" in Start menu)
# Mac: brew services list
# Linux: systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d crm_db

# If database doesn't exist, create it
createdb -U postgres crm_db
```

### Dependencies Not Installing
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock files
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

## Next Steps (Phase 2+)

- [ ] Contracts management
- [ ] Billing and invoicing
- [ ] Client onboarding workflows
- [ ] Email integration
- [ ] Jira integration
- [ ] Advanced reporting and analytics
- [ ] Customer success module
- [ ] Mobile app
- [ ] API key authentication
- [ ] Webhook support

## Support

For issues or feature requests, open a GitHub issue with:
- Steps to reproduce
- Error messages
- System info (OS, Node version, etc.)

## Development Tips

### Hot Reload
- Backend: Changes auto-reload with `npm run dev`
- Frontend: Changes auto-refresh in browser

### Debug Mode
```bash
# Backend
DEBUG=* npm run dev

# Frontend (React DevTools Chrome extension recommended)
npm start
```

### Code Style
```bash
# Format code
npm run format

# Lint check
npm run lint

# Fix linting issues
npm run lint --fix
```

---

**Happy CRM-ing! 🚀**

For full documentation, see [README.md](./README.md)
