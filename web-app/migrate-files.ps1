# Script untuk migrate dokumen ke folder public
# Jalankan dari root folder projek

$ErrorActionPreference = "Stop"

# Paths
$SOURCE_DIR = "data\Dokumen"
$DEST_DIR = "public\uploads\documents"

# Buat folder destination jika belum ada
New-Item -ItemType Directory -Force -Path $DEST_DIR | Out-Null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MIGRASI DOKUMEN PDF" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ambil semua file PDF
$pdfFiles = Get-ChildItem -Path $SOURCE_DIR -Filter "*.pdf" -File
$totalFiles = $pdfFiles.Count
$successCount = 0
$skipCount = 0

Write-Host "Ditemukan $totalFiles file PDF" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $pdfFiles) {
    $fileName = $file.Name
    
    # Extract nomor dokumen dari nama file
    # Pattern: BOS-P-01, BPR-W-03, CDC-W-01, dll
    if ($fileName -match "^([A-Z]+-[A-Z]-\d+)") {
        $nomorDokumen = $matches[1]
        $destFolder = Join-Path $DEST_DIR $nomorDokumen
        
        # Buat folder untuk dokumen ini
        New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
        
        # Copy file
        $destPath = Join-Path $destFolder $fileName
        Copy-Item -Path $file.FullName -Destination $destPath -Force
        
        Write-Host "✓ $fileName -> $nomorDokumen" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "✗ SKIP: $fileName (tidak ada nomor dokumen)" -ForegroundColor Red
        $skipCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MIGRASI SELESAI!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total file: $totalFiles" -ForegroundColor White
Write-Host "Berhasil: $successCount" -ForegroundColor Green
Write-Host "Dilewati: $skipCount" -ForegroundColor Yellow
Write-Host ""

# Update database dengan path yang benar
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UPDATE DATABASE PATH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buat script SQL untuk update
$sqlFile = "update_file_paths.sql"
$sqlContent = @"
-- Update file paths di database
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

"@

foreach ($file in $pdfFiles) {
    $fileName = $file.Name
    
    if ($fileName -match "^([A-Z]+-[A-Z]-\d+)") {
        $nomorDokumen = $matches[1]
        $newPath = "/uploads/documents/$nomorDokumen/$fileName"
        
        $sqlContent += "UPDATE procedure_files SET file_path = '$newPath' WHERE nomor_dokumen = '$nomorDokumen' AND file_name = '$fileName';`n"
    }
}

# Simpan SQL ke file
$sqlContent | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "✓ File SQL dibuat: $sqlFile" -ForegroundColor Green
Write-Host ""
Write-Host "Jalankan SQL berikut di PostgreSQL:" -ForegroundColor Yellow
Write-Host "  psql -U postgres -d procedure_management -f $sqlFile" -ForegroundColor White
Write-Host ""
Write-Host "Atau copy-paste isi file $sqlFile ke pgAdmin" -ForegroundColor Yellow
Write-Host ""