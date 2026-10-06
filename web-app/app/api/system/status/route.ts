import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbLatencyMs = 0;
  let totalProcedures = 0;
  let totalUsers = 0;
  let schedulerStatus: {
    serviceName: string;
    isOnline: boolean;
    status: string;
    lastHeartbeat: string | null;
    lastError: string | null;
    minutesSinceHeartbeat: number | null;
  } = {
    serviceName: 'email-scheduler',
    isOnline: false,
    status: 'UNKNOWN',
    lastHeartbeat: null,
    lastError: null,
    minutesSinceHeartbeat: null,
  };

  // 1. Cek Koneksi PostgreSQL
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time, COUNT(*) as count FROM procedure_documents');
    dbLatencyMs = Date.now() - startTime;
    dbStatus = 'connected';
    totalProcedures = parseInt(dbRes.rows[0]?.count || '0');

    const userRes = await pool.query('SELECT COUNT(*) as count FROM users');
    totalUsers = parseInt(userRes.rows[0]?.count || '0');

    // Pastikan tabel system_heartbeats ada
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_heartbeats (
        service_name VARCHAR(100) PRIMARY KEY,
        last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50),
        last_error TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Ambil data Heartbeat Scheduler
    const heartbeatRes = await pool.query(
      `SELECT service_name, last_heartbeat, status, last_error,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_heartbeat)) / 60 AS minutes_ago
       FROM system_heartbeats
       WHERE service_name = 'email-scheduler'
       LIMIT 1;`
    );

    if (heartbeatRes.rows.length > 0) {
      const row = heartbeatRes.rows[0];
      const minutesAgo = parseFloat(row.minutes_ago ?? '999');
      // Bila heartbeat dalam 5 menit terakhir -> Online (karena scheduler jalan tiap 2 menit)
      const isOnline = minutesAgo <= 5;

      schedulerStatus = {
        serviceName: row.service_name,
        isOnline,
        status: isOnline ? (row.status || 'RUNNING') : 'OFFLINE',
        lastHeartbeat: row.last_heartbeat ? new Date(row.last_heartbeat).toISOString() : null,
        lastError: row.last_error || null,
        minutesSinceHeartbeat: Math.round(minutesAgo * 10) / 10,
      };
    } else {
      schedulerStatus.status = 'NOT_REGISTERED';
    }
  } catch (error: any) {
    console.error('Database health check failed:', error);
    dbStatus = 'disconnected';
  }

  // 3. Status Web Server (Node.js / Next.js)
  const serverUptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      allHealthy: dbStatus === 'connected' && schedulerStatus.isOnline,
      webServer: {
        status: 'online',
        uptimeSeconds: serverUptimeSeconds,
        nodeVersion: process.version,
        port: process.env.PORT || '3090',
        memoryHeapUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        databaseName: process.env.DB_NAME || 'procedure_management',
        host: process.env.DB_HOST || 'localhost',
        totalProcedures,
        totalUsers,
      },
      emailScheduler: schedulerStatus,
    },
  });
}
