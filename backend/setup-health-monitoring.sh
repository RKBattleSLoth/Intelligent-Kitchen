#!/bin/bash

# Railway Database Health Setup Script
# This script sets up comprehensive database monitoring for Railway PostgreSQL

set -e

echo "🚀 Railway Database Health Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    error "This script must be run from the backend directory"
    exit 1
fi

# Check environment variables
log "Checking environment configuration..."
if [ ! -f ".env" ]; then
    error ".env file not found. Please run Railway setup first."
    exit 1
fi

# Test database connection
log "Testing database connection..."
node -e "
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW() as current_time')
  .then(result => {
    console.log('✅ Database connection successful');
    console.log('📊 Current time:', result.rows[0].current_time);
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    pool.end();
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
    error "Database connection test failed"
    exit 1
fi

# Install additional dependencies if needed
log "Checking dependencies..."
if ! npm list winston &>/dev/null; then
    log "Installing winston for logging..."
    npm install winston
fi

# Test health monitor
log "Testing database health monitor..."
node health-monitor.js check

if [ $? -eq 0 ]; then
    log "Health monitor test passed"
else
    error "Health monitor test failed"
    exit 1
fi

# Create monitoring startup script
cat > start-with-monitoring.sh << 'EOF'
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
EOF

chmod +x start-with-monitoring.sh

# Create monitoring stop script
cat > stop-services.sh << 'EOF'
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
EOF

chmod +x stop-services.sh

# Create PM2 configuration (optional)
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'intelligent-kitchen-api',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_file: './logs/api-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }, {
    name: 'database-health-monitor',
    script: 'health-monitor.js',
    args: 'start 1',
    instances: 1,
    exec_mode: 'fork',
    error_file: './logs/health-monitor-error.log',
    out_file: './logs/health-monitor-out.log',
    log_file: './logs/health-monitor-combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

log "Setup completed successfully!"
echo ""
echo -e "${GREEN}🎉 Railway Database Health Monitoring Setup Complete!${NC}"
echo ""
echo "Available commands:"
echo -e "  ${BLUE}./start-with-monitoring.sh${NC}  - Start with health monitoring"
echo -e "  ${BLUE}./stop-services.sh${NC}         - Stop all services"
echo -e "  ${BLUE}node health-monitor.js check${NC} - Run health check"
echo -e "  ${BLUE}node health-monitor.js start 5${NC} - Start monitoring (5 min intervals)"
echo ""
echo "Health monitoring features:"
echo "  ✅ Automatic connection health checks"
echo "  ✅ Connection pool monitoring"
echo "  ✅ Automatic recovery on connection failures"
echo "  ✅ Enhanced error handling"
echo "  ✅ Detailed logging"
echo "  ✅ Graceful shutdown handling"
echo ""
echo "Health endpoint: http://localhost:3001/health"
echo "Health logs: ./health-monitor.log"