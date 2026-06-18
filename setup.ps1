# CRM System - Windows Setup Script
# Run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CRM System - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($?) {
    Write-Host "Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgVersion = psql --version 2>$null
if ($?) {
    Write-Host "PostgreSQL found: $pgVersion" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL not found or not in PATH" -ForegroundColor Red
    Write-Host "Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Setup Backend
Write-Host ""
Write-Host "Setting up Backend..." -ForegroundColor Yellow
Push-Location backend

if (Test-Path .env) {
    Write-Host ".env file exists" -ForegroundColor Green
} else {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host ".env created. Please edit with your PostgreSQL password:" -ForegroundColor Green
    Write-Host "Open backend\.env and update DB_PASSWORD" -ForegroundColor Yellow
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
npm install
if ($?) {
    Write-Host "Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Backend installation failed" -ForegroundColor Red
    exit 1
}

Pop-Location

# Setup Frontend
Write-Host ""
Write-Host "Setting up Frontend..." -ForegroundColor Yellow
Push-Location frontend

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install
if ($?) {
    Write-Host "Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Frontend installation failed" -ForegroundColor Red
    exit 1
}

Pop-Location

# Database setup
Write-Host ""
Write-Host "Setting up Database..." -ForegroundColor Yellow
Write-Host "Enter your PostgreSQL password (default: postgres):" -ForegroundColor Cyan
$postgresPassword = Read-Host -AsSecureString
$postgresPlainPassword = [System.Net.NetworkCredential]::new("", $postgresPassword).Password

# Set environment variable for psql
$env:PGPASSWORD = $postgresPlainPassword

Write-Host "Creating crm_db database..." -ForegroundColor Cyan
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS crm_db;" 2>$null
psql -U postgres -h localhost -c "CREATE DATABASE crm_db;"

if ($?) {
    Write-Host "Database created" -ForegroundColor Green
}

# Update backend .env with password
Write-Host "Updating .env with PostgreSQL password..." -ForegroundColor Cyan
$envFile = "backend\.env"
$envContent = Get-Content $envFile
$envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$postgresPlainPassword"
Set-Content $envFile $envContent
Write-Host ".env updated" -ForegroundColor Green

# Run migrations and seed
Write-Host ""
Write-Host "Running migrations and seeding database..." -ForegroundColor Cyan
Push-Location backend
npm run migration:run
npm run seed
Pop-Location

if ($?) {
    Write-Host "Database initialized" -ForegroundColor Green
} else {
    Write-Host "Database initialization failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open terminal 1: npm run dev     (from backend/)" -ForegroundColor White
Write-Host "2. Open terminal 2: npm start       (from frontend/)" -ForegroundColor White
Write-Host ""
Write-Host "Or use: .\start-dev.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "Login at http://localhost:3000" -ForegroundColor Yellow
Write-Host "Email: admin@crm.local" -ForegroundColor Yellow
Write-Host "Password: admin123" -ForegroundColor Yellow
Write-Host ""
