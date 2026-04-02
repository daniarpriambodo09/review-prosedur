// app/api/files/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumen = searchParams.get('nomorDokumen');

    if (!nomorDokumen) {
      return NextResponse.json(
        { error: 'Nomor dokumen is required' },
        { status: 400 }
      );
    }

    // Get all versions
    const query = `
      SELECT * FROM procedure_files
      WHERE nomor_dokumen = $1
      ORDER BY version DESC, uploaded_at DESC
    `;

    const result = await client.query(query, [nomorDokumen]);

    const files = result.rows.map(file => ({
      id: file.id,
      nomorDokumen: file.nomor_dokumen,
      fileName: file.file_name,
      filePath: file.file_path,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      version: file.version,
      isActive: file.is_active,
      uploadedBy: file.uploaded_by,
      uploadedAt: file.uploaded_at,
    }));

    return NextResponse.json({ files });

  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}