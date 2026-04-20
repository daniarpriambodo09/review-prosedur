import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    // Get PIC ID from session/auth header
    // In a real app, this would come from authenticated session
    const picId = request.headers.get('x-pic-id') || '1';

    // Get PIC user info
    const picQuery = 'SELECT id, full_name, email FROM pic_users WHERE id = $1';
    const picResult = await client.query(picQuery, [picId]);
    
    if (picResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'PIC tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get total documents assigned to PIC
    const totalDocsQuery = `
      SELECT COUNT(*) as count FROM pic_documents
      WHERE pic_id = $1
    `;
    const totalDocsResult = await client.query(totalDocsQuery, [picId]);
    const totalDocuments = parseInt(totalDocsResult.rows[0].count);

    // Get pending reviews
    const pendingQuery = `
      SELECT COUNT(*) as count FROM pic_requests
      WHERE pic_id = $1 AND status = 'pending'
    `;
    const pendingResult = await client.query(pendingQuery, [picId]);
    const pendingReview = parseInt(pendingResult.rows[0].count);

    // Get completed reviews
    const completedQuery = `
      SELECT COUNT(*) as count FROM pic_requests
      WHERE pic_id = $1 AND status = 'approved'
    `;
    const completedResult = await client.query(completedQuery, [picId]);
    const completedReview = parseInt(completedResult.rows[0].count);

    // Get total requests
    const totalRequestsQuery = `
      SELECT COUNT(*) as count FROM pic_requests
      WHERE pic_id = $1
    `;
    const totalRequestsResult = await client.query(totalRequestsQuery, [picId]);
    const totalRequests = parseInt(totalRequestsResult.rows[0].count);

    // Get recent documents
    const docsQuery = `
      SELECT id, document_number, title, status, created_at
      FROM pic_documents
      WHERE pic_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const docsResult = await client.query(docsQuery, [picId]);
    const documents = docsResult.rows.map((row: any) => ({
      id: row.id,
      documentNumber: row.document_number,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
    }));

    // Get recent activities
    const activitiesQuery = `
      SELECT id, activity_type, description, created_at
      FROM pic_activities
      WHERE pic_id = $1
      ORDER BY created_at DESC
      LIMIT 15
    `;
    const activitiesResult = await client.query(activitiesQuery, [picId]);
    const activities = activitiesResult.rows.map((row: any) => ({
      id: row.id,
      activityType: row.activity_type,
      description: row.description,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      stats: {
        totalDocuments,
        pendingReview,
        completedReview,
        totalRequests,
      },
      documents,
      activities,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
