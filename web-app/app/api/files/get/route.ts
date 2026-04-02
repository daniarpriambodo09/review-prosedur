// app/api/files/get/route.ts

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

    // Get active file
    const query = `
      SELECT * FROM active_procedure_files
      WHERE nomor_dokumen = $1
    `;

    const result = await client.query(query, [nomorDokumen]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { file: null },
        { status: 200 }
      );
    }

    const file = result.rows[0];

    return NextResponse.json({
      file: {
        id: file.id,
        nomorDokumen: file.nomor_dokumen,
        fileName: file.file_name,
        filePath: file.file_path,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        version: file.version,
        uploadedBy: file.uploaded_by,
        uploadedAt: file.uploaded_at,
      }
    });

  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}