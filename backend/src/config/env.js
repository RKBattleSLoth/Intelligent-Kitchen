/**
 * Environment Configuration and Validation
 * Validates required environment variables and provides defaults where appropriate
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL'
];

const optionalEnvVars = {
  'NODE_ENV': 'development',
  'PORT': '3001',
  'JWT_EXPIRES_IN': '7d',
  'FRONTEND_URL': 'http://localhost:3000',
  'REDIS_URL': 'redis://localhost:6379',
  'MAX_FILE_SIZE': '10485760',
  'UPLOAD_PATH': 'uploads/',
  'RATE_LIMIT_WINDOW_MS': '900000',
  'RATE_LIMIT_MAX_REQUESTS': '100',
  'OPENROUTER_API_KEY': '',
  'OPENROUTER_MODEL_SMALL': 'google/gemma-2-9b-it',
  'OPENROUTER_MODEL_MEDIUM': 'anthropic/claude-3.5-sonnet',
  'OPENROUTER_MODEL_LARGE': 'google/gemini-1.5-pro',
  'AI_ENABLE_CACHING': 'true',
  'AI_CACHE_TTL': '3600',
  'AI_MAX_RETRIES': '3',
  'AI_TIMEOUT': '30000',
  'AI_ENABLE_STREAMING': 'true',
  'AI_RATE_LIMIT_REQUESTS_PER_MINUTE': '20',
  'AI_RATE_LIMIT_TOKENS_PER_DAY': '1000000',
  'AI_ENABLE_COST_MONITORING': 'true',
  'AI_COST_ALERT_THRESHOLD': '100',
  'AI_MAX_COST_PER_USER_MONTHLY': '50'
};

/**
 * Validate environment variables
 * @throws {Error} If required environment variables are missing
 */
function validateEnv() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  // Validate database URL format
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Warn about default secrets in production
  if (process.env.NODE_ENV === 'production') {
    const defaultSecrets = [
      'your-super-secret-jwt-key-change-this-in-production',
      'your-secret-key'
    ];
    
    if (defaultSecrets.includes(jwtSecret)) {
      console.warn('⚠️  WARNING: Using default JWT secret in production!');
    }
  }
}

/**
 * Get environment variable with default value
 * @param {string} varName - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value or default
 */
function getEnvVar(varName, defaultValue = '') {
  return process.env[varName] || defaultValue;
}

/**
 * Get environment variable as integer
 * @param {string} varName - Environment variable name
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Environment variable value as integer
 */
function getEnvVarInt(varName, defaultValue = 0) {
  const value = process.env[varName];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Get environment variable as boolean
 * @param {string} varName - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Environment variable value as boolean
 */
function getEnvVarBool(varName, defaultValue = false) {
  const value = process.env[varName];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Initialize and validate environment configuration
 */
function initEnv() {
  try {
    validateEnv();
    
    // Set defaults for optional variables
    Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
      if (!process.env[key]) {
        process.env[key] = defaultValue;
      }
    });

    console.log('✅ Environment configuration validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    return false;
  }
}

module.exports = {
  validateEnv,
  getEnvVar,
  getEnvVarInt,
  getEnvVarBool,
  initEnv,
  requiredEnvVars,
  optionalEnvVars
};