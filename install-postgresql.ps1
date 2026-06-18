# CRM System - PostgreSQL Installation Helper for Windows
# This script helps set up PostgreSQL on Windows

Write-Host "CRM System - PostgreSQL Setup Helper" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is already installed
Write-Host "Checking for existing PostgreSQL installation..." -ForegroundColor Yellow
$pgInstalled = $false

try {
    $pgVersion = psql --version 2>$null
    if ($?) {
        Write-Host "✓ PostgreSQL already installed: $pgVersion" -ForegroundColor Green
        $pgInstalled = $true
    }
} catch {
    Write-Host "PostgreSQL not found in PATH" -ForegroundColor Yellow
}

if ($pgInstalled) {
    Write-Host ""
    Write-Host "You already have PostgreSQL installed." -ForegroundColor Green
    Write-Host "Run .\setup.ps1 to continue with CRM setup." -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "PostgreSQL is not installed or not in PATH." -ForegroundColor Yellow
Write-Host ""
Write-Host "Installation Options:" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Download PostgreSQL Installer" -ForegroundColor White
Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Installation Steps:" -ForegroundColor Yellow
Write-Host "   • Download PostgreSQL 15 or later" -ForegroundColor White
Write-Host "   • Run installer as Administrator" -ForegroundColor White
Write-Host "   • When asked for password, use: postgres" -ForegroundColor White
Write-Host "   • Keep port as 5432" -ForegroundColor White
Write-Host "   • Complete the installation" -ForegroundColor White
Write-Host ""

Write-Host "2. Using Chocolatey (if installed)" -ForegroundColor White
Write-Host "   Run this command in PowerShell (as Admin):" -ForegroundColor Yellow
Write-Host "   choco install postgresql13" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Using Windows Subsystem for Linux (WSL)" -ForegroundColor White
Write-Host "   wsl -e sudo apt-get install postgresql" -ForegroundColor Cyan
Write-Host ""

Write-Host "After installation:" -ForegroundColor Green
Write-Host "1. Restart PowerShell" -ForegroundColor White
Write-Host "2. Verify installation: psql --version" -ForegroundColor White
Write-Host "3. Run .\setup.ps1" -ForegroundColor White
Write-Host ""

Write-Host "Path Addition:" -ForegroundColor Yellow
Write-Host "If PostgreSQL is installed but not in PATH:" -ForegroundColor White
Write-Host "1. Find PostgreSQL bin directory (usually C:\Program Files\PostgreSQL\15\bin)" -ForegroundColor White
Write-Host "2. Add to System Environment Variables PATH" -ForegroundColor White
Write-Host "3. Restart PowerShell" -ForegroundColor White
Write-Host ""

# Offer to open PostgreSQL download page
$openDownload = Read-Host "Open PostgreSQL download page? (y/n)"
if ($openDownload -eq "y") {
    Start-Process "https://www.postgresql.org/download/windows/"
    Write-Host "Opening download page in browser..." -ForegroundColor Cyan
}
