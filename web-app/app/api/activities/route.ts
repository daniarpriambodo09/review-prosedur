// app/api/activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Ambil activity logs terbaru
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const query = `
      SELECT 
        id,
        user_id,
        username,
        activity_type,
        activity_description,
        target_type,
        target_id,
        created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await client.query(query, [limit]);

    const activities = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      activityType: row.activity_type,
      activityDescription: row.activity_description,
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at,
    }));

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST - Log activity baru
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      userId,
      username,
      activityType,
      activityDescription,
      targetType,
      targetId,
      ipAddress,
      userAgent,
    } = body;

    if (!username || !activityType || !activityDescription) {
      return NextResponse.json(
        { error: 'Username, activityType, and activityDescription are required' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO activity_logs
      (user_id, username, activity_type, activity_description, target_type, target_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await client.query(query, [
      userId || null,
      username,
      activityType,
      activityDescription,
      targetType || null,
      targetId || null,
      ipAddress || null,
      userAgent || null,
    ]);

    return NextResponse.json({
      success: true,
      activity: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}