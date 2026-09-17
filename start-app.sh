#!/bin/bash
# ============================================================================
# START BOTH BACKEND AND FRONTEND
# ============================================================================
# Bash script to start CRM application
# Backend runs on http://localhost:3001
# Frontend runs on http://localhost:3000

echo ""
echo "========================================================================"
echo "Starting CRM Application (Backend + Frontend)"
echo "========================================================================"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Backend in background
echo "Starting Backend (Port 3001)..."
cd "$SCRIPT_DIR/backend"
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start Frontend in new terminal (if running on desktop environment)
echo "Starting Frontend (Port 3000)..."
cd "$SCRIPT_DIR/frontend"

# Check if we're in a terminal that supports opening new windows
if command -v gnome-terminal &> /dev/null; then
    # GNOME Terminal
    gnome-terminal -- npm run dev &
elif command -v xterm &> /dev/null; then
    # Xterm
    xterm -e npm run dev &
else
    # Fallback: run in foreground
    npm run dev
fi

echo ""
echo "========================================================================"
echo "✓ Both servers starting..."
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Backend running in background (PID: $BACKEND_PID)"
echo "Press Ctrl+C to stop"
echo "========================================================================"
echo ""

# Wait for user to stop
wait
