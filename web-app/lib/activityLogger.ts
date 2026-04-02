// lib/activityLogger.ts
import { headers } from 'next/headers';

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'upload'
  | 'download'
  | 'review'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'create'
  | 'update';

export interface ActivityLog {
  userId?: number;
  username: string;
  activityType: ActivityType;
  activityDescription: string;
  targetType?: 'procedure' | 'file' | 'review' | 'user';
  targetId?: string;
}

export async function logActivity(log: ActivityLog): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3090'}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: log.userId,
        username: log.username,
        activityType: log.activityType,
        activityDescription: log.activityDescription,
        targetType: log.targetType,
        targetId: log.targetId,
        ipAddress,
        userAgent,
      }),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', await response.text());
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}