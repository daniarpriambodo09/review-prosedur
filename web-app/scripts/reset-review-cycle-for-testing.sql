-- scripts/reset-review-cycle-for-testing.sql
--
-- RESET TOTAL untuk keperluan testing ulang alur review/reminder dari nol.
-- SEMUA dokumen di procedure_documents akan kembali ke status 'Relevan',
-- dan seluruh jadwal email (kolom "Jadwal Email" di admin) dikosongkan.
--
-- ⚠️  JANGAN dijalankan di database PRODUKSI — ini akan menghapus SEMUA
--     riwayat pengiriman email & hasil review yang sudah pernah masuk.
--     Cocok dipakai di environment testing/development saja.
--
-- Cakupan:
--   1. procedure_documents.status -> 'Relevan' (SEMUA baris, tanpa terkecuali)
--   2. last_reviewed_at & review_seen_at -> NULL (hapus badge "Baru Direview")
--   3. email_schedules -> dikosongkan total (PIC & manager schedule hilang)
--   4. document_reviews -> dikosongkan total (PENTING: kalau tidak dibersihkan,
--      begitu status balik ke 'Relevan', halaman admin bisa MENIMPA BALIK
--      status itu dengan data review bulan ini yang masih tersimpan di sini)
--
-- TIDAK disentuh (fitur terpisah, bukan bagian dari alur reminder PIC/Manager):
--   - procedure_approval_cycles, procedure_approval_actions (alur Prepared/
--     Checked/Approved)
--   - Dokumen yang statusnya 'Menunggu ACC Prepared/Checked/Approved' atau
--     'Ditolak' AKAN IKUT di-reset ke 'Relevan' oleh script ini (karena kamu
--     minta "semua dokumen"), TAPI baris procedure_approval_cycles/actions
--     terkait TIDAK ikut dihapus -> data itu jadi "yatim" (tidak konsisten
--     dengan status dokumen). Kalau kamu TIDAK mau dokumen dengan status ACC
--     ikut ter-reset, lihat versi WHERE opsional di LANGKAH 1 di bawah.
--
-- Cara pakai:
--   psql "postgresql://user:pass@host:5432/procedure_management" -f reset-review-cycle-for-testing.sql

-- ── LANGKAH 0 (opsional): PREVIEW dulu sebelum eksekusi ────────────────────
-- SELECT status, COUNT(*) FROM procedure_documents GROUP BY status ORDER BY 2 DESC;
-- SELECT COUNT(*) FROM email_schedules;
-- SELECT COUNT(*) FROM document_reviews;

BEGIN;

-- ── LANGKAH 1: reset status semua dokumen ke 'Relevan' ─────────────────────
UPDATE procedure_documents
SET status           = 'Relevan',
    last_reviewed_at = NULL,
    review_seen_at   = NULL,
    updated_at       = CURRENT_TIMESTAMP;

-- Kalau kamu MAU KECUALIKAN dokumen yang sedang dalam alur ACC (Prepared/
-- Checked/Approved/Ditolak) supaya tidak ikut ke-reset, KOMENTARI blok
-- UPDATE di atas dan pakai versi ini sebagai gantinya:
--
-- UPDATE procedure_documents
-- SET status           = 'Relevan',
--     last_reviewed_at = NULL,
--     review_seen_at   = NULL,
--     updated_at       = CURRENT_TIMESTAMP
-- WHERE status NOT IN (
--   'Menunggu ACC Prepared', 'Menunggu ACC Checked', 'Menunggu ACC Approved', 'Ditolak'
-- );

-- ── LANGKAH 2: kosongkan seluruh jadwal email ───────────────────────────────
TRUNCATE TABLE email_schedules RESTART IDENTITY;

-- ── LANGKAH 3: kosongkan riwayat review bulanan (cegah overlay balik) ──────
TRUNCATE TABLE document_reviews RESTART IDENTITY;

COMMIT;

-- ── LANGKAH 4: verifikasi hasil ─────────────────────────────────────────────
SELECT status, COUNT(*) FROM procedure_documents GROUP BY status ORDER BY 2 DESC;
SELECT COUNT(*) AS sisa_email_schedules FROM email_schedules;
SELECT COUNT(*) AS sisa_document_reviews FROM document_reviews;