# Setup PIC Users dari Database

Dokumentasi lengkap untuk mengset up PIC users dengan email dan password dari data yang ada di database.

## 📋 Overview

Script ini mengekstrak PIC (Person In Charge) dari tabel `procedure_documents` dan membuat akun PIC di tabel `pic_users` dengan:
- Email: Menghilangkan prefix angka (contoh: "123example" → "example@jai.co.id")
- Password: Hashed dengan bcryptjs (default password untuk semua PIC: `Pic123456!`)
- Status: Aktif (is_active = true)

## 📊 Format Email Transformation

| Format Lama | → | Format Baru |
|-------------|---|------------|
| 123john | → | john@jai.co.id |
| 456maria | → | maria@jai.co.id |
| 789admin | → | admin@jai.co.id |

## 🚀 Method 1: Menggunakan Node.js Script (RECOMMENDED)

Script ini lebih fleksibel dan dapat menampilkan mapping detail.

### Langkah-langkah:

```bash
# 1. Masuk ke direktori web-app
cd /path/to/review-prosedur/web-app

# 2. Jalankan script
node ../scripts/setup-pic-users-from-db.js
```

### Output Contoh:

```
[v0] Starting PIC users setup...

[v0] Step 1: Fetching distinct PICs from procedure_documents...
[v0] Found 5 unique PICs

[v0] Step 2: Generating bcryptjs hash for password "Pic123456!"...
[v0] Password hash generated: $2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2

[v0] Step 3: Preparing PIC user data...
[v0] Email Mapping:

Original PIC              →     Email
────────────────────────────────────────────────────────────────
123john                   →     john@jai.co.id
456maria                  →     maria@jai.co.id
789admin                  →     admin@jai.co.id

[v0] Step 5: Inserting PIC users to database...

[v0] ✓ Inserted: john@jai.co.id (ID: 1)
[v0] ✓ Inserted: maria@jai.co.id (ID: 2)
[v0] ✓ Inserted: admin@jai.co.id (ID: 3)

[v0] Setup Summary:
  • Total PICs found: 3
  • Inserted: 3
  • Skipped (already exists): 0
  • Default password: Pic123456!

[v0] ✓ PIC users setup completed successfully!

[v0] PICs can now login at /pic-login with:
  • Email: [their email]@jai.co.id
  • Password: Pic123456!
```

## 🔐 Method 2: Menggunakan SQL Query Langsung

Jika ingin menjalankan query SQL langsung:

```bash
# 1. Masuk ke direktori web-app
cd /path/to/review-prosedur/web-app

# 2. Jalankan SQL migration
psql -U postgres -h localhost procedure_management -f ../migration/003_insert_pic_from_documents.sql
```

### Apa yang dilakukan query:

```sql
-- Fungsi untuk menghilangkan prefix angka
CREATE OR REPLACE FUNCTION remove_numeric_prefix(text)
RETURNS text AS $$
BEGIN
    RETURN REGEXP_REPLACE($1, '^[0-9]+', '');
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

## ✅ Verifikasi Setup

### Mengecek PICs yang sudah dibuat:

```sql
-- Login ke database
psql -U postgres -h localhost procedure_management

-- Query untuk melihat semua PIC users
SELECT id, email, full_name, is_active, created_at 
FROM pic_users 
ORDER BY created_at DESC;
```

Output contoh:
```
 id |           email           |      full_name       | is_active |         created_at
────┼───────────────────────────┼──────────────────────┼───────────┼─────────────────────────
  1 | john@jai.co.id            | John                 | t         | 2024-04-20 10:30:00
  2 | maria@jai.co.id           | Maria                | t         | 2024-04-20 10:30:01
  3 | admin@jai.co.id           | Admin                | t         | 2024-04-20 10:30:02
```

### Menampilkan mapping original PIC ke email:

```sql
SELECT DISTINCT 
    pic as original_pic,
    LOWER(REGEXP_REPLACE(pic, '^[0-9]+', '') || '@jai.co.id') as generated_email
FROM procedure_documents
WHERE pic IS NOT NULL 
    AND TRIM(pic) != ''
    AND TRIM(pic) != '-'
ORDER BY pic;
```

## 🔑 Password Default

Semua PIC users akan memiliki password yang sama saat pertama kali dibuat:

```
Password: Pic123456!
```

**Catatan Keamanan**: Pastikan PIC mengubah password mereka setelah login pertama kali. Anda dapat menambahkan fitur "Ubah Password" di dashboard PIC.

## 🧪 Testing Login PIC

1. Buka aplikasi di `/pic-login`
2. Masukkan salah satu email PIC:
   - Contoh: `john@jai.co.id`
3. Masukkan password: `Pic123456!`
4. Sistem akan redirect ke `/pic-dashboard`

## 📝 Catatan Penting

- **Email Cleaning**: Prefix angka dihilangkan otomatis
  - `123john` → `john@jai.co.id`
  - `456maria` → `maria@jai.co.id`
  
- **Case Handling**: Email dikonversi ke lowercase
  - Input: `123JOHN` → Output: `john@jai.co.id`

- **Invalid PICs**: PIC dengan nilai berikut akan diabaikan:
  - NULL
  - String kosong ('')
  - Dash ('-')

- **Duplicate Prevention**: Menggunakan `ON CONFLICT (email) DO NOTHING`
  - Jika email sudah ada, akan diskip (tidak akan di-update)
  - Aman untuk dijalankan berkali-kali

## 🆘 Troubleshooting

### Error: "Cannot find module 'pg'"
```bash
# Pastikan dependencies sudah terinstall
cd /path/to/review-prosedur/web-app
npm install
```

### Error: "Cannot find module 'bcryptjs'"
```bash
# Install bcryptjs
npm install bcryptjs
```

### Error: "connection refused"
Pastikan:
1. PostgreSQL sudah running
2. Database credentials benar (DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT)
3. Database `procedure_management` sudah ada

### Error: "table pic_users does not exist"
Pastikan migration 001 sudah dijalankan:
```bash
cd web-app
node ../scripts/run-migration.js
```

## 🔄 Menjalankan Ulang

Script aman untuk dijalankan berkali-kali:
- PIC yang sudah ada tidak akan di-update (ON CONFLICT DO NOTHING)
- PIC baru dari procedure_documents akan ditambahkan otomatis

```bash
# Aman untuk dijalankan lagi
node ../scripts/setup-pic-users-from-db.js
```

## 📊 SQL untuk Custom Password

Jika ingin mengubah password untuk setiap PIC secara berbeda, gunakan query ini:

```sql
-- Update password untuk PIC tertentu
UPDATE pic_users 
SET password = '$2b$10$NEW_BCRYPT_HASH_HERE'
WHERE email = 'john@jai.co.id';

-- Generate bcrypt hash online atau gunakan script:
-- node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('new_password', 10));"
```

## 📚 Referensi

- Bcryptjs documentation: https://www.npmjs.com/package/bcryptjs
- PostgreSQL REGEXP_REPLACE: https://www.postgresql.org/docs/current/functions-string.html
- ON CONFLICT clause: https://www.postgresql.org/docs/current/sql-insert.html
