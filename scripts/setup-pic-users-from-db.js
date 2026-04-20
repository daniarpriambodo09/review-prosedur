#!/usr/bin/env node

/**
 * Script untuk setup PIC users dari data yang ada di procedure_documents
 * 
 * Usage:
 *   node setup-pic-users-from-db.js
 * 
 * Function:
 *   1. Membaca distinct PIC dari procedure_documents
 *   2. Membersihkan email (menghilangkan prefix angka)
 *   3. Generate password hash dengan bcryptjs
 *   4. Insert ke tabel pic_users
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuration
const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procedure_management',
  password: process.env.DB_PASSWORD || 'J41pens123',
  port: parseInt(process.env.DB_PORT || '5432'),
};

const PASSWORD = 'Pic123456!'; // Default password for all PICs
const SALT_ROUNDS = 10;

// Utility function to remove numeric prefix
function removeNumericPrefix(text) {
  return text.replace(/^[0-9]+/, '');
}

// Main function
async function setupPICUsers() {
  const pool = new Pool(DB_CONFIG);
  const client = await pool.connect();

  try {
    console.log('[v0] Starting PIC users setup...\n');

    // Step 1: Get distinct PICs from procedure_documents
    console.log('[v0] Step 1: Fetching distinct PICs from procedure_documents...');
    const picResult = await client.query(`
      SELECT DISTINCT pic 
      FROM procedure_documents
      WHERE pic IS NOT NULL 
        AND TRIM(pic) != ''
        AND TRIM(pic) != '-'
      ORDER BY pic
    `);

    const pics = picResult.rows.map(row => row.pic);
    console.log(`[v0] Found ${pics.length} unique PICs\n`);

    if (pics.length === 0) {
      console.log('[v0] No PICs found in database. Exiting.');
      client.release();
      await pool.end();
      return;
    }

    // Step 2: Generate password hash
    console.log(`[v0] Step 2: Generating bcryptjs hash for password "${PASSWORD}"...`);
    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
    console.log(`[v0] Password hash generated: ${passwordHash}\n`);

    // Step 3: Prepare insert data
    console.log('[v0] Step 3: Preparing PIC user data...');
    const picUsers = pics.map(pic => {
      const cleanedEmail = removeNumericPrefix(pic);
      const email = `${cleanedEmail.toLowerCase()}@jai.co.id`;
      const fullName = pic.charAt(0).toUpperCase() + pic.slice(1).toLowerCase();

      return {
        originalPic: pic,
        email: email,
        password: passwordHash,
        fullName: fullName,
      };
    });

    // Step 4: Display mapping
    console.log('[v0] Email Mapping:\n');
    console.log('Original PIC'.padEnd(25) + '→'.padEnd(5) + 'Email');
    console.log('─'.repeat(60));
    picUsers.forEach(user => {
      console.log(
        user.originalPic.padEnd(25) +
        '→'.padEnd(5) +
        user.email
      );
    });
    console.log();

    // Step 5: Insert to pic_users table
    console.log('[v0] Step 5: Inserting PIC users to database...\n');

    let insertedCount = 0;
    let skippedCount = 0;

    for (const user of picUsers) {
      try {
        const result = await client.query(
          `INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (email) DO NOTHING
           RETURNING id, email`,
          [user.email, user.password, user.fullName, 'Quality Assurance', true]
        );

        if (result.rows.length > 0) {
          console.log(`[v0] ✓ Inserted: ${user.email} (ID: ${result.rows[0].id})`);
          insertedCount++;
        } else {
          console.log(`[v0] ⊘ Skipped: ${user.email} (already exists)`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`[v0] ✗ Error inserting ${user.email}:`, error.message);
      }
    }

    // Step 6: Verify
    console.log('\n[v0] Step 6: Verifying inserted data...');
    const verifyResult = await client.query(`
      SELECT id, email, full_name, is_active, created_at 
      FROM pic_users 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    console.log(`\n[v0] Current PIC users in database (latest 20):\n`);
    console.log('ID'.padEnd(5) + 'Email'.padEnd(30) + 'Full Name'.padEnd(25) + 'Active');
    console.log('─'.repeat(70));
    verifyResult.rows.forEach(row => {
      console.log(
        String(row.id).padEnd(5) +
        row.email.padEnd(30) +
        row.full_name.padEnd(25) +
        (row.is_active ? 'Yes' : 'No')
      );
    });

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('[v0] Setup Summary:');
    console.log('  • Total PICs found: ' + pics.length);
    console.log('  • Inserted: ' + insertedCount);
    console.log('  • Skipped (already exists): ' + skippedCount);
    console.log('  • Default password: ' + PASSWORD);
    console.log('═'.repeat(70) + '\n');

    console.log('[v0] ✓ PIC users setup completed successfully!\n');
    console.log('[v0] PICs can now login at /pic-login with:');
    console.log('  • Email: [their email]@jai.co.id');
    console.log('  • Password: ' + PASSWORD + '\n');

  } catch (error) {
    console.error('[v0] Error during PIC setup:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
setupPICUsers().catch(error => {
  console.error('[v0] Fatal error:', error);
  process.exit(1);
});
