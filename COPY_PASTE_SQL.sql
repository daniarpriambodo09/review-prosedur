-- ============================================================================
-- COPY & PASTE SQL: Insert PIC Users dari procedure_documents
-- ============================================================================
-- 
-- Cara pakai:
-- 1. Buka terminal
-- 2. psql -U postgres -h localhost procedure_management
-- 3. Copy seluruh query ini dan paste ke psql
-- 4. Enter
-- 5. Done!
--
-- ATAU simpan sebagai file dan jalankan:
-- psql -U postgres -h localhost procedure_management < COPY_PASTE_SQL.sql
--
-- ============================================================================

-- Fungsi untuk hapus prefix angka dari email (123john -> john)
CREATE OR REPLACE FUNCTION remove_numeric_prefix(input_text text)
RETURNS text AS $$
BEGIN
    RETURN REGEXP_REPLACE(input_text, '^[0-9]+', '');
END;
$$ LANGUAGE plpgsql;

-- INSERT PICs dengan email yang sudah dibersihkan
-- Password hash untuk: Pic123456!
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

-- ============================================================================
-- VERIFY: Lihat mapping original PIC ke email yang sudah dibuat
-- ============================================================================

SELECT 
    pd.pic as "Original PIC",
    LOWER(remove_numeric_prefix(pd.pic) || '@jai.co.id') as "Generated Email",
    pu.id as "User ID",
    pu.full_name as "Full Name",
    CASE WHEN pu.is_active THEN 'Active' ELSE 'Inactive' END as "Status"
FROM (
    SELECT DISTINCT pic FROM procedure_documents 
    WHERE pic IS NOT NULL AND TRIM(pic) != '' AND TRIM(pic) != '-'
) pd
LEFT JOIN pic_users pu ON LOWER(remove_numeric_prefix(pd.pic) || '@jai.co.id') = pu.email
ORDER BY pd.pic;

-- ============================================================================
-- VERIFY: Lihat semua PIC yang sudah dibuat
-- ============================================================================

SELECT 
    id,
    email,
    full_name,
    department,
    is_active,
    created_at
FROM pic_users
WHERE email LIKE '%@jai.co.id%'
ORDER BY created_at DESC;

-- ============================================================================
-- SUMMARY STATS
-- ============================================================================

SELECT 
    COUNT(*) as "Total PICs Created",
    COUNT(CASE WHEN is_active THEN 1 END) as "Active PICs",
    MAX(created_at) as "Latest Created"
FROM pic_users
WHERE email LIKE '%@jai.co.id%';
