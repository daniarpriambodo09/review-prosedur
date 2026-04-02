import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nomorDokumen = formData.get('nomorDokumen') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !nomorDokumen) {
      return NextResponse.json(
        { error: 'File dan nomor dokumen harus diisi' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Hanya file PDF yang diperbolehkan' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      );
    }

    const checkQuery = 'SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1';
    const checkResult = await client.query(checkQuery, [nomorDokumen]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nomor dokumen tidak ditemukan' },
        { status: 404 }
      );
    }

    await client.query('BEGIN');

    // Get current version
    const versionQuery = `
      SELECT COALESCE(MAX(version), 0) + 1 as next_version
      FROM procedure_files
      WHERE nomor_dokumen = $1
    `;
    const versionResult = await client.query(versionQuery, [nomorDokumen]);
    const nextVersion = versionResult.rows[0].next_version;

    // Deactivate previous files
    await client.query(
      'UPDATE procedure_files SET is_active = false WHERE nomor_dokumen = $1',
      [nomorDokumen]
    );

    // ✅ SIMPAN NAMA FILE ASLI (dengan .pdf)
    const originalFileName = file.name.endsWith('.pdf') 
      ? file.name 
      : `${file.name}.pdf`;

    // Generate filename untuk file di disk (dengan versioning)
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = originalFileName
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.pdf$/i, '');
    const diskFileName = `v${nextVersion}_${nomorDokumen}_${sanitizedName}_${timestamp}.pdf`;

    // Create directory if not exists
    const docDir = path.join(UPLOAD_DIR, nomorDokumen);
    if (!existsSync(docDir)) {
      await mkdir(docDir, { recursive: true });
    }

    // Save file dengan nama versioned di disk
    const filePath = path.join(docDir, diskFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // ✅ Path di database pointing ke file versioned
    const dbPath = `/uploads/documents/${nomorDokumen}/${diskFileName}`;

    let namaDokumen = nomorDokumen; // Fallback ke nomor jika tidak ditemukan
    if (checkResult.rows.length > 0) {
      namaDokumen = checkResult.rows[0].nama_dokumen;
    }
    
    // ✅ Insert dengan nama file asli di kolom file_name
    const insertQuery = `
      INSERT INTO procedure_files
      (nomor_dokumen, file_name, file_path, file_size, mime_type, version, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      nomorDokumen,
      originalFileName, // ✅ NAMA ASLI untuk display
      dbPath,           // ✅ PATH ke file versioned di disk
      file.size,
      file.type,
      nextVersion,
      uploadedBy || 'admin'
    ]);

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      username: uploadedBy || 'admin',
      activityType: 'upload',
      activityDescription: `Upload file ${originalFileName} untuk ${namaDokumen}`,
      targetType: 'file',
      targetId: nomorDokumen,
    });

    return NextResponse.json({
      success: true,
      file: {
        id: result.rows[0].id,
        fileName: result.rows[0].file_name,      // ✅ Nama asli
        filePath: result.rows[0].file_path,      // ✅ Path versioned
        fileSize: result.rows[0].file_size,
        version: result.rows[0].version,
        uploadedAt: result.rows[0].uploaded_at,
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Gagal mengupload file' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}