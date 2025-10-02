#!/usr/bin/env node

// Database Setup Script for Railway PostgreSQL
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
    log('🔍 Checking Environment Variables:', 'cyan');
    
    const requiredVars = [
        'DATABASE_URL',
        'DB_HOST',
        'DB_NAME', 
        'DB_USER',
        'DB_PASSWORD'
    ];
    
    let hasConnection = false;
    
    if (process.env.DATABASE_URL) {
        log('✅ DATABASE_URL is set', 'green');
        hasConnection = true;
    } else {
        log('❌ DATABASE_URL not set', 'red');
    }
    
    const individualVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const hasAllIndividual = individualVars.every(varName => process.env[varName]);
    
    if (hasAllIndividual) {
        log('✅ Individual database variables are set', 'green');
        hasConnection = true;
    } else {
        log('❌ Some individual database variables missing', 'yellow');
        individualVars.forEach(varName => {
            if (process.env[varName]) {
                log(`   ✅ ${varName}`, 'green');
            } else {
                log(`   ❌ ${varName}`, 'red');
            }
        });
    }
    
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-super-secret-jwt-key-change-this-in-production') {
        log('✅ JWT_SECRET is configured', 'green');
    } else {
        log('❌ JWT_SECRET needs to be updated', 'red');
        log('   Run: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"', 'yellow');
    }
    
    return hasConnection;
}

function validateDatabaseSchema() {
    log('\n📊 Database Schema Validation:', 'cyan');
    
    const schemaPath = path.join(__dirname, '../database/clean-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
        log('❌ Clean schema file not found', 'red');
        return false;
    }
    
    log('✅ Clean schema file exists', 'green');
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Check for required tables
    const requiredTables = [
        'users',
        'pantry_items', 
        'recipes',
        'recipe_ingredients',
        'meal_plans',
        'meal_plan_entries',
        'grocery_lists',
        'grocery_list_items',
        'nutrition_info',
        'user_preferences'
    ];
    
    log('\n📋 Checking required tables:');
    requiredTables.forEach(table => {
        if (schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
            log(`   ✅ ${table}`, 'green');
        } else {
            log(`   ❌ ${table}`, 'red');
        }
    });
    
    // Check for test data
    const originalSchemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(originalSchemaPath)) {
        const originalSchema = fs.readFileSync(originalSchemaPath, 'utf8');
        
        if (originalSchema.includes('admin@intelligentkitchen.com')) {
            log('❌ Original schema contains hardcoded test data', 'red');
            log('   Use clean-schema.sql for production', 'yellow');
        } else {
            log('✅ Original schema appears clean', 'green');
        }
    }
    
    return true;
}

function generateConnectionInstructions() {
    log('\n📝 Railway Database Setup Instructions:', 'cyan');
    
    log('\n1. Get Railway Database Credentials:', 'yellow');
    log('   - Go to Railway dashboard');
    log('   - Select your PostgreSQL service');
    log('   - Click "Connect" tab');
    log('   - Copy connection string or individual variables');
    
    log('\n2. Update Environment Variables:', 'yellow');
    log('   Option A - DATABASE_URL:');
    log('   DATABASE_URL=postgresql://username:password@host:port/database');
    log('   Option B - Individual variables:');
    log('   DB_HOST=your-host.railway.app');
    log('   DB_USER=postgres');
    log('   DB_PASSWORD=your-password');
    log('   DB_NAME=railway');
    
    log('\n3. Generate JWT Secret:', 'yellow');
    log('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    
    log('\n4. Apply Database Schema:', 'yellow');
    log('   psql $DATABASE_URL -f database/clean-schema.sql');
    
    log('\n5. Test Connection:', 'yellow');
    log('   node simple-db-check.js');
}

function checkFrontendConfiguration() {
    log('\n🌐 Frontend Configuration Check:', 'cyan');
    
    const frontendEnvPath = path.join(__dirname, '../frontend/.env.example');
    
    if (fs.existsSync(frontendEnvPath)) {
        log('✅ Frontend .env.example exists', 'green');
        
        const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
        
        if (frontendEnv.includes('VITE_API_URL=http://localhost:3001')) {
            log('⚠️  Frontend still points to localhost', 'yellow');
            log('   Update VITE_API_URL for production', 'yellow');
        }
        
        if (frontendEnv.includes('VITE_SPOONACULAR_API_KEY=your-spoonacular-api-key')) {
            log('⚠️  API keys need to be configured', 'yellow');
        }
    } else {
        log('❌ Frontend .env.example not found', 'red');
    }
}

function generateSecureJWT() {
    log('\n🔐 Generate Secure JWT Secret:', 'cyan');
    log('Run this command to generate a secure JWT secret:', 'yellow');
    log('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"', 'bright');
}

function main() {
    log('🚀 Intelligent Kitchen Railway Database Setup', 'bright');
    log('='.repeat(50), 'cyan');
    
    // Check environment setup
    const hasDbConnection = checkEnvironmentVariables();
    
    // Validate schema
    const schemaValid = validateDatabaseSchema();
    
    // Check frontend config
    checkFrontendConfiguration();
    
    // Provide instructions
    if (!hasDbConnection || !schemaValid) {
        generateConnectionInstructions();
        generateSecureJWT();
        
        log('\n❌ Setup Incomplete', 'red');
        log('Please complete the steps above before testing the application.', 'yellow');
        process.exit(1);
    } else {
        log('\n✅ Configuration looks good!', 'green');
        log('You can proceed with testing the database connection.', 'green');
        log('\nNext steps:', 'yellow');
        log('1. Test connection: node simple-db-check.js');
        log('2. Start backend: npm run dev');
        log('3. Start frontend: cd ../frontend && npm run dev');
    }
}

// Run setup check
main().catch(error => {
    log(`\n❌ Setup check failed: ${error.message}`, 'red');
    process.exit(1);
});
