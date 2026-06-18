# CRM System - Start Development Servers
# Opens backend and frontend in separate terminals

Write-Host "Starting CRM Development Servers..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location

# Start Backend
Write-Host "Starting Backend (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; npm run dev"
Start-Sleep -Seconds 1

# Start Frontend
Write-Host "Starting Frontend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm start"

Write-Host ""
Write-Host "Both servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend will open automatically in your browser." -ForegroundColor Yellow
