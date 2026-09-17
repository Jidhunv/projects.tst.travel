# ============================================================================
# START BOTH BACKEND AND FRONTEND
# ============================================================================
# PowerShell script to start CRM application
# Backend runs on http://localhost:3001
# Frontend runs on http://localhost:3000

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Starting CRM Application (Backend + Frontend)" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend in new PowerShell window
Write-Host "Starting Backend (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$scriptDir\backend'; npm run dev`"" -WindowStyle Normal

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend in new PowerShell window
Write-Host "Starting Frontend (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$scriptDir\frontend'; npm run dev`"" -WindowStyle Normal

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "✅ Both servers starting in separate windows..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
