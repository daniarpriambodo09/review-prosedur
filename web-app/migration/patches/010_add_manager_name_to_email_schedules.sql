-- 010_add_manager_name_to_email_schedules.sql
-- Menambahkan kolom manager_name di email_schedules untuk mencatat nama manager
-- yang ditargetkan pada eskalasi review tahap 2.

ALTER TABLE email_schedules ADD COLUMN IF NOT EXISTS manager_name TEXT;
