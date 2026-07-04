# CRM System - PowerShell Guide for Windows

Complete guide to using PowerShell scripts for the CRM system setup and management.

## Quick Start

### 1. Check Prerequisites
```powershell
# Open PowerShell as Administrator
node --version
psql --version
```

### 2. Install PostgreSQL (if needed)
```powershell
.\install-postgresql.ps1
```

### 3. Run Complete Setup
```powershell
.\setup.ps1
```
This will:
- ✓ Check Node.js and PostgreSQL
- ✓ Install backend dependencies
- ✓ Install frontend dependencies
- ✓ Create the CRM database
- ✓ Run migrations
- ✓ Seed demo data

### 4. Start Development
```powershell
.\start-dev.ps1
```
Opens backend and frontend in separate terminals.

---

## Available Scripts

### `setup.ps1` - Complete Setup
**Purpose:** Initialize the CRM system for first-time use

**Usage:**
```powershell
.\setup.ps1
```

**What it does:**
1. Checks Node.js installation
2. Checks PostgreSQL installation
3. Creates `.env` file from template
4. Installs backend dependencies (`npm install`)
5. Installs frontend dependencies (`npm install`)
6. Creates `crm_db` database
7. Runs database migrations
8. Seeds demo data (admin user, roles, permissions)

**Requirements:**
- Node.js 16+
- PostgreSQL running on localhost:5432
- Run as Administrator

**First-time setup:**
```powershell
# 1. Right-click PowerShell → Run as Administrator
# 2. Navigate to project root: cd D:\CRM
# 3. Run setup
.\setup.ps1
```

---

### `start-dev.ps1` - Start Development Servers
**Purpose:** Launch backend and frontend in separate terminal windows

**Usage:**
```powershell
.\start-dev.ps1
```

**What it does:**
1. Opens new PowerShell window for backend
2. Starts `npm run dev` (backend server on port 3001)
3. Opens new PowerShell window for frontend
4. Starts `npm start` (frontend on port 3000)

**URLs:**
- Frontend: http://localhost:3000 (opens automatically)
- Backend: http://localhost:3001
- API: http://localhost:3001/api/health

**Stopping servers:**
- Close the terminal windows or press `Ctrl+C`

---

### `manage-db.ps1` - Database Management
**Purpose:** Perform database operations (create, drop, reset, backup, restore, etc.)

**Usage:**
```powershell
.\manage-db.ps1 -Action <action> [-BackupFile <filename>]
```

**Available Actions:**

#### `create` - Create Empty Database
```powershell
.\manage-db.ps1 -Action create
```
Creates `crm_db` (skips if exists)

#### `drop` - Delete Database
```powershell
.\manage-db.ps1 -Action drop
```
Deletes entire `crm_db` (prompts for confirmation)

#### `reset` - Drop, Create, Migrate, and Seed
```powershell
.\manage-db.ps1 -Action reset
```
Complete reset to fresh state:
1. Drops existing database
2. Creates new database
3. Runs all migrations
4. Seeds demo data

**⚠️ Warning:** This will delete all data!

#### `seed` - Run Seed Script
```powershell
.\manage-db.ps1 -Action seed
```
Populates database with:
- Admin user (admin@tst.travel / admin123)
- Sales Rep user (sales@tst.travel / sales123)
- All roles (Admin, Manager, Sales Rep)
- All permissions

#### `backup` - Create Database Backup
```powershell
.\manage-db.ps1 -Action backup
.\manage-db.ps1 -Action backup -BackupFile "crm_db_2024_01_15.sql"
```
Exports database to SQL file.

**Default:** `crm_db_backup.sql` in current directory

#### `restore` - Restore from Backup
```powershell
.\manage-db.ps1 -Action restore
.\manage-db.ps1 -Action restore -BackupFile "crm_db_2024_01_15.sql"
```
Restores database from backup file.

#### `status` - Check Database Status
```powershell
.\manage-db.ps1 -Action status
```
Shows:
- Database exists and size
- Active connections
- Creation time

---

### `install-postgresql.ps1` - PostgreSQL Setup Helper
**Purpose:** Help install and configure PostgreSQL on Windows

**Usage:**
```powershell
.\install-postgresql.ps1
```

**What it does:**
1. Checks if PostgreSQL is already installed
2. If found, confirms version and exits
3. If not found, shows installation options:
   - Direct download link
   - Chocolatey command
   - WSL option
4. Offers to open PostgreSQL download page

