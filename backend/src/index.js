const express = require('express');
// Load environment variables FIRST, before any other imports
const dotenv = require('dotenv');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
console.log(`📁 Loading .env from: ${envPath}`);
// Use override: true to override existing environment variables
const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('❌ Error loading .env:', result.error);
} else {
  console.log(`✅ Loaded ${Object.keys(result.parsed).length} environment variables`);
}
console.log(`🔑 OPENROUTER_API_KEY value: ${process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 20) + '...' : 'NOT SET'}`);


const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { runMigrations } = require('./database/migrate');
const db = require('./config/database');
const { initEnv } = require('./config/env');

// Validate environment configuration
if (!initEnv()) {
  console.error('❌ Environment validation failed. Server cannot start.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    if (process.env.NODE_ENV === 'development') {
      // In development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = db.isHealthy();
    const lastHealthCheck = db.getLastHealthCheck();
    
    // Perform additional database health check if needed
    if (!dbHealthy || !lastHealthCheck || (Date.now() - lastHealthCheck.getTime()) > 60000) {
      await db.checkHealth();
    }
    
    const healthData = {
      status: db.isHealthy() ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        healthy: db.isHealthy(),
        lastHealthCheck: db.getLastHealthCheck(),
        connected: db.pool.totalCount > 0,
        idleConnections: db.pool.idleCount,
        totalConnections: db.pool.totalCount,
        url: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
      },
      ai: {
        openrouter_key: process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT_SET',
        key_length: process.env.OPENROUTER_API_KEY?.length || 0,
        model: process.env.OPENROUTER_MODEL || 'NOT_SET'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
    
    const statusCode = db.isHealthy() ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Railway debug endpoint for meal planning issues
app.get('/debug/railway-meal-planning', async (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Other',
      
      // Environment variables (sanitized)
      environment_vars: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 
          `${process.env.OPENROUTER_API_KEY.substring(0, 10)}...${process.env.OPENROUTER_API_KEY.slice(-4)}` : 
          'NOT_SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      },
      
      // Database test
      database_test: {
        healthy: db.isHealthy(),
        last_check: db.getLastHealthCheck(),
        pool_info: {
          total: db.pool.totalCount,
          idle: db.pool.idleCount,
          waiting: db.pool.waitingCount
        }
      },
      
      // Authentication test
      auth_test: {
        has_users: false,
        user_count: 0
      }
    };

    // Test database connection with a simple query
    try {
      const result = await db.query('SELECT COUNT(*) as user_count FROM users LIMIT 1');
      debugInfo.auth_test.has_users = true;
      debugInfo.auth_test.user_count = parseInt(result.rows[0].user_count);
    } catch (dbError) {
      debugInfo.database_test.error = dbError.message;
    }

    // Test AI service
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const OpenRouterClient = require('./services/ai/OpenRouterClient');
        const client = new OpenRouterClient();
        debugInfo.ai_test = await client.testConnection();
      } catch (aiError) {
        debugInfo.ai_test = {
          status: 'error',
          error: aiError.message
        };
      }
    } else {
      debugInfo.ai_test = {
        status: 'error',
        error: 'OpenRouter API key not set'
      };
    }

    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', require('./controllers/authController'));
app.use('/api/users', require('./controllers/userController'));
app.use('/api/pantry', require('./controllers/pantryController'));
app.use('/api/recipes', require('./controllers/recipeController'));
app.use('/api/meal-plans', require('./controllers/mealPlanController'));
app.use('/api/grocery-lists', require('./controllers/groceryController'));

// AI routes (LLM-powered features)
app.use('/api/ai', require('./routes/ai'));

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Application Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific database errors
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    console.warn('⚠️  Database connection error detected:', err.message);
    return res.status(503).json({
      error: 'Database temporarily unavailable',
      message: 'Please try again in a moment',
      retryable: true
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid authentication token'
    });
  }

  // Default error response
  res.status(err.status || 500).json({ 
    error: err.name || 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Run database migrations
    await runMigrations();
    console.log('Database migrations completed');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();