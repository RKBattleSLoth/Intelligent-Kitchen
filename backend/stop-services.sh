#!/bin/bash

echo "🛑 Stopping Intelligent Kitchen Services"

# Stop health monitor
if [ -f ".health-monitor.pid" ]; then
    HEALTH_PID=$(cat .health-monitor.pid)
    if ps -p $HEALTH_PID > /dev/null; then
        echo "Stopping health monitor (PID: $HEALTH_PID)..."
        kill $HEALTH_PID
        rm .health-monitor.pid
    fi
fi

# Stop application
if [ -f ".app.pid" ]; then
    APP_PID=$(cat .app.pid)
    if ps -p $APP_PID > /dev/null; then
        echo "Stopping application (PID: $APP_PID)..."
        kill $APP_PID
        rm .app.pid
    fi
fi

# Clean up any remaining node processes
pkill -f "health-monitor.js" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

echo "✅ All services stopped"
