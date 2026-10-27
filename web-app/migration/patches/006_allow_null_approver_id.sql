-- migration/patches/006_allow_null_approver_id.sql
-- Mengizinkan approver_id NULL di procedure_approval_actions
-- agar riwayat approval/rejection tetap tersimpan saat approver dihapus/diganti.

ALTER TABLE procedure_approval_actions
  ALTER COLUMN approver_id DROP NOT NULL;
