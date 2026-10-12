const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'procedure_management',
  password: '12345678',
  port: 5432,
});

async function main() {
  const apprs = await pool.query('SELECT * FROM procedure_approvers WHERE nomor_dokumen = \'TEST - V1\'');
  console.log('TEST - V1 procedure_approvers:', apprs.rows);
  const user = await pool.query("SELECT * FROM pic_users WHERE email LIKE '%daniar%' OR email LIKE '%dp%'");
  console.log('pic_users for Daniar:', user.rows.map(u => ({ id: u.id, email: u.email, full_name: u.full_name, department: u.department })));
  await pool.end();
}

main().catch(console.error);
