import pool from './db';

export interface PICActivityLogEntry {
  picId: number;
  activityType: 'login' | 'logout' | 'review' | 'request' | 'document' | 'view' | 'download' | 'approval';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  targetType?: string;
  targetId?: string;
}

export async function logPICActivity(entry: PICActivityLogEntry): Promise<void> {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO pic_activities (
        pic_id, activity_type, description, ip_address, user_agent, target_type, target_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;

    await client.query(query, [
      entry.picId,
      entry.activityType,
      entry.description,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.targetType || null,
      entry.targetId || null,
    ]);
  } catch (error) {
    console.error('[v0] Error logging PIC activity:', error);
    // Don't throw error - logging failures shouldn't break the application
  } finally {
    client.release();
  }
}

export async function getPICActivities(
  picId: number,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT id, activity_type, description, ip_address, user_agent, created_at
      FROM pic_activities
      WHERE pic_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await client.query(query, [picId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('[v0] Error fetching PIC activities:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function getPICActivityStats(picId: number): Promise<any> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM pic_activities
      WHERE pic_id = $1
      GROUP BY activity_type
    `;

    const result = await client.query(query, [picId]);
    
    const stats = {
      totalActivities: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      byType: {},
    };

    result.rows.forEach((row: any) => {
      stats.byType[row.activity_type] = {
        count: parseInt(row.count),
        lastActivity: row.last_activity,
      };
    });

    return stats;
  } catch (error) {
    console.error('[v0] Error fetching PIC activity stats:', error);
    return { totalActivities: 0, byType: {} };
  } finally {
    client.release();
  }
}
