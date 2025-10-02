# Comprehensive Build Guide - Intelligent Kitchen AI

## 🚨 Critical Security & Build Fix Guide

This guide provides step-by-step instructions to resolve all **24 critical issues** identified in the security audit. Follow these instructions in order before any testing or deployment.

---

## 📋 Build Status Overview

### ✅ Already Completed:
- Railway PostgreSQL connection configured
- Secure JWT secret generated
- Database credentials properly set

### 🔴 Critical Issues Remaining (24 total):
- **8 Critical Security Vulnerabilities**
- **10 High Priority Functional Issues** 
- **6 Medium Priority Code Quality Issues**

---

## 🔴 PHASE 1: CRITICAL SECURITY FIXES (Must Complete First)

### Issue 1: Re-enable Authentication System
**Risk Level**: 🔴 CRITICAL | **Time**: 15 minutes

**Problem**: Authentication middleware is disabled throughout the application

**Files to Fix**:
```
backend/src/controllers/recipeController.js
backend/src/controllers/mealPlanController.js  
backend/src/controllers/pantryController.js
```

**Step-by-Step Fix**:

1. **Fix Recipe Controller**:
   ```bash
   # Edit backend/src/controllers/recipeController.js
   ```
   
   Find these lines (around line 165):
   ```javascript
   // Temporarily disable authentication for MVP testing
   // authenticateToken, 
   body('name').notEmpty().trim(),
   ```
   
   Replace with:
   ```javascript
   authenticateToken,
   body('name').notEmpty().trim(),
   ```

2. **Fix Meal Planning Controller**:
   ```bash
   # Edit backend/src/controllers/mealPlanController.js
   ```
   
   Find these lines (around line 20):
   ```javascript
   // MVP: Use hardcoded user ID instead of authentication
   const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
   ```
   
   Replace with:
   ```javascript
   const userId = req.user.id;
   ```

3. **Fix Pantry Controller**:
   ```bash
   # Edit backend/src/controllers/pantryController.js
   ```
   
   Find all instances of:
   ```javascript
   '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3'
   ```
   
   Replace with:
   ```javascript
   req.user.id
   ```

4. **Verify All Middleware**:
   ```bash
   # Check all controllers have proper authentication
   grep -r "authenticateToken" backend/src/controllers/
   ```

### Issue 2: Remove Hardcoded Frontend Credentials
**Risk Level**: 🔴 CRITICAL | **Time**: 10 minutes

**Problem**: Hardcoded user credentials in frontend code

**File to Fix**:
```
frontend/src/store/slices/authSlice.ts
```

**Step-by-Step Fix**:

1. **Edit Auth Slice**:
   ```bash
   # Edit frontend/src/store/slices/authSlice.ts
   ```

2. **Remove Hardcoded User Data** (lines 95-105):
   ```javascript
   // REMOVE THIS ENTIRE SECTION:
   const realUser: User = {
     id: '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3',
     email: 'admin@intelligentkitchen.com',
     firstName: 'Admin',
     lastName: 'User',
     dietaryPreference: 'none',
     healthGoal: 'maintain'
   }
   
   const realToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   
   localStorage.setItem('token', realToken);
   axios.defaults.headers.common['Authorization'] = `Bearer ${realToken}`;
   
   return { user: realUser, token: realToken };
   ```

3. **Replace with Proper Auto-Login**:
   ```javascript
   export const autoLogin = createAsyncThunk(
     'auth/autoLogin',
     async (_, { rejectWithValue }) => {
       try {
         const token = localStorage.getItem('token');
         if (!token) {
           throw new Error('No token found');
         }
         
         axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
         const response = await axios.get('/api/auth/verify');
         return { user: response.data.user, token };
       } catch (error: any) {
         localStorage.removeItem('token');
         delete axios.defaults.headers.common['Authorization'];
         return rejectWithValue('Auto-login failed');
       }
     }
   );
   ```

### Issue 3: Clean Database Schema
**Risk Level**: 🔴 CRITICAL | **Time**: 20 minutes

**Problem**: Hardcoded admin user in database schema

**Files to Fix**:
```
database/schema.sql
```

**Step-by-Step Fix**:

1. **Backup Current Schema**:
   ```bash
   cp database/schema.sql database/schema.sql.backup
   ```

2. **Remove Hardcoded User** (lines 185-190):
   ```sql
   -- REMOVE THESE LINES:
   -- Create default admin user (password should be changed immediately)
   -- Password: 'admin123' (hashed with bcrypt)
   INSERT INTO users (email, password_hash, first_name, last_name) 
   VALUES ('admin@intelligentkitchen.com', '$2a$10$rOZXp7mGXmHWK7vJtxB7uO5D3Q7J8Y.rKJ5L9nK8W7vJ8Y.rKJ5L9', 'Admin', 'User');
   ```

