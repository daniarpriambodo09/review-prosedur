// lib/db.ts

import { Pool } from 'pg';

// Buat connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procedure_management',
  password: process.env.DB_PASSWORD || 'J41pens123',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
  pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'Asia/Jakarta'").catch(() => { });
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
  });

  export function formatTimestampLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  export default pool;