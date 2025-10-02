#!/bin/bash

# Quick Start Verification Script for Intelligent Kitchen Backend
# This script verifies that everything is working correctly for Railway database

set -e

echo "🚀 Intelligent Kitchen Backend Verification"
echo "=========================================="

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

success() {
    echo -e "${GREEN}✅${NC} $1"
}

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    error "This script must be run from the backend directory"
    exit 1
fi

# Test 1: Environment configuration
log "Testing environment configuration..."
if [ ! -f ".env" ]; then
    error ".env file not found"
    exit 1
fi

source .env
if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    error "Database configuration not found in .env"
    exit 1
fi
success "Environment configuration OK"

# Test 2: Database connection
log "Testing Railway database connection..."
node -e "
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT version() as version, COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'')
  .then(result => {
    console.log('✅ Database connection successful');
    console.log('📊', result.rows[0].version.split(',')[0]);
    console.log('📋 Tables found:', result.rows[0].table_count);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    pool.end();
    process.exit(1);
  });
"

success "Database connection OK"

# Test 3: Health monitor
log "Testing database health monitor..."
node health-monitor.js check > /dev/null 2>&1
if [ $? -eq 0 ]; then
    success "Health monitor OK"
else
    error "Health monitor failed"
    exit 1
fi

# Test 4: Basic API test
log "Testing basic API functionality..."
node -e "
const db = require('./src/config/database');

async function testAPI() {
  try {
    // Test basic database query
    const result = await db.query('SELECT 1 as test');
    if (result.rows[0].test === 1) {
      console.log('✅ Database query functionality OK');
    }
    
    // Test connection pool stats
    const pool = db.pool;
    console.log('📊 Connection pool stats:', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    });
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    process.exit(1);
  }
}

testAPI();
"

success "API functionality OK"

# Summary
echo ""
echo -e "${GREEN}🎉 All tests passed! Backend is ready for local development.${NC}"
echo ""
echo "Next steps:"
echo -e "  ${BLUE}1. Start the backend:${NC}"
echo "     npm run dev"
echo "     or"
echo "     ./start-with-monitoring.sh (includes health monitoring)"
echo ""
echo -e "  ${BLUE}2. Test the health endpoint:${NC}"
echo "     curl http://localhost:3001/health"
echo ""
echo -e "  ${BLUE}3. Check database health:${NC}"
echo "     node health-monitor.js check"
echo ""
echo "Features enabled:"
echo "  ✅ Railway PostgreSQL connection with SSL"
echo "  ✅ Enhanced connection pooling and retry logic"
echo "  ✅ Automatic health monitoring and recovery"
echo "  ✅ Comprehensive error handling"
echo "  ✅ Graceful shutdown handling"
echo "  ✅ Connection timeout protection"
echo "  ✅ Periodic health checks (every 5 minutes)"