#!/usr/bin/env node

// Database Health Monitor for Intelligent Kitchen
const db = require('./src/config/database');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'health-monitor.log' })
  ]
});

class DatabaseHealthMonitor {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  async performHealthCheck() {
    try {
      logger.info('🔍 Performing database health check...');
      const isHealthy = await db.checkHealth();
      
      if (isHealthy) {
        this.consecutiveFailures = 0;
        logger.info('✅ Database health check passed');
        
        // Log connection pool stats
        const pool = db.pool;
        logger.info('📊 Connection Pool Stats:', {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        });
      } else {
        this.consecutiveFailures++;
        logger.error(`❌ Database health check failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures})`);
        
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          logger.error('💥 Maximum consecutive failures reached, attempting recovery...');
          await this.attemptRecovery();
        }
      }
    } catch (error) {
      this.consecutiveFailures++;
      logger.error(`💥 Health check error: ${error.message}`);
      
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.attemptRecovery();
      }
    }
  }

  async attemptRecovery() {
    try {
      logger.info('🔄 Attempting database connection recovery...');
      
      // Close existing connections
      await db.pool.end();
      logger.info('📝 Closed existing database connections');
      
      // Wait a moment before reconnection
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Re-initialize database connection
      await db.checkHealth();
      
      if (db.isHealthy()) {
        this.consecutiveFailures = 0;
        logger.info('✅ Database recovery successful');
      } else {
        logger.error('❌ Database recovery failed');
      }
    } catch (error) {
      logger.error(`💥 Recovery attempt failed: ${error.message}`);
    }
  }

  start(intervalMinutes = 5) {
    if (this.isRunning) {
      logger.warn('⚠️  Health monitor is already running');
      return;
    }

    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    logger.info(`🚀 Starting database health monitor (checking every ${intervalMinutes} minutes)`);
    
    // Perform initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('⚠️  Health monitor is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    logger.info('🛑 Database health monitor stopped');
  }

  async runOnce() {
    logger.info('🔍 Running one-time database health check...');
    await this.performHealthCheck();
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new DatabaseHealthMonitor();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      const interval = parseInt(process.argv[3]) || 5;
      monitor.start(interval);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('🛑 Received SIGINT, stopping health monitor...');
        monitor.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        logger.info('🛑 Received SIGTERM, stopping health monitor...');
        monitor.stop();
        process.exit(0);
      });
      
      break;
      
    case 'check':
      monitor.runOnce().then(() => process.exit(0));
      break;
      
    default:
      console.log('Database Health Monitor for Intelligent Kitchen');
      console.log('');
      console.log('Usage:');
      console.log('  node health-monitor.js start [interval_minutes]  Start continuous monitoring');
      console.log('  node health-monitor.js check                    Run one-time health check');
      console.log('');
      console.log('Examples:');
      console.log('  node health-monitor.js start 5   Check every 5 minutes (default)');
      console.log('  node health-monitor.js start 1   Check every 1 minute');
      console.log('  node health-monitor.js check     Run single check');
      break;
  }
}

module.exports = DatabaseHealthMonitor;