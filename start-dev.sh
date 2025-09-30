#!/bin/bash

# Intelligent Kitchen Development Server Startup Script
# This script ensures clean startup every time

echo "🍳 Intelligent Kitchen Development Server Startup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    echo -e "${YELLOW}Killing processes on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}Waiting for $name to be ready...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready!${NC}"
            return 0
        fi
        echo -e "${YELLOW}Attempt $attempt/$max_attempts...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name failed to start within expected time${NC}"
    return 1
}

# Clean up any existing processes
echo -e "${BLUE}Cleaning up existing processes...${NC}"
kill_port 3000
kill_port 3002

# Kill any existing node processes that might interfere
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true

sleep 3

# Check if dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
if wait_for_server "http://localhost:3002/health" "Backend Server"; then
    echo -e "${GREEN}✅ Backend server started successfully (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    echo "Backend logs:"
    tail -20 backend.log
    exit 1
fi

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
if wait_for_server "http://localhost:3000" "Frontend Server"; then
    echo -e "${GREEN}✅ Frontend server started successfully (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    echo "Frontend logs:"
    tail -20 frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Final verification
echo -e "${BLUE}Performing final connection test...${NC}"
if curl -s "http://localhost:3000/api/recipes" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API connection verified!${NC}"
else
    echo -e "${RED}❌ API connection failed${NC}"
    echo "Checking backend logs:"
    tail -10 backend.log
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}🎉 Intelligent Kitchen Development Environment is Ready!${NC}"
echo "=================================================="
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend API:${NC} http://localhost:3002"
echo -e "${BLUE}Backend Health:${NC} http://localhost:3002/health"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo -e "  Backend: $BACKEND_PID"
echo -e "  Frontend: $FRONTEND_PID"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  Backend: ./backend.log"
echo -e "  Frontend: ./frontend.log"
echo ""
echo -e "${YELLOW}To stop servers:${NC} ./stop-dev.sh"
echo -e "${YELLOW}To view logs:${NC} tail -f backend.log frontend.log"
echo ""

# Save PIDs to file for stop script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

echo -e "${GREEN}✅ All systems operational! Open http://localhost:3000 in your browser.${NC}"