3. **Remove Sample Recipe** (lines 190-210):
   ```sql
   -- REMOVE THESE LINES:
   -- Create sample recipe for testing
   INSERT INTO recipes (user_id, name, description, instructions, prep_time, cook_time, servings, meal_type) 
   VALUES (
       (SELECT id FROM users WHERE email = 'admin@intelligentkitchen.com'),
       'Simple Scrambled Eggs',
       'Classic scrambled eggs perfect for breakfast',
       '1. Crack eggs into a bowl and whisk with salt and pepper.
   ...
   ```

4. **Apply Clean Schema to Railway**:
   ```bash
   # Use the clean schema
   psql $DATABASE_URL -f database/clean-schema.sql
   ```

### Issue 4: Implement Input Sanitization
**Risk Level**: 🔴 CRITICAL | **Time**: 30 minutes

**Problem**: Missing input validation and sanitization

**Files to Create**:
```
backend/src/middleware/sanitization.js
```

**Step-by-Step Fix**:

1. **Create Sanitization Middleware**:
   ```bash
   # Create backend/src/middleware/sanitization.js
   ```

   Add this content:
   ```javascript
   const mongoSanitize = require('express-mongo-sanitize');
   const xss = require('xss');
   const validator = require('validator');

   const sanitizeInput = (req, res, next) => {
     // Sanitize body, params, and query
     if (req.body) {
       req.body = sanitizeObject(req.body);
     }
     if (req.params) {
       req.params = sanitizeObject(req.params);
     }
     if (req.query) {
       req.query = sanitizeObject(req.query);
     }
     
     next();
   };

   const sanitizeObject = (obj) => {
     const sanitized = {};
     for (const [key, value] of Object.entries(obj)) {
       if (typeof value === 'string') {
         // Remove HTML tags and encode special characters
         sanitized[key] = validator.escape(validator.stripLow(value));
       } else if (typeof value === 'object' && value !== null) {
         sanitized[key] = sanitizeObject(value);
       } else {
         sanitized[key] = value;
       }
     }
     return sanitized;
   };

   const preventNoSQLInjection = mongoSanitize();

   module.exports = { sanitizeInput, preventNoSQLInjection };
   ```

2. **Install Required Packages**:
   ```bash
   cd backend
   npm install express-mongo-sanitize xss validator
   ```

3. **Apply to All Routes**:
   ```bash
   # Edit backend/src/index.js
   ```
   
   Add after other middleware:
   ```javascript
   const { sanitizeInput, preventNoSQLInjection } = require('./middleware/sanitization');
   
   // Add these lines after other middleware
   app.use(preventNoSQLInjection);
   app.use(sanitizeInput);
   ```

### Issue 5: Fix Rate Limiting
**Risk Level**: 🔴 CRITICAL | **Time**: 15 minutes

**Problem**: Insufficient rate limiting on authentication endpoints

**Step-by-Step Fix**:

1. **Create Auth-Specific Rate Limiting**:
   ```bash
   # Edit backend/src/index.js
   ```

2. **Add Strict Rate Limiting for Auth**:
   ```javascript
   // Add this after existing rate limiter
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // limit each IP to 5 requests per windowMs
     message: 'Too many authentication attempts, please try again later.',
     standardHeaders: true,
     legacyHeaders: false,
   });

   // Apply stricter rate limiting to auth routes
   app.use('/api/auth', authLimiter);
   ```

### Issue 6: Secure Database Connections
**Risk Level**: 🔴 CRITICAL | **Time**: 10 minutes

**Problem**: Database connections without SSL enforcement

**Step-by-Step Fix**:

1. **Update Database Configuration**:
   ```bash
   # Edit backend/src/config/database.js
   ```

2. **Add SSL Configuration**:
   ```javascript
   const pool = new Pool({
     host: process.env.DB_HOST || 'localhost',
     port: process.env.DB_PORT || 5432,
     database: process.env.DB_NAME || 'intelligent_kitchen',
     user: process.env.DB_USER || 'postgres',
     password: process.env.DB_PASSWORD || 'password',
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
     ssl: process.env.NODE_ENV === 'production' ? {
       rejectUnauthorized: true,
       require: true
     } : false,
   });
   ```

### Issue 7: Remove Frontend API Keys
**Risk Level**: 🔴 CRITICAL | **Time**: 10 minutes

**Problem**: API keys exposed in frontend configuration

**Step-by-Step Fix**:

1. **Update Frontend Environment**:
   ```bash
   # Edit frontend/.env.example
   ```

