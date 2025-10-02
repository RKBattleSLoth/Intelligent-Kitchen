const { Pool } = require('pg');
require('dotenv').config();

async function checkDatabase() {
    console.log('Checking database connection...');
    
    // Try different connection methods
    const configs = [
        // Railway environment variables
        {
            name: 'Railway DATABASE_URL',
            connectionString: process.env.DATABASE_URL
        },
        // Individual Railway variables
        {
            name: 'Railway Individual',
            host: process.env.PGHOST,
            port: process.env.PGPORT,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD
        },
        // Local fallback
        {
            name: 'Local Fallback',
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        }
    ];

    for (const config of configs) {
        try {
            console.log(`\nTrying connection: ${config.name}`);
            console.log('Config:', {
                ...config,
                password: config.password ? '[REDACTED]' : 'NOT_SET',
                connectionString: config.connectionString ? '[REDACTED]' : 'NOT_SET'
            });
            
            const pool = new Pool(config);
            const client = await pool.connect();
            
            console.log('✅ Connection successful!');
            
            // Check database info
            const dbInfo = await client.query('SELECT version()');
            console.log('Database version:', dbInfo.rows[0].version.split(' ')[1]);
            
            // List tables
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            console.log('Tables:', tables.rows.map(row => row.table_name).join(', '));
            
            // Check users table
            if (tables.rows.some(row => row.table_name === 'users')) {
                const userCount = await client.query('SELECT COUNT(*) as count FROM users');
                console.log('Users count:', userCount.rows[0].count);
                
                // Check for hardcoded admin user
                const adminUser = await client.query("SELECT * FROM users WHERE email = 'admin@intelligentkitchen.com'");
                if (adminUser.rows.length > 0) {
                    console.log('⚠️  Found hardcoded admin user - should be removed!');
                }
            }
            
            client.release();
            await pool.end();
            
            return config; // Return the successful config
            
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
        }
    }
    
    throw new Error('No database connection could be established');
}

// Check environment variables
console.log('Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log('PGHOST:', process.env.PGHOST || '[NOT SET]');
console.log('PGPORT:', process.env.PGPORT || '[NOT SET]');
console.log('PGDATABASE:', process.env.PGDATABASE || '[NOT SET]');
console.log('PGUSER:', process.env.PGUSER || '[NOT SET]');
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '[SET]' : '[NOT SET]');

checkDatabase()
    .then(successfulConfig => {
        console.log('\n✅ Database check completed successfully');
        console.log('Successful config:', successfulConfig.name);
        
        // Generate updated .env content
        console.log('\n📝 Recommended .env updates:');
        if (successfulConfig.connectionString) {
            console.log('DATABASE_URL=' + successfulConfig.connectionString);
        } else {
            console.log(`DB_HOST=${successfulConfig.host}`);
            console.log(`DB_PORT=${successfulConfig.port}`);
            console.log(`DB_NAME=${successfulConfig.database}`);
            console.log(`DB_USER=${successfulConfig.user}`);
            console.log(`DB_PASSWORD=${successfulConfig.password}`);
        }
    })
    .catch(error => {
        console.error('\n❌ Database check failed:', error.message);
        process.exit(1);
    });
