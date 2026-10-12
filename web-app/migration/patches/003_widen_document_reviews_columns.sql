-- migration/patches/003_widen_document_reviews_columns.sql
-- Pelebaran kolom status dan revisi pada document_reviews agar menampung status panjang
-- seperti 'Menunggu Setting Approver' (25 karakter) dan revisi panjang.
-- Serta pelebaran kolom terkait lainnya untuk mencegah error 'value too long for type character varying'.

-- 1. Tabel document_reviews
ALTER TABLE document_reviews ALTER COLUMN status TYPE character varying(100);
ALTER TABLE document_reviews ALTER COLUMN revisi TYPE character varying(100);

-- 2. Tabel procedure_revision_notes
ALTER TABLE procedure_revision_notes ALTER COLUMN rev_no TYPE character varying(100);

-- 3. Tabel procedure_approval_cycles & actions
ALTER TABLE procedure_approval_cycles ALTER COLUMN current_stage TYPE character varying(50);
ALTER TABLE procedure_approval_cycles ALTER COLUMN status TYPE character varying(50);
ALTER TABLE procedure_approval_actions ALTER COLUMN role TYPE character varying(50);
ALTER TABLE procedure_approval_actions ALTER COLUMN acc_status TYPE character varying(50);