**Installation Steps (if needed):**
1. Download PostgreSQL 15+ from https://www.postgresql.org/download/windows/
2. Run installer
3. Set password to `postgres` (or remember your password)
4. Keep port 5432
5. Complete installation
6. Restart PowerShell
7. Run `.\setup.ps1`

---

## Common Workflows

### First-Time Setup
```powershell
# 1. Check prerequisites
node --version
psql --version

# 2. Install PostgreSQL if needed
.\install-postgresql.ps1

# 3. Complete setup
.\setup.ps1

# 4. Start development
.\start-dev.ps1
```

### Reset Database (Keep Code)
```powershell
.\manage-db.ps1 -Action reset
```

### Daily Development
```powershell
# Terminal 1: Start servers
.\start-dev.ps1

# Terminal 2 (optional): Manage database
.\manage-db.ps1 -Action status
```

### Backup Before Major Changes
```powershell
.\manage-db.ps1 -Action backup -BackupFile "crm_db_before_update.sql"
```

### Restore from Backup
```powershell
.\manage-db.ps1 -Action restore -BackupFile "crm_db_before_update.sql"
```

### Full Reset (Emergency)
```powershell
.\manage-db.ps1 -Action reset
.\start-dev.ps1
```

---

## Troubleshooting

### PowerShell Execution Policy Error
**Error:** "cannot be loaded because running scripts is disabled on this system"

**Solution:**
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### PostgreSQL Not Found
**Error:** "PostgreSQL not found or not in PATH"

**Solutions:**
1. Install PostgreSQL: `.\install-postgresql.ps1`
2. Add to PATH manually:
   - Find PostgreSQL bin: Usually `C:\Program Files\PostgreSQL\15\bin`
   - Settings → System → Environment Variables → Edit PATH
   - Add PostgreSQL bin directory
   - Restart PowerShell

### Database Connection Refused
**Error:** "psql: error: could not connect to server"

**Solutions:**
1. Check PostgreSQL is running:
   - Windows Services: Search "Services" → Find "postgresql-x64"
   - Should show "Running"
2. Start PostgreSQL:
   ```powershell
   # Right-click Services → Find postgres → Start
   ```
3. Check port:
   ```powershell
   netstat -ano | findstr :5432
   ```

### "Database already exists" Error
**During setup:**
```powershell
# Reset the database
.\manage-db.ps1 -Action reset
```

### Node Modules Issues
**Error:** Dependencies not found

**Solution:**
```powershell
# Clear cache and reinstall
cd backend
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

### Port Already in Use
**Error:** "EADDRINUSE :::3000" or ":::3001"

**Solution:**
```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

---

## Environment Variables

The `.env` file in `backend/` controls configuration:

```env
DB_HOST=localhost           # PostgreSQL host
DB_PORT=5432               # PostgreSQL port
DB_USERNAME=postgres       # PostgreSQL user
DB_PASSWORD=your_password  # Your PostgreSQL password
DB_NAME=crm_db            # Database name
PORT=3001                 # Backend API port
NODE_ENV=development      # Environment
JWT_SECRET=your-secret    # JWT signing key
JWT_EXPIRATION=7d         # Token expiration
CORS_ORIGIN=http://localhost:3000  # Frontend URL
```

**Changing settings:**
1. Edit `backend\.env`
2. Restart backend: `npm run dev`

---

## Tips & Tricks

### Faster Development
```powershell
# Terminal stays open after server crashes
.\start-dev.ps1
# Can easily restart by pressing up arrow and Enter
```

### Check Server Health
```powershell
# Test backend
curl http://localhost:3001/api/health

# Or open in browser
start http://localhost:3001/api/health
```

### Inspect Database
```powershell
# Connect directly to database
psql -U postgres -d crm_db

# Common SQL commands:
# \dt              - list tables
# SELECT * FROM users;  - view users
# \q              - quit
```

### View Logs
```powershell
# Backend logs show in terminal window
# Frontend logs show in terminal window
# Both auto-refresh on file changes
```

### Kill Stuck Processes
```powershell
# Kill all node processes
taskkill /IM node.exe /F

# Kill process using specific port
lsof -i :3000
kill -9 <PID>
```

---

## Support

- PostgreSQL Help: https://www.postgresql.org/docs/
- Node.js Help: https://nodejs.org/docs/
- CRM Documentation: See README.md and QUICKSTART.md

---

**Last Updated:** 2024
**CRM Version:** 1.0.0 MVP
