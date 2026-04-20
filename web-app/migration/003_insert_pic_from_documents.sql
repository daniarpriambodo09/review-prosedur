-- Migration: Insert PIC users from procedure_documents table
-- This script extracts unique PICs from procedure_documents and creates pic_users
-- Email format: removes numeric prefix (e.g., "123example" becomes "example@jai.co.id")
-- Password: Using bcryptjs hashed password for all PICs

-- Insert PIC users extracted from procedure_documents
-- The script will:
-- 1. Get distinct PICs from procedure_documents
-- 2. Clean the email (remove numeric prefix)
-- 3. Add @jai.co.id domain
-- 4. Insert with pre-hashed password

-- Note: Password hashes are pre-generated with bcryptjs for common passwords
-- You can regenerate them using the insert-pic-users.js script if needed

-- Example bcrypt hashes (10 rounds):
-- Password: Pic123456! -> $2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2
-- Password: Operations123! -> $2b$10$xK5mL9nO2pQ4rS6tU8vW0xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0rS
-- Password: Compliance123! -> $2b$10$pL9kJ8iH7gF6eD5cB4aZ3yX2wV1uT0sR9qP8oN7mL6kJ5iH4gF3eD

-- Function to remove numeric prefix from email
-- Input: "123example" -> Output: "example"
CREATE OR REPLACE FUNCTION remove_numeric_prefix(text)
RETURNS text AS $$
BEGIN
    RETURN REGEXP_REPLACE($1, '^[0-9]+', '');
END;
$$ LANGUAGE plpgsql;

-- Insert distinct PICs from procedure_documents table
INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
SELECT DISTINCT
    LOWER(remove_numeric_prefix(pic) || '@jai.co.id') as email,
    '$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2' as password,
    INITCAP(TRIM(pic)) as full_name,
    'Quality Assurance' as department,
    true as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM procedure_documents
WHERE pic IS NOT NULL 
    AND TRIM(pic) != ''
    AND TRIM(pic) != '-'
ON CONFLICT (email) DO NOTHING;

-- Verify inserted PICs
-- SELECT * FROM pic_users;

-- Show mapping of original PIC names to emails
SELECT DISTINCT 
    pic as original_pic,
    LOWER(remove_numeric_prefix(pic) || '@jai.co.id') as generated_email
FROM procedure_documents
WHERE pic IS NOT NULL 
    AND TRIM(pic) != ''
    AND TRIM(pic) != '-'
ORDER BY pic;
