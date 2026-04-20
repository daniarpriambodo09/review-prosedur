const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procedure_management',
  password: process.env.DB_PASSWORD || 'J41pens123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// PIC Users to insert
const picUsers = [
  {
    email: 'pic.quality@example.com',
    password: 'Pic123456!',
    fullName: 'PIC Quality Assurance',
    department: 'Quality Assurance',
  },
  {
    email: 'pic.operations@example.com',
    password: 'Operations123!',
    fullName: 'PIC Operations',
    department: 'Operations',
  },
  {
    email: 'pic.compliance@example.com',
    password: 'Compliance123!',
    fullName: 'PIC Compliance',
    department: 'Compliance',
  },
];

async function insertPICUsers() {
  const client = await pool.connect();
  
  try {
    console.log('[v0] Starting PIC users insertion...');

    for (const user of picUsers) {
      // Hash password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(user.password, salt);

      const query = `
        INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          password = $2,
          full_name = $3,
          department = $4,
          updated_at = NOW()
        RETURNING id, email, full_name, department;
      `;

      const result = await client.query(query, [
        user.email,
        hashedPassword,
        user.fullName,
        user.department,
      ]);

      console.log(`[v0] ✓ PIC inserted/updated:`, result.rows[0]);
    }

    // Verify all PIC users
    const verifyQuery = 'SELECT id, email, full_name, department, is_active FROM pic_users ORDER BY id;';
    const verifyResult = await client.query(verifyQuery);
    console.log('\n[v0] All PIC users in database:');
    console.table(verifyResult.rows);

    console.log('\n[v0] ✓ PIC users insertion completed successfully!');
  } catch (error) {
    console.error('[v0] Error inserting PIC users:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

insertPICUsers();
