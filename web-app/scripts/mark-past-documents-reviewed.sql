-- scripts/mark-past-documents-reviewed.sql
--
-- Query ini digunakan untuk menyelaraskan data di PostgreSQL server:
-- Dokumen sebelum tanggal 21 September 2026 (atau sebelum periode 1 Oktober 2026)
-- yang berstatus 'Relevan', 'Revisi', atau 'Obsolete' namun kolom last_reviewed_at masih NULL
-- akan diisi dengan tanggal approval dokumen tersebut (atau default 20 September 2026).
--
-- Cara menjalankan di server (pilih salah satu):
-- 1. Lewat psql:
--    psql -U postgres -d procedure_management -f scripts/mark-past-documents-reviewed.sql
-- 2. Lewat pgAdmin / DBeaver:
--    Copy & paste query di bawah lalu jalankan (Execute / F5).

UPDATE procedure_documents
SET last_reviewed_at = COALESCE(tanggal_selesai_approval, '2026-09-20 08:00:00'::timestamp)
WHERE (tanggal_selesai_approval < '2026-09-21' OR tanggal_selesai_approval IS NULL)
  AND status IN ('Relevan', 'Revisi', 'Obsolete')
  AND last_reviewed_at IS NULL;
