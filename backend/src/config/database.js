const { Pool } = require('pg');
require('dotenv').config();

// Enhanced database configuration for Railway PostgreSQL
const pool = new Pool({
  // Use DATABASE_URL if available, otherwise individual variables
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'intelligent_kitchen',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  
  // Connection pooling settings optimized for Railway
  max: 10, // Reduced max connections for Railway
  min: 2,  // Minimum connections to keep alive
  idleTimeoutMillis: 60000, // Increased to 60 seconds
  connectionTimeoutMillis: 10000, // Increased to 10 seconds for Railway
  
  // SSL configuration - disable for local development
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Retry settings
  reapIntervalMillis: 1000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
});

// Enhanced connection monitoring
let isHealthy = false;
let lastHealthCheck = null;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 5;

// Health check function
async function checkDatabaseHealth() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    isHealthy = true;
    lastHealthCheck = new Date();
    connectionRetryCount = 0;
    
    console.log('✅ Database health check passed at', lastHealthCheck.toISOString());
    console.log('📊 PostgreSQL:', result.rows[0].version.split(',')[0]);
    
    return true;
  } catch (error) {
    isHealthy = false;
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
}

// Initial connection test with retry logic
async function initializeDatabase() {
  console.log('🔧 Initializing database connection...');
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await checkDatabaseHealth();
      if (isHealthy) {
        console.log('✅ Database initialized successfully');
        return;
      }
    } catch (error) {
      console.error(`❌ Database initialization attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed:`, error.message);
      
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('💥 Failed to initialize database after maximum attempts');
  throw new Error('Database initialization failed');
}

// Enhanced query function with retry logic
async function queryWithRetry(text, params, retryCount = 0) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    // Retry on connection errors
    if ((error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) && retryCount < 3) {
      console.warn(`⚠️  Database query failed (attempt ${retryCount + 1}/3), retrying...`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
      return queryWithRetry(text, params, retryCount + 1);
    }
    throw error;
  }
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down database connection pool...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down database connection pool...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Initialize database
initializeDatabase().catch(error => {
  console.error('💥 Failed to start database:', error);
  process.exit(1);
});

// Set up periodic health checks
setInterval(checkDatabaseHealth, 300000); // Check every 5 minutes

module.exports = {
  query: queryWithRetry,
  pool,
  end: () => pool.end(),
  checkHealth: checkDatabaseHealth,
  isHealthy: () => isHealthy,
  getLastHealthCheck: () => lastHealthCheck,
};