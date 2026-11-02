-- migration/patches/008_add_date_stamp_meta.sql
-- Menyimpan metadata posisi bounding box, halaman, dan teks cap tanggal selesai approval
-- sehingga admin dapat mengedit letak tanggal yang keliru dengan mudah.

ALTER TABLE procedure_documents 
ADD COLUMN IF NOT EXISTS date_stamp_meta JSONB;

-- Sinkronisasi tanggal_selesai_approval untuk dokumen yang sudah selesai siklus approval-nya
-- agar otomatis menggunakan tanggal selesai approval (completed_at)
UPDATE procedure_documents pd
SET tanggal_selesai_approval = pac.completed_at::date
FROM (
  SELECT DISTINCT ON (nomor_dokumen) nomor_dokumen, completed_at
  FROM procedure_approval_cycles
  WHERE status = 'completed' AND completed_at IS NOT NULL
  ORDER BY nomor_dokumen, id DESC
) pac
WHERE pd.nomor_dokumen = pac.nomor_dokumen
  AND pd.status = 'Relevan'
  AND (pd.is_date_stamped IS FALSE OR pd.is_date_stamped IS NULL);
