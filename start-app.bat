@echo off
REM ============================================================================
REM START BOTH BACKEND AND FRONTEND
REM ============================================================================
REM Batch script to start CRM application
REM Backend runs on http://localhost:3001
REM Frontend runs on http://localhost:3000

echo.
echo ========================================================================
echo Starting CRM Application (Backend + Frontend)
echo ========================================================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

REM Start Backend in new window
echo Starting Backend (Port 3001)...
start "CRM Backend" cmd /k "cd backend && npm run dev"

REM Wait a bit for backend to start
timeout /t 3 /nobreak

REM Start Frontend in new window
echo Starting Frontend (Port 3000)...
start "CRM Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================================
echo ^✓ Both servers starting in separate windows...
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop
echo ========================================================================
echo.
