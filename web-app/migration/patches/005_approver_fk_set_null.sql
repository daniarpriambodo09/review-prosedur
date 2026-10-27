-- migration/patches/005_approver_fk_set_null.sql
-- Ubah FK procedure_approval_actions.approver_id dari ON DELETE CASCADE
-- ke ON DELETE SET NULL, agar riwayat penolakan (rejected actions) tidak
-- ikut terhapus saat approver dihapus/diganti dari procedure_approvers.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'procedure_approval_actions_approver_id_fkey'
  ) THEN
    ALTER TABLE procedure_approval_actions
      DROP CONSTRAINT procedure_approval_actions_approver_id_fkey;
  END IF;

  ALTER TABLE procedure_approval_actions
    ADD CONSTRAINT procedure_approval_actions_approver_id_fkey
    FOREIGN KEY (approver_id) REFERENCES procedure_approvers(id) ON DELETE SET NULL;
END $$;
