// Simple database connection test without complex dependencies
const http = require('http');

// Function to check environment variables
function checkEnvironmentVariables() {
    console.log('🔍 Checking Environment Variables:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ [SET]' : '❌ [NOT SET]');
    console.log('PGHOST:', process.env.PGHOST || '❌ [NOT SET]');
    console.log('PGPORT:', process.env.PGPORT || '❌ [NOT SET]');
    console.log('PGDATABASE:', process.env.PGDATABASE || '❌ [NOT SET]');
    console.log('PGUSER:', process.env.PGUSER || '❌ [NOT SET]');
    console.log('PGPASSWORD:', process.env.PGPASSWORD ? '✅ [SET]' : '❌ [NOT SET]');
    
    console.log('\n📋 Local Variables:');
    console.log('DB_HOST:', process.env.DB_HOST || '❌ [NOT SET]');
    console.log('DB_PORT:', process.env.DB_PORT || '❌ [NOT SET]');
    console.log('DB_NAME:', process.env.DB_NAME || '❌ [NOT SET]');
    console.log('DB_USER:', process.env.DB_USER || '❌ [NOT SET]');
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ [SET]' : '❌ [NOT SET]');
}

// Function to attempt database connection using different methods
async function testDatabaseConnection() {
    console.log('\n🔌 Testing Database Connections:');
    
    const connectionMethods = [
        {
            name: 'Railway DATABASE_URL',
            test: async () => {
                if (!process.env.DATABASE_URL) {
                    throw new Error('DATABASE_URL not set');
                }
                // Parse connection string to validate format
                const url = process.env.DATABASE_URL;
                if (!url.startsWith('postgresql://')) {
                    throw new Error('Invalid DATABASE_URL format');
                }
                const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
                if (!match) {
                    throw new Error('Cannot parse DATABASE_URL');
                }
                return {
                    host: match[3],
                    port: match[4],
                    database: match[5],
                    user: match[1],
                    password: match[2]
                };
            }
        },
        {
            name: 'Railway Individual Variables',
            test: async () => {
                const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
                for (const varName of required) {
                    if (!process.env[varName]) {
                        throw new Error(`${varName} not set`);
                    }
                }
                return {
                    host: process.env.PGHOST,
                    port: process.env.PGPORT,
                    database: process.env.PGDATABASE,
                    user: process.env.PGUSER,
                    password: process.env.PGPASSWORD
                };
            }
        },
        {
            name: 'Local Configuration',
            test: async () => {
                const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
                for (const varName of required) {
                    if (!process.env[varName]) {
                        throw new Error(`${varName} not set`);
                    }
                }
                return {
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT,
                    database: process.env.DB_NAME,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD
                };
            }
        }
    ];

    for (const method of connectionMethods) {
        try {
            console.log(`\n🔗 Testing ${method.name}:`);
            const config = await method.test();
            console.log('✅ Configuration found:', {
                ...config,
                password: '[REDACTED]'
            });
            
            // Test basic connectivity with HTTP request (if Railway)
            if (config.host && !config.host.includes('localhost') && !config.host.includes('127.0.0.1')) {
                console.log('🌐 Remote database detected - Railway PostgreSQL');
            } else {
                console.log('🏠 Local database configuration');
            }
            
            return config;
            
        } catch (error) {
            console.log(`❌ ${method.name}: ${error.message}`);
        }
    }
    
    throw new Error('No valid database configuration found');
}

// Function to generate updated .env content
function generateEnvConfig(config) {
    console.log('\n📝 Recommended .env Configuration:');
    console.log('```');
    console.log('# Database Configuration');
    
    if (process.env.DATABASE_URL) {
        console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);
    }
    
    console.log(`DB_HOST=${config.host}`);
    console.log(`DB_PORT=${config.port}`);
    console.log(`DB_NAME=${config.database}`);
    console.log(`DB_USER=${config.user}`);
    console.log(`DB_PASSWORD=${config.password}`);
    console.log('```');
    
    return config;
}

// Function to check current schema requirements
function checkSchemaRequirements() {
    console.log('\n📊 Database Schema Requirements Check:');
    console.log('Required tables based on application:');
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
    
    console.log('Tables needed:', requiredTables.join(', '));
    console.log('Total required tables:', requiredTables.length);
    
    return requiredTables;
}

// Main execution
async function main() {
    try {
        console.log('🚀 Intelligent Kitchen Database Configuration Check\n');
        
        // Check environment variables
        checkEnvironmentVariables();
        
        // Test database connections
        const dbConfig = await testDatabaseConnection();
        
        // Generate configuration
        generateEnvConfig(dbConfig);
        
        // Check schema requirements
        const requiredTables = checkSchemaRequirements();
        
        console.log('\n✅ Database Configuration Analysis Complete');
        console.log('\n📋 Next Steps:');
        console.log('1. Update backend/.env with the recommended configuration');
        console.log('2. Run database migrations to create required tables');
        console.log('3. Remove any hardcoded test data');
        console.log('4. Test application connectivity');
        
        return {
            config: dbConfig,
            requiredTables: requiredTables
        };
        
    } catch (error) {
        console.error('\n❌ Database Configuration Check Failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Ensure Railway PostgreSQL service is running');
        console.log('2. Check Railway environment variables are properly set');
        console.log('3. Verify Railway service connectivity');
        console.log('4. Consider using Railway\'s connection string format');
        
        process.exit(1);
    }
}

// Run the check
main().catch(console.error);
