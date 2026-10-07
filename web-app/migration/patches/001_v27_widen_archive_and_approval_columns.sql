-- 001_v27_widen_archive_and_approval_columns.sql
-- Pelebaran kolom status, revisi, owner, nomor_dokumen dan drop NOT NULL tanggal_selesai_approval

-- 1. Tabel arsip_prosedur
ALTER TABLE arsip_prosedur ALTER COLUMN status TYPE character varying(100);
ALTER TABLE arsip_prosedur ALTER COLUMN revisi TYPE character varying(100);
ALTER TABLE arsip_prosedur ALTER COLUMN level_dokumen TYPE character varying(100);
ALTER TABLE arsip_prosedur ALTER COLUMN nomor_dokumen TYPE character varying(255);
ALTER TABLE arsip_prosedur ALTER COLUMN owner TYPE character varying(255);
ALTER TABLE arsip_prosedur ALTER COLUMN tanggal_selesai_approval DROP NOT NULL;

-- 2. Tabel procedure_documents
ALTER TABLE procedure_documents ALTER COLUMN status TYPE character varying(100);
ALTER TABLE procedure_documents ALTER COLUMN revisi TYPE character varying(100);
ALTER TABLE procedure_documents ALTER COLUMN tanggal_selesai_approval DROP NOT NULL;
