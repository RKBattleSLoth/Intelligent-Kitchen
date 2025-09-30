#!/bin/bash

# Intelligent Kitchen Development Server Stop Script

echo "🛑 Stopping Intelligent Kitchen Development Servers"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill process safely
kill_process() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${RED}Force killing $name...${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ $name stopped${NC}"
    else
        echo -e "${YELLOW}$name was not running${NC}"
    fi
}

# Kill processes using saved PIDs
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill_process "$BACKEND_PID" "Backend Server"
    rm -f .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill_process "$FRONTEND_PID" "Frontend Server"
    rm -f .frontend.pid
fi

# Also kill any remaining processes on ports
echo -e "${YELLOW}Cleaning up any remaining processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Kill any related node processes
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true

# Clean up log files if they exist
if [ -f "backend.log" ]; then
    echo -e "${YELLOW}Cleaning up backend.log${NC}"
    rm -f backend.log
fi

if [ -f "frontend.log" ]; then
    echo -e "${YELLOW}Cleaning up frontend.log${NC}"
    rm -f frontend.log
fi

echo ""
echo -e "${GREEN}✅ All development servers stopped successfully!${NC}"
echo "=================================================="