2. **Remove API Keys from Frontend**:
   ```env
   # REMOVE these lines:
   VITE_SPOONACULAR_API_KEY=your-spoonacular-api-key
   VITE_GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key
   
   # REPLACE with backend proxy calls:
   VITE_ENABLE_EXTERNAL_API=false
   ```

### Issue 8: Implement Proper CORS
**Risk Level**: 🔴 CRITICAL | **Time**: 15 minutes

**Problem**: Overly permissive CORS configuration

**Step-by-Step Fix**:

1. **Update CORS Configuration**:
   ```bash
   # Edit backend/src/index.js
   ```

2. **Add Strict CORS Policy**:
   ```javascript
   const cors = require('cors');
   
   const corsOptions = {
     origin: function (origin, callback) {
       const allowedOrigins = [
         process.env.FRONTEND_URL,
         'http://localhost:3000',
         'http://localhost:5173' // Vite default
       ].filter(Boolean);
       
       // Allow requests with no origin (mobile apps, curl)
       if (!origin) return callback(null, true);
       
       if (allowedOrigins.indexOf(origin) !== -1) {
         callback(null, true);
       } else {
         callback(new Error('Not allowed by CORS'));
       }
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   };
   
   app.use(cors(corsOptions));
   ```

---

## 🟡 PHASE 2: HIGH PRIORITY FUNCTIONAL FIXES

### Issue 9: Fix Database Transaction Management
**Risk Level**: 🟡 HIGH | **Time**: 45 minutes

**Problem**: Manual transaction management without proper error handling

**Files to Fix**:
```
backend/src/controllers/groceryController.js
```

**Step-by-Step Fix**:

1. **Create Transaction Helper**:
   ```bash
   # Create backend/src/utils/transaction.js
   ```

   Add this content:
   ```javascript
   const { pool } = require('../config/database');

   const withTransaction = async (callback) => {
     const client = await pool.connect();
     try {
       await client.query('BEGIN');
       const result = await callback(client);
       await client.query('COMMIT');
       return result;
     } catch (error) {
       await client.query('ROLLBACK');
       throw error;
     } finally {
       client.release();
     }
   };

   module.exports = { withTransaction };
   ```

2. **Update Grocery Controller**:
   ```bash
   # Edit backend/src/controllers/groceryController.js
   ```

3. **Replace Manual Transactions**:
   ```javascript
   // Replace the manual transaction in generate function
   const { withTransaction } = require('../utils/transaction');
   
   // Replace the existing transaction code with:
   const result = await withTransaction(async (client) => {
     // Create grocery list
     const groceryListResult = await client.query(
       `INSERT INTO grocery_lists (user_id, name, meal_plan_id) 
        VALUES ($1, $2, $3) 
        RETURNING id, name, meal_plan_id, is_completed, created_at, updated_at`,
       [req.user.id, name || `Grocery List for ${mealPlan.name}`, req.params.mealPlanId]
     );

     // ... rest of the transaction logic
     return { groceryList: groceryListResult.rows[0], items: groceryItems };
   });
   ```

### Issue 10: Fix Date/Time Zone Handling
**Risk Level**: 🟡 HIGH | **Time**: 30 minutes

**Problem**: Inconsistent date handling across timezone conversions

**Step-by-Step Fix**:

1. **Create Date Utility**:
   ```bash
   # Create backend/src/utils/dateHelper.js
   ```

2. **Add UTC Date Handling**:
   ```javascript
   const parseDateUTC = (dateString) => {
     const date = new Date(dateString);
     // Convert to UTC midnight to avoid timezone issues
     return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
   };

   const formatUTCDate = (date) => {
     return date.toISOString().split('T')[0];
   };

   module.exports = { parseDateUTC, formatUTCDate };
   ```

3. **Update Meal Planning Controller**:
   ```bash
   # Edit backend/src/controllers/mealPlanController.js
   ```

4. **Replace Date Handling**:
   ```javascript
   const { parseDateUTC } = require('../utils/dateHelper');
   
   // Replace this:
   const localStartDate = new Date(startDate + 'T12:00:00');
   
   // With this:
   const localStartDate = parseDateUTC(startDate);
   ```

### Issue 11: Add Database Constraints
**Risk Level**: 🟡 HIGH | **Time**: 60 minutes

**Problem**: Missing database-level validation

**Step-by-Step Fix**:

1. **Create Constraints Migration**:
   ```bash
   # Create database/add-constraints.sql
   ```

