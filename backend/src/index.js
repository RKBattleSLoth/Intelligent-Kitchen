const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { runMigrations } = require('./database/migrate');
const db = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
      database: {
        healthy: db.isHealthy(),
        lastHealthCheck: db.getLastHealthCheck(),
        connected: db.pool.totalCount > 0,
        idleConnections: db.pool.idleCount,
        totalConnections: db.pool.totalCount
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