-- migration/patches/004_allow_cancelled_acc_status.sql
-- Memperluas check constraint procedure_approval_actions_acc_status_check
-- agar mendukung status 'cancelled' jika di masa depan diperlukan.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'procedure_approval_actions_acc_status_check'
  ) THEN
    ALTER TABLE procedure_approval_actions DROP CONSTRAINT procedure_approval_actions_acc_status_check;
  END IF;

  ALTER TABLE procedure_approval_actions
    ADD CONSTRAINT procedure_approval_actions_acc_status_check
    CHECK (acc_status::text = ANY (ARRAY['pending'::character varying, 'acc'::character varying, 'rejected'::character varying, 'cancelled'::character varying]::text[]));
END $$;
