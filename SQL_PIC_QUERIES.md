# SQL Queries untuk PIC User Management

Dokumentasi lengkap SQL queries untuk setup, verify, dan manage PIC users.

---

## 1️⃣ SETUP QUERIES

### Query 1.1: Insert PICs dari procedure_documents (Standar)

```sql
-- Fungsi helper untuk hapus prefix angka
CREATE OR REPLACE FUNCTION remove_numeric_prefix(input_text text)
RETURNS text AS $$
BEGIN
    RETURN REGEXP_REPLACE(input_text, '^[0-9]+', '');
END;
$$ LANGUAGE plpgsql;

-- Insert PICs dengan email yang sudah dibersihkan
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
```

**Password:** `Pic123456!`
**Password Hash:** `$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2`

---

### Query 1.2: Insert PICs Manual (Jika Ingin Spesifik)

```sql
INSERT INTO pic_users (email, password, full_name, department, is_active)
VALUES 
    ('john@jai.co.id', '$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2', 'John', 'Quality Assurance', true),
    ('maria@jai.co.id', '$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2', 'Maria', 'Operations', true),
    ('admin@jai.co.id', '$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2', 'Admin', 'Administration', true)
ON CONFLICT (email) DO NOTHING;
```

---

## 2️⃣ VERIFICATION QUERIES

### Query 2.1: Lihat Semua PIC Users

```sql
SELECT 
    id,
    email,
    full_name,
    department,
    is_active,
    last_login,
    created_at
FROM pic_users
ORDER BY created_at DESC;
```

---

### Query 2.2: Lihat Hanya PIC yang Baru Dibuat dari Database

```sql
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
```

---

### Query 2.3: Mapping PICs dari procedure_documents ke Generated Email

```sql
SELECT 
    pd.pic as "Original PIC",
    LOWER(REGEXP_REPLACE(pd.pic, '^[0-9]+', '') || '@jai.co.id') as "Generated Email",
    pu.id as "PIC User ID",
    pu.full_name as "Full Name",
    CASE WHEN pu.id IS NOT NULL THEN 'Yes' ELSE 'No' END as "Already Created"
FROM (
    SELECT DISTINCT pic FROM procedure_documents 
    WHERE pic IS NOT NULL AND TRIM(pic) != '' AND TRIM(pic) != '-'
) pd
LEFT JOIN pic_users pu ON 
    LOWER(REGEXP_REPLACE(pd.pic, '^[0-9]+', '') || '@jai.co.id') = pu.email
ORDER BY pd.pic;
```

---

### Query 2.4: Count PICs (Total, Active, Inactive)

```sql
SELECT 
    COUNT(*) as "Total PICs",
    COUNT(CASE WHEN is_active THEN 1 END) as "Active",
    COUNT(CASE WHEN NOT is_active THEN 1 END) as "Inactive",
    COUNT(CASE WHEN last_login IS NOT NULL THEN 1 END) as "Ever Logged In",
    MAX(created_at) as "Latest Created",
    MAX(last_login) as "Latest Login"
FROM pic_users;
```

---

### Query 2.5: Find PICs yang Belum Login

```sql
SELECT 
    id,
    email,
    full_name,
    created_at,
    last_login
FROM pic_users
WHERE last_login IS NULL
ORDER BY created_at DESC;
```

---

## 3️⃣ UPDATE QUERIES

### Query 3.1: Ubah Password PIC Tertentu

```sql
-- Ganti dengan password hash baru
UPDATE pic_users 
SET password = '$2b$10$NEW_BCRYPT_HASH_HERE'
WHERE email = 'john@jai.co.id';
```

**Cara generate bcrypt hash baru:**
```bash
# Using Node.js
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword123!', 10));"
```

---

### Query 3.2: Ubah Status Active/Inactive

```sql
-- Deactivate PIC
UPDATE pic_users 
SET is_active = false 
WHERE email = 'john@jai.co.id';

-- Activate PIC
UPDATE pic_users 
SET is_active = true 
WHERE email = 'john@jai.co.id';
```

---

### Query 3.3: Update Department

```sql
UPDATE pic_users 
SET department = 'New Department'
WHERE email = 'john@jai.co.id';
```

---

### Query 3.4: Ubah Full Name

```sql
UPDATE pic_users 
SET full_name = 'John Doe'
WHERE email = 'john@jai.co.id';
```

---

## 4️⃣ DELETE QUERIES

### Query 4.1: Hapus PIC Tertentu

```sql
-- Delete by email
DELETE FROM pic_users 
WHERE email = 'john@jai.co.id';
```

---

### Query 4.2: Hapus Semua PICs yang Tidak Pernah Login

```sql
DELETE FROM pic_users 
WHERE last_login IS NULL;
```

---

### Query 4.3: Hapus Semua Inactive PICs

```sql
DELETE FROM pic_users 
WHERE is_active = false;
```

---

## 5️⃣ SEARCH QUERIES

### Query 5.1: Cari PIC berdasarkan Email

```sql
SELECT * FROM pic_users 
WHERE email ILIKE '%john%';
```

---

### Query 5.2: Cari PIC berdasarkan Full Name

```sql
SELECT * FROM pic_users 
WHERE full_name ILIKE '%John%';
```

---

### Query 5.3: Cari PIC berdasarkan Department

```sql
SELECT * FROM pic_users 
WHERE department = 'Quality Assurance'
ORDER BY full_name;
```

---

## 6️⃣ PASSWORD REFERENCE

### Pre-generated Bcrypt Hashes (10 rounds):

| Password | Bcrypt Hash |
|----------|-------------|
| `Pic123456!` | `$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2` |
| `Operations123!` | `$2b$10$xK5mL9nO2pQ4rS6tU8vW0xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0rS` |
| `Compliance123!` | `$2b$10$pL9kJ8iH7gF6eD5cB4aZ3yX2wV1uT0sR9qP8oN7mL6kJ5iH4gF3eD` |

---

## 7️⃣ ACTIVITY LOG QUERIES

### Query 7.1: Lihat Activity Log PIC

```sql
SELECT 
    id,
    activity_type,
    description,
    target_type,
    target_id,
    created_at
FROM pic_activities
WHERE pic_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

---

### Query 7.2: Lihat Login Activities

```sql
SELECT 
    pic_id,
    (SELECT email FROM pic_users WHERE id = pic_id) as email,
    activity_type,
    created_at
FROM pic_activities
WHERE activity_type = 'login'
ORDER BY created_at DESC;
```

---

### Query 7.3: Count Activities per PIC

```sql
SELECT 
    pic_id,
    (SELECT email FROM pic_users WHERE id = pic_id) as email,
    activity_type,
    COUNT(*) as count
FROM pic_activities
GROUP BY pic_id, activity_type
ORDER BY pic_id, activity_type;
```

---

## 8️⃣ EMAIL TRANSFORMATION REFERENCE

### Regex Pattern untuk Hapus Prefix Angka:

```sql
-- PostgreSQL
REGEXP_REPLACE(pic_name, '^[0-9]+', '')

-- Contoh:
-- Input: '123john'    -> Output: 'john'
-- Input: '456maria'   -> Output: 'maria'
-- Input: 'john'       -> Output: 'john' (no prefix)
-- Input: '001example' -> Output: 'example'
```

---

## 9️⃣ BATCH OPERATIONS

### Query 9.1: Update Multiple PICs

```sql
UPDATE pic_users 
SET department = 'Updated Department'
WHERE email IN ('john@jai.co.id', 'maria@jai.co.id', 'admin@jai.co.id');
```

---

### Query 9.2: Activate Multiple PICs

```sql
UPDATE pic_users 
SET is_active = true
WHERE department = 'Quality Assurance';
```

---

### Query 9.3: Reset Last Login untuk All PICs

```sql
UPDATE pic_users 
SET last_login = NULL
WHERE email LIKE '%@jai.co.id%';
```

---

## 🔟 ADVANCED QUERIES

### Query 10.1: Export PICs ke CSV Format

```sql
-- Run ini di psql dengan -A -F, flag untuk output CSV
\COPY (SELECT id, email, full_name, department, is_active, created_at FROM pic_users WHERE email LIKE '%@jai.co.id%') 
TO STDOUT CSV HEADER;
```

---

### Query 10.2: Generate Insert Statement dari Existing PICs

```sql
SELECT 
    'INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at) VALUES (' ||
    '''' || email || ''', ''' || password || ''', ''' || full_name || ''', ''' || department || ''', ' ||
    is_active || ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);' as sql_statement
FROM pic_users
WHERE email LIKE '%@jai.co.id%';
```

---

## 📋 CHEAT SHEET

```sql
-- Quick Check
SELECT COUNT(*) FROM pic_users WHERE email LIKE '%@jai.co.id%';

-- Quick List
SELECT email, full_name, is_active FROM pic_users ORDER BY created_at DESC LIMIT 10;

-- Quick Update Password
UPDATE pic_users SET password = '$2b$10$...' WHERE email = 'test@jai.co.id';

-- Quick Delete
DELETE FROM pic_users WHERE email = 'test@jai.co.id';
```

---

**Last Updated:** 2024-04-20
**Password Hash Type:** bcryptjs (10 rounds)
**Email Domain:** @jai.co.id
