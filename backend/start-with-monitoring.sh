#!/bin/bash

# Start backend with database monitoring
echo "🚀 Starting Intelligent Kitchen Backend with Database Monitoring"

# Start health monitor in background
echo "📊 Starting database health monitor..."
node health-monitor.js start 1 &
HEALTH_PID=$!
echo "Health monitor PID: $HEALTH_PID"

# Save health monitor PID for cleanup
echo $HEALTH_PID > .health-monitor.pid

# Start the main application
echo "🔧 Starting backend server..."
npm run dev &
APP_PID=$!

# Save app PID for cleanup
echo $APP_PID > .app.pid

echo "✅ Services started successfully"
echo "Health Monitor PID: $HEALTH_PID"
echo "App PID: $APP_PID"
echo ""
echo "To stop all services:"
echo "  ./stop-services.sh"
echo ""
echo "Health checks will run every minute"
echo "Access /health endpoint for detailed status"

# Wait for either process to exit
wait $APP_PID
