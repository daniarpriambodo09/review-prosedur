-- Patch V27: Perbaikan kolom status panjang dan approval date nullable
-- Jalankan query ini di database procedure_management pada laptop server (via pgAdmin / psql)

-- 1. Perlebar dan perbaiki tabel arsip_prosedur
ALTER TABLE arsip_prosedur ALTER COLUMN status TYPE character varying(100);
ALTER TABLE arsip_prosedur ALTER COLUMN revisi TYPE character varying(100);
ALTER TABLE arsip_prosedur ALTER COLUMN level_dokumen TYPE character varying(100);
ALTER TABLE arsip_prosedur ALTER COLUMN nomor_dokumen TYPE character varying(255);
ALTER TABLE arsip_prosedur ALTER COLUMN owner TYPE character varying(255);
ALTER TABLE arsip_prosedur ALTER COLUMN tanggal_selesai_approval DROP NOT NULL;

-- 2. Perlebar dan perbaiki tabel procedure_documents
ALTER TABLE procedure_documents ALTER COLUMN status TYPE character varying(100);
ALTER TABLE procedure_documents ALTER COLUMN revisi TYPE character varying(100);
ALTER TABLE procedure_documents ALTER COLUMN tanggal_selesai_approval DROP NOT NULL;
