-- ============================================================================
-- STANDALONE QUERY: Insert PIC Users from procedure_documents
-- ============================================================================
-- 
-- Cara menggunakan:
-- 1. Buka terminal
-- 2. Jalankan: psql -U postgres -h localhost procedure_management
-- 3. Copy-paste query di bawah
-- 4. Enter untuk menjalankan
--
-- ATAU jalankan langsung dari terminal:
-- psql -U postgres -h localhost procedure_management < migration/003_insert_pic_standalone.sql
--
-- ============================================================================

-- Step 1: Fungsi untuk menghilangkan prefix angka dari email
-- Input: "123john" -> Output: "john"
CREATE OR REPLACE FUNCTION remove_numeric_prefix(input_text text)
RETURNS text AS $$
BEGIN
    RETURN REGEXP_REPLACE(input_text, '^[0-9]+', '');
END;
$$ LANGUAGE plpgsql;

-- Step 2: Insert PIC users dengan email yang sudah dibersihkan
-- Password: Pic123456! (bcryptjs hash dengan 10 rounds)
-- Mapping: 123john -> john@jai.co.id
INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
SELECT DISTINCT
    -- Email: menghilangkan prefix angka dan menambahkan @jai.co.id
    LOWER(remove_numeric_prefix(pic) || '@jai.co.id') as email,
    
    -- Password hash untuk "Pic123456!" (bcryptjs, 10 rounds)
    '$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2' as password,
    
    -- Full name: capitalize first letter
    INITCAP(TRIM(pic)) as full_name,
    
    -- Department
    'Quality Assurance' as department,
    
    -- Status aktif
    true as is_active,
    
    -- Timestamps
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
    
FROM procedure_documents
WHERE 
    pic IS NOT NULL 
    AND TRIM(pic) != ''
    AND TRIM(pic) != '-'
    AND pic NOT IN (SELECT email FROM pic_users WHERE email LIKE '%@jai.co.id%')
    
ON CONFLICT (email) DO NOTHING;

-- Step 3: Tampilkan mapping dari original PIC ke email yang sudah dibuat
-- Gunakan query ini untuk verifikasi
SELECT 
    pd.pic as "Original PIC",
    LOWER(remove_numeric_prefix(pd.pic) || '@jai.co.id') as "Generated Email",
    pu.id as "PIC User ID",
    pu.full_name as "Full Name",
    CASE WHEN pu.is_active THEN 'Yes' ELSE 'No' END as "Active"
FROM procedure_documents pd
LEFT JOIN pic_users pu ON LOWER(remove_numeric_prefix(pd.pic) || '@jai.co.id') = pu.email
WHERE 
    pd.pic IS NOT NULL 
    AND TRIM(pd.pic) != ''
    AND TRIM(pd.pic) != '-'
GROUP BY pd.pic, pu.id, pu.full_name, pu.is_active
ORDER BY pd.pic;

-- Step 4: Summary - Lihat PICs yang sudah dibuat
-- \echo ''
-- \echo '===== SUMMARY: PIC Users Created ====='
SELECT 
    COUNT(*) as "Total PIC Users",
    COUNT(CASE WHEN is_active THEN 1 END) as "Active",
    COUNT(CASE WHEN NOT is_active THEN 1 END) as "Inactive",
    MAX(created_at) as "Latest Created"
FROM pic_users
WHERE email LIKE '%@jai.co.id%';

-- ============================================================================
-- Untuk verifikasi lebih detail, gunakan query berikut:
-- ============================================================================

-- Lihat semua PIC users yang baru dibuat:
-- SELECT id, email, full_name, department, is_active, created_at 
-- FROM pic_users 
-- WHERE email LIKE '%@jai.co.id%'
-- ORDER BY created_at DESC;

-- Lihat PIC dari procedure_documents yang belum ada di pic_users:
-- SELECT DISTINCT 
--     pic,
--     LOWER(REGEXP_REPLACE(pic, '^[0-9]+', '') || '@jai.co.id') as expected_email
-- FROM procedure_documents pd
-- WHERE pic IS NOT NULL 
--   AND TRIM(pic) != ''
--   AND TRIM(pic) != '-'
--   AND NOT EXISTS (
--       SELECT 1 FROM pic_users pu 
--       WHERE pu.email = LOWER(REGEXP_REPLACE(pd.pic, '^[0-9]+', '') || '@jai.co.id')
--   )
-- ORDER BY pic;

-- ============================================================================
-- PASSWORD INFO:
-- ============================================================================
-- Default Password untuk semua PIC: Pic123456!
-- Password Hash (bcryptjs, 10 rounds):
--   $2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2
--
-- Untuk mengubah password PIC tertentu:
-- UPDATE pic_users 
-- SET password = '$2b$10$NEW_HASH_HERE'
-- WHERE email = 'john@jai.co.id';
-- ============================================================================
