// scripts/update-file-sizes.ts
import { stat } from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';

async function updateFileSizes() {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  try {
    console.log('🔍 Memulai update file sizes...\n');

    // Ambil semua file dari database
    const result = await client.query(
      'SELECT id, file_path, file_name FROM procedure_files ORDER BY id'
    );

    console.log(`Ditemukan ${result.rows.length} record di database\n`);

    for (const row of result.rows) {
      const { id, file_path, file_name } = row;
      
      // Build full path ke file
      // file_path di database: /uploads/documents/BOS-P-01/filename.pdf
      const fullPath = path.join(process.cwd(), 'public', file_path);

      try {
        // Cek apakah file ada dan dapatkan ukuran
        const stats = await stat(fullPath);
        const fileSize = stats.size;

        // Update database
        await client.query(
          'UPDATE procedure_files SET file_size = $1 WHERE id = $2',
          [fileSize, id]
        );

        // Format ukuran untuk log
        const sizeKB = (fileSize / 1024).toFixed(2);
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        console.log(`✓ ${file_name}`);
        console.log(`  Size: ${fileSize} bytes (${sizeKB} KB / ${sizeMB} MB)`);
        
        successCount++;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          console.log(`✗ ${file_name}`);
          console.log(`  Error: File tidak ditemukan`);
          console.log(`  Path: ${fullPath}\n`);
          notFoundCount++;
        } else {
          console.log(`✗ ${file_name}`);
          console.log(`  Error: ${err.message}\n`);
          errorCount++;
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total records: ${result.rows.length}`);
    console.log(`✅ Berhasil: ${successCount}`);
    console.log(`❌ File tidak ditemukan: ${notFoundCount}`);
    console.log(`⚠️  Error lain: ${errorCount}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n✓ File sizes berhasil diupdate!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Jalankan script
updateFileSizes();