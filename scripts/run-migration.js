const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procedure_management',
  password: process.env.DB_PASSWORD || 'J41pens123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('[v0] Starting migration...');
    
    const migrationFile = path.join(__dirname, '..', 'web-app', 'migration', '001_add_pic_tables.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    await client.query(sql);
    console.log('[v0] Migration completed successfully!');
  } catch (error) {
    console.error('[v0] Migration error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
