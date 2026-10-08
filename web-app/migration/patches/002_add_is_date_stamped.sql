-- migration/patches/002_add_is_date_stamped.sql
ALTER TABLE procedure_documents 
ADD COLUMN IF NOT EXISTS is_date_stamped BOOLEAN DEFAULT FALSE;
