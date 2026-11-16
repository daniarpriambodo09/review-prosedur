-- Patch 009: Add ON UPDATE CASCADE for staff_directory foreign keys
ALTER TABLE department_managers DROP CONSTRAINT IF EXISTS department_managers_manager_kode_fkey;
ALTER TABLE department_managers ADD CONSTRAINT department_managers_manager_kode_fkey 
  FOREIGN KEY (manager_kode) REFERENCES staff_directory(kode) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE staff_sections DROP CONSTRAINT IF EXISTS staff_sections_staff_kode_fkey;
ALTER TABLE staff_sections ADD CONSTRAINT staff_sections_staff_kode_fkey 
  FOREIGN KEY (staff_kode) REFERENCES staff_directory(kode) ON DELETE CASCADE ON UPDATE CASCADE;

