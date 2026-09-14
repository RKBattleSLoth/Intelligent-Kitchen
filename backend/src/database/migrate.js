const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Read schema.sql file
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    try {
      await query(schema);
      console.log('Database migrations completed successfully');
    } catch (error) {
      // If the error is about existing objects, that's okay
      if (error.code === '42710' || error.code === '42P07') {
        console.log('Database schema already exists, skipping migrations...');
      } else {
        throw error;
      }
    }

    // Incremental migrations: the schema block above is skipped entirely once any
    // object exists, so column additions for live databases must be idempotent here.
    await query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS skylight_id BIGINT');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS recipes_skylight_id_key ON recipes (skylight_id)');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations().then(() => process.exit(0));
}

module.exports = { runMigrations };