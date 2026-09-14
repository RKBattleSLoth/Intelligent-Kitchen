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

    // The recipe endpoints write with a hardcoded MVP user ID. Local test runs
    // seed that user, but a fresh production database never did, so every
    // recipe insert failed on recipes_user_id_fkey. Seed it idempotently.
    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name)
       VALUES ('2d4969fe-fedb-4c37-89e2-75eaf6ad61a3', 'mvp-owner@intelligent-kitchen.local',
               '$2b$10$CwTycUXWue0Thq9StjUM0uJ8K3uGNJ4G/2Fne5DE5F.hyp7fZC.W.', 'Kitchen', 'Owner')
       ON CONFLICT (id) DO NOTHING`
    );
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