2. **Add Validation Constraints**:
   ```sql
   -- Add email validation
   ALTER TABLE users ADD CONSTRAINT valid_email 
   CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

   -- Add reasonable quantity constraints
   ALTER TABLE pantry_items ADD CONSTRAINT valid_quantity 
   CHECK (quantity > 0 AND quantity < 10000);

   ALTER TABLE recipe_ingredients ADD CONSTRAINT valid_quantity 
   CHECK (quantity > 0 AND quantity < 1000);

   -- Add serving constraints
   ALTER TABLE recipes ADD CONSTRAINT valid_servings 
   CHECK (servings > 0 AND servings < 100);

   -- Add date validation
   ALTER TABLE pantry_items ADD CONSTRAINT valid_dates 
   CHECK (expiration_date IS NULL OR expiration_date >= purchase_date);

   ALTER TABLE meal_plans ADD CONSTRAINT valid_date_range 
   CHECK (end_date >= start_date);
   ```

3. **Apply Constraints**:
   ```bash
   psql $DATABASE_URL -f database/add-constraints.sql
   ```

### Issue 12: Fix Error Information Leakage
**Risk Level**: 🟡 HIGH | **Time**: 20 minutes

**Problem**: Detailed error messages expose system information

**Step-by-Step Fix**:

1. **Create Secure Error Handler**:
   ```bash
   # Create backend/src/middleware/errorHandler.js
   ```

2. **Implement Secure Error Logging**:
   ```javascript
   const winston = require('winston');

   const logger = winston.createLogger({
     level: 'error',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'logs/error.log' }),
       new winston.transports.Console({ format: winston.format.simple() })
     ]
   });

   const errorHandler = (err, req, res, next) => {
     // Log the full error for debugging
     logger.error({
       message: err.message,
       stack: err.stack,
       url: req.url,
       method: req.method,
       ip: req.ip,
       userAgent: req.get('User-Agent'),
       timestamp: new Date().toISOString()
     });

     // Send generic error to client
     if (process.env.NODE_ENV === 'production') {
       res.status(err.status || 500).json({
         error: 'Internal server error',
         message: 'Something went wrong. Please try again later.',
         requestId: req.id || 'unknown'
       });
     } else {
       // Development: show full error
       res.status(err.status || 500).json({
         error: err.message,
         stack: err.stack
       });
     }
   };

   module.exports = errorHandler;
   ```

3. **Update Error Middleware**:
   ```bash
   # Edit backend/src/index.js
   ```

4. **Replace Generic Error Handler**:
   ```javascript
   const errorHandler = require('./middleware/errorHandler');
   
   // Replace the existing error handler with:
   app.use(errorHandler);
   ```

### Issue 13: Add Password Strength Requirements
**Risk Level**: 🟡 HIGH | **Time**: 15 minutes

**Problem**: Minimum 6-character password validation only

**Step-by-Step Fix**:

1. **Update Authentication Controller**:
   ```bash
   # Edit backend/src/controllers/authController.js
   ```

2. **Add Strong Password Validation**:
   ```javascript
   // Replace the existing password validation
   body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, "i").withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
   ```

### Issue 14: Implement File Upload Security
**Risk Level**: 🟡 HIGH | **Time**: 30 minutes

**Problem**: No file type validation or security measures

**Step-by-Step Fix**:

1. **Create File Upload Middleware**:
   ```bash
   # Create backend/src/middleware/fileUpload.js
   ```

2. **Add Secure File Handling**:
   ```javascript
   const multer = require('multer');
   const path = require('path');
   const fs = require('fs');

   const storage = multer.diskStorage({
     destination: (req, file, cb) => {
       const uploadDir = 'uploads/';
       if (!fs.existsSync(uploadDir)) {
         fs.mkdirSync(uploadDir, { recursive: true });
       }
       cb(null, uploadDir);
     },
     filename: (req, file, cb) => {
       // Generate unique filename
       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
       cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
     }
   });

   const fileFilter = (req, file, cb) => {
     // Allowed file types
     const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
     
     if (allowedTypes.includes(file.mimetype)) {
       cb(null, true);
     } else {
       cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
     }
   };

   const upload = multer({
     storage: storage,
     fileFilter: fileFilter,
     limits: {
       fileSize: 5 * 1024 * 1024, // 5MB limit
     }
   });

   module.exports = { upload };
   ```

### Issue 15: Fix Session Management
**Risk Level**: 🟡 HIGH | **Time**: 25 minutes

**Problem**: JWT tokens without proper session invalidation

**Step-by-Step Fix**:

1. **Create Token Blacklist**:
   ```bash
   # Create backend/src/middleware/tokenBlacklist.js
   ```

2. **Add Token Blacklisting**:
   ```javascript
   const redis = require('redis');
   const client = redis.createClient(process.env.REDIS_URL);

   const addToBlacklist = async (token, expiresIn) => {
     await client.setEx(`blacklist_${token}`, expiresIn, '1');
   };

   const isBlacklisted = async (token) => {
     const result = await client.get(`blacklist_${token}`);
     return result === '1';
   };

   module.exports = { addToBlacklist, isBlacklisted };
   ```

3. **Update Authentication Middleware**:
   ```bash
   # Edit backend/src/middleware/auth.js
   ```

4. **Add Blacklist Check**:
   ```javascript
   const { isBlacklisted } = require('./tokenBlacklist');

   const authenticateToken = async (req, res, next) => {
     const authHeader = req.headers['authorization'];
     const token = authHeader && authHeader.split(' ')[1];

     if (!token) {
       return res.status(401).json({ error: 'Access token required' });
     }

     try {
       // Check if token is blacklisted
       if (await isBlacklisted(token)) {
         return res.status(401).json({ error: 'Token has been revoked' });
       }

       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       // ... rest of the logic
     } catch (error) {
       return res.status(403).json({ error: 'Invalid or expired token' });
     }
   };
   ```

### Issue 16: Implement SQL Injection Protection
**Risk Level**: 🟡 HIGH | **Time**: 20 minutes

**Problem**: Potential SQL injection in dynamic queries

**Step-by-Step Fix**:

1. **Audit All Database Queries**:
   ```bash
   # Search for dynamic query construction
   grep -r "SELECT.*FROM.*WHERE" backend/src/controllers/
   ```

2. **Ensure Parameterized Queries**:
   ```bash
   # Check all queries use parameter binding
   grep -r "query(" backend/src/controllers/ | grep -v "\$\d"
   ```

3. **Add Query Validation Middleware**:
   ```bash
   # Create backend/src/middleware/queryValidation.js
   ```

   Add this content:
   ```javascript
   const validateQueryParams = (req, res, next) => {
     // Validate numeric parameters
     const numericParams = ['id', 'page', 'limit', 'quantity'];
     numericParams.forEach(param => {
       if (req.params[param] && isNaN(req.params[param])) {
         return res.status(400).json({ error: `Invalid ${param}: must be a number` });
       }
       if (req.query[param] && isNaN(req.query[param])) {
         return res.status(400).json({ error: `Invalid ${param}: must be a number` });
       }
     });

     next();
   };

   module.exports = { validateQueryParams };
   ```

### Issue 17: Add Comprehensive Input Validation
**Risk Level**: 🟡 HIGH | **Time**: 40 minutes

**Problem**: Incomplete validation middleware application

**Step-by-Step Fix**:

1. **Update All Controllers**:
   ```bash
   # Find all routes missing validation
   grep -r "router\." backend/src/controllers/ | grep -v "handleValidationErrors"
   ```

2. **Add Validation to Missing Endpoints**:
   ```bash
   # Edit each controller file to add validation
   ```

3. **Create Validation Schema**:
   ```bash
   # Create backend/src/validators/schemas.js
   ```

   Add comprehensive validation schemas:
   ```javascript
   const { body, param, query } = require('express-validator');

   const pantryItemValidation = [
     body('name').trim().isLength({ min: 1, max: 255 }).escape(),
     body('quantity').isFloat({ min: 0, max: 10000 }),
     body('unit').isIn(['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']),
     body('purchaseDate').optional().isISO8601().toDate(),
     body('expirationDate').optional().isISO8601().toDate(),
     body('category').optional().trim().isLength({ max: 100 }).escape(),
     body('notes').optional().trim().isLength({ max: 1000 }).escape()
   ];

   const recipeValidation = [
     body('name').trim().isLength({ min: 1, max: 255 }).escape(),
     body('description').optional().trim().isLength({ max: 1000 }).escape(),
     body('instructions').trim().isLength({ min: 1, max: 10000 }).escape(),
     body('prepTime').optional().isInt({ min: 0, max: 1440 }),
     body('cookTime').optional().isInt({ min: 0, max: 1440 }),
     body('servings').isInt({ min: 1, max: 100 }),
     body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
     body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
   ];

   module.exports = {
     pantryItemValidation,
     recipeValidation
   };
   ```

### Issue 18: Add Request ID Tracking
**Risk Level**: 🟡 HIGH | **Time**: 15 minutes

**Problem**: No request tracking for debugging

**Step-by-Step Fix**:

1. **Add Request ID Middleware**:
   ```bash
   # Create backend/src/middleware/requestId.js
   ```

2. **Implement Request Tracking**:
   ```javascript
   const { v4: uuidv4 } = require('uuid');

   const requestId = (req, res, next) => {
     req.id = uuidv4();
     res.setHeader('X-Request-ID', req.id);
     next();
   };

   module.exports = requestId;
   ```

3. **Update App Middleware**:
   ```bash
   # Edit backend/src/index.js
   ```

   Add after other middleware:
   ```javascript
   const requestId = require('./middleware/requestId');
   app.use(requestId);
   ```

---

## 🟢 PHASE 3: MEDIUM PRIORITY CODE QUALITY FIXES

### Issue 19: Remove Console Logging
**Risk Level**: 🟢 MEDIUM | **Time**: 25 minutes

**Problem**: Production console logging exposes sensitive information

**Step-by-Step Fix**:

1. **Find All Console Statements**:
   ```bash
   # Search for console.log statements
   grep -r "console\." backend/src/ --include="*.js"
   ```

2. **Replace with Proper Logging**:
   ```bash
   # Install winston for structured logging
   cd backend
   npm install winston
   ```

3. **Create Logger Configuration**:
   ```bash
   # Create backend/src/utils/logger.js
   ```

   Add this content:
   ```javascript
   const winston = require('winston');

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.errors({ stack: true }),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
       new winston.transports.File({ filename: 'logs/combined.log' })
     ]
   });

   if (process.env.NODE_ENV !== 'production') {
     logger.add(new winston.transports.Console({
       format: winston.format.simple()
     }));
   }

   module.exports = logger;
   ```

4. **Replace Console Statements**:
   ```bash
   # Example replacement in any controller:
   
   # FROM:
   console.error('Get pantry items error:', error);
   
   # TO:
   const logger = require('../utils/logger');
   logger.error('Get pantry items error', { error: error.message, stack: error.stack });
   ```

### Issue 20: Fix Memory Leaks in Database Connections
**Risk Level**: 🟢 MEDIUM | **Time**: 20 minutes

**Problem**: Inconsistent connection cleanup

**Step-by-Step Fix**:

1. **Update Database Configuration**:
   ```bash
   # Edit backend/src/config/database.js
   ```

2. **Add Connection Pool Management**:
   ```javascript
   const pool = new Pool({
     host: process.env.DB_HOST || 'localhost',
     port: process.env.DB_PORT || 5432,
     database: process.env.DB_NAME || 'intelligent_kitchen',
     user: process.env.DB_USER || 'postgres',
     password: process.env.DB_PASSWORD || 'password',
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
     ssl: process.env.NODE_ENV === 'production' ? {
       rejectUnauthorized: true,
       require: true
     } : false,
   });

   // Add proper cleanup on process exit
   process.on('SIGINT', async () => {
     console.log('Closing database connections...');
     await pool.end();
     process.exit(0);
   });

   process.on('SIGTERM', async () => {
     console.log('Closing database connections...');
     await pool.end();
     process.exit(0);
   });
   ```

### Issue 21: Add API Documentation
**Risk Level**: 🟢 MEDIUM | **Time**: 45 minutes

**Problem**: Missing API documentation for developers

**Step-by-Step Fix**:

1. **Install Swagger Dependencies**:
   ```bash
   cd backend
   npm install swagger-jsdoc swagger-ui-express
   ```

2. **Create API Documentation**:
   ```bash
   # Create backend/src/docs/swagger.js
   ```

3. **Add Swagger Configuration**:
   ```javascript
   const swaggerJsdoc = require('swagger-jsdoc');
   const swaggerUi = require('swagger-ui-express');

   const options = {
     definition: {
       openapi: '3.0.0',
       info: {
         title: 'Intelligent Kitchen API',
         version: '1.0.0',
         description: 'AI-powered kitchen management system API',
       },
       servers: [
         {
           url: process.env.NODE_ENV === 'production' 
             ? 'https://your-api-domain.com' 
             : `http://localhost:${process.env.PORT || 3001}`,
           description: process.env.NODE_ENV === 'production' 
             ? 'Production server' 
             : 'Development server',
         },
       ],
       components: {
         securitySchemes: {
           bearerAuth: {
             type: 'http',
             scheme: 'bearer',
             bearerFormat: 'JWT',
           },
         },
       },
     },
     apis: ['./src/controllers/*.js'], // Path to the API docs
   };

   const specs = swaggerJsdoc(options);

   module.exports = { specs, swaggerUi };
   ```

4. **Add Documentation Routes**:
   ```bash
   # Edit backend/src/index.js
   ```

   Add this:
   ```javascript
   const { specs, swaggerUi } = require('./docs/swagger');

   // API Documentation route
   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
   
   // Add API schema endpoint
   app.get('/api-docs.json', (req, res) => {
     res.setHeader('Content-Type', 'application/json');
     res.send(specs);
   });
   ```

### Issue 22: Fix Frontend Hardcoded URLs
**Risk Level**: 🟢 MEDIUM | **Time**: 15 minutes

**Problem**: Hardcoded API URLs prevent flexible deployment

**Step-by-Step Fix**:

1. **Update Frontend API Configuration**:
   ```bash
   # Edit frontend/src/api/config.ts
   ```

2. **Add Dynamic Configuration**:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

   export const API_CONFIG = {
     BASE_URL: API_BASE_URL,
     WS_URL: WS_URL,
     ENDPOINTS: {
       AUTH: '/api/auth',
       PANTRY: '/api/pantry',
       RECIPES: '/api/recipes',
       MEAL_PLANS: '/api/meal-plans',
       GROCERY_LISTS: '/api/grocery-lists',
     }
   };
   ```

### Issue 23: Add React Error Boundaries
**Risk Level**: 🟢 MEDIUM | **Time**: 30 minutes

**Problem**: No error boundaries for component failures

**Step-by-Step Fix**:

1. **Create Error Boundary Component**:
   ```bash
   # Create frontend/src/components/ErrorBoundary.tsx
   ```

2. **Implement Error Handling**:
   ```typescript
   import React, { Component, ErrorInfo, ReactNode } from 'react';

   interface Props {
     children: ReactNode;
   }

   interface State {
     hasError: boolean;
     error?: Error;
   }

   class ErrorBoundary extends Component<Props, State> {
     public state: State = {
       hasError: false
     };

     public static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }

     public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
       console.error('Uncaught error:', error, errorInfo);
       
       // Log error to service in production
       if (import.meta.env.PROD) {
         // TODO: Add error logging service
       }
     }

     public render() {
       if (this.state.hasError) {
         return (
           <div className="min-h-screen flex items-center justify-center bg-gray-50">
             <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
               <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
               <p className="text-gray-600 mb-4">
                 We're sorry, but something unexpected happened. Please try refreshing the page.
               </p>
               <button
                 onClick={() => window.location.reload()}
                 className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
               >
                 Refresh Page
               </button>
               {import.meta.env.DEV && this.state.error && (
                 <details className="mt-4 p-4 bg-gray-100 rounded">
                   <summary className="cursor-pointer font-mono text-sm">Error Details</summary>
                   <pre className="mt-2 text-xs overflow-auto">
                     {this.state.error.stack}
                   </pre>
                 </details>
               )}
             </div>
           </div>
         );
       }

       return this.props.children;
     }
   }

   export default ErrorBoundary;
   ```

3. **Wrap Application**:
   ```bash
   # Edit frontend/src/App.tsx
   ```

   Add error boundary:
   ```typescript
   import ErrorBoundary from './components/ErrorBoundary';

   function App() {
     return (
       <ErrorBoundary>
         <Routes>
           {/* Your routes */}
         </Routes>
       </ErrorBoundary>
     );
   }
   ```

### Issue 24: Add Health Monitoring
**Risk Level**: 🟢 MEDIUM | **Time**: 25 minutes

**Problem**: Missing health checks and monitoring

**Step-by-Step Fix**:

1. **Create Health Check Endpoint**:
   ```bash
   # Create backend/src/routes/health.js
   ```

2. **Implement Comprehensive Health Checks**:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const { query, pool } = require('../config/database');

   router.get('/', async (req, res) => {
     const healthCheck = {
       status: 'ok',
       timestamp: new Date().toISOString(),
       uptime: process.uptime(),
       version: process.env.npm_package_version || '1.0.0',
       checks: {
         database: 'unknown',
         memory: 'unknown'
       }
     };

     try {
       // Check database connection
       const dbResult = await query('SELECT NOW()');
       healthCheck.checks.database = 'ok';
     } catch (error) {
       healthCheck.checks.database = 'error';
       healthCheck.status = 'error';
     }

     // Check memory usage
     const memUsage = process.memoryUsage();
     healthCheck.checks.memory = {
       rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
       heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
       heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
       external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
     };

     const statusCode = healthCheck.status === 'ok' ? 200 : 503;
     res.status(statusCode).json(healthCheck);
   });

   router.get('/ready', async (req, res) => {
     // Readiness probe - check if app is ready to serve traffic
     try {
       await query('SELECT 1');
       res.status(200).json({ status: 'ready' });
     } catch (error) {
       res.status(503).json({ status: 'not ready', error: error.message });
     }
   });

   router.get('/live', (req, res) => {
     // Liveness probe - check if app is alive
     res.status(200).json({ 
       status: 'alive',
       uptime: process.uptime(),
       timestamp: new Date().toISOString()
     });
   });

   module.exports = router;
   ```

3. **Add Health Routes**:
   ```bash
   # Edit backend/src/index.js
   ```

   Add this:
   ```javascript
   const healthRoutes = require('./routes/health');
   
   // Add health check routes
   app.use('/health', healthRoutes);
   
   // Update existing health check
   app.get('/health', (req, res) => {
     res.json({ 
       status: 'OK', 
       timestamp: new Date().toISOString(),
       version: '1.0.0'
     });
   });
   ```

---

## 🧪 PHASE 4: TESTING & VERIFICATION

### Complete Testing Checklist

**After completing all fixes, run this verification checklist:**

#### Security Testing
```bash
# 1. Test authentication is working
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'

# Should return 401, not allow access

# 2. Test protected routes require authentication
curl -X GET http://localhost:3001/api/pantry

# Should return 401, not return data

# 3. Test input sanitization
curl -X POST http://localhost:3001/api/pantry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"<script>alert(1)</script>","quantity":1}'

# Should sanitize HTML, not execute script
```

#### Database Testing
```bash
# 1. Test database connection
cd backend && node simple-db-check.js

# 2. Test constraints work
# Try to insert invalid data and verify it's rejected

# 3. Test transactions work
# Simulate a failed transaction and verify rollback
```

#### Functionality Testing
```bash
# 1. Start application
npm run dev

# 2. Test all endpoints
# - User registration/login
# - Pantry CRUD operations
# - Recipe CRUD operations
# - Meal planning
# - Grocery list generation

# 3. Test error handling
# - Invalid data submission
# - Missing required fields
# - Unauthorized access attempts
```

#### Performance Testing
```bash
# 1. Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}'
done

# Should be rate limited after 5 attempts

# 2. Test database connection pooling
# Make multiple concurrent requests and verify they're handled properly
```

---

## 📋 FINAL DEPLOYMENT CHECKLIST

### Before Production Deployment:

- [ ] **All 8 Critical Security Issues Fixed**
  - [ ] Authentication re-enabled across all endpoints
  - [ ] All hardcoded credentials removed
  - [ ] Database schema cleaned of test data
  - [ ] Input sanitization implemented
  - [ ] Rate limiting properly configured
  - [ ] Database connections secured with SSL
  - [ ] API keys removed from frontend
  - [ ] CORS properly configured

- [ ] **All 10 High Priority Issues Fixed**
  - [ ] Database transaction management implemented
  - [ ] Date/time zone handling consistent
  - [ ] Database constraints added
  - [ ] Error handling secure
  - [ ] Password strength requirements implemented
  - [ ] File upload security added
  - [ ] Session management implemented
  - [ ] SQL injection protection added
  - [ ] Comprehensive input validation added
  - [ ] Request ID tracking implemented

- [ ] **All 6 Medium Priority Issues Fixed**
  - [ ] Console logging replaced with proper logging
  - [ ] Memory leaks in database connections fixed
  - [ ] API documentation added
  - [ ] Frontend hardcoded URLs removed
  - [ ] React error boundaries added
  - [ ] Health monitoring implemented

### Environment Configuration:
- [ ] Railway PostgreSQL connection verified
- [ ] Secure JWT secret configured
- [ ] All environment variables properly set
- [ ] Frontend API URL configured for production
- [ ] SSL/TLS enforced for all connections

### Testing Verification:
- [ ] All endpoints tested and working
- [ ] Authentication flow tested
- [ ] Error handling verified
- [ ] Database constraints working
- [ ] Rate limiting functional
- [ ] File upload security verified

### Documentation:
- [ ] API documentation accessible at `/api-docs`
- [ ] Health checks working at `/health`
- [ ] Error logging functional
- [ ] Build process documented

---

## 🚀 EMERGENCY ROLLBACK PLAN

If any issues arise during deployment:

### Quick Rollback Commands:
```bash
# 1. Rollback database schema
pssql $DATABASE_URL -f database/schema.sql.backup

# 2. Restore previous environment
git checkout HEAD~1 -- backend/.env

# 3. Restart services
npm run build
npm start
```

### Monitoring Commands:
```bash
# Check application health
curl http://localhost:3001/health

# Check database connection
node simple-db-check.js

# Check logs
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues & Solutions:

1. **Authentication Not Working**
   - Check JWT secret is properly set
   - Verify environment variables are loaded
   - Check frontend token storage

2. **Database Connection Issues**
   - Verify Railway PostgreSQL is running
   - Check connection string format
   - Test with `node simple-db-check.js`

3. **CORS Errors**
   - Verify frontend URL in CORS configuration
   - Check preflight requests are handled
   - Ensure credentials are included

4. **Rate Limiting Too Strict**
   - Adjust rate limiting configuration
   - Check different limits for different routes
   - Monitor rate limiting logs

---

**⚠️ IMPORTANT**: Do not attempt local testing or deployment until ALL critical security issues (Phase 1) are resolved. The application currently has significant security vulnerabilities that must be addressed first.

**📈 SUCCESS METRIC**: After completing all fixes, the application should have no known security vulnerabilities, proper error handling, comprehensive logging, and reliable database operations.
