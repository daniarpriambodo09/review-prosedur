# Quick PIC Setup - Langsung Jalankan

## ⚡ 3 Pilihan Setup - Pilih Salah Satu:

### Option 1: Menggunakan Node.js Script (PALING MUDAH & RECOMMENDED)

```bash
cd web-app
npm install  # Jika belum install dependencies
node ../scripts/setup-pic-users-from-db.js
```

**Keuntungan:**
- Otomatis ekstrak PICs dari database
- Menampilkan preview email mapping
- Memberikan feedback detail setiap step
- Aman dijalankan berkali-kali

---

### Option 2: Menggunakan SQL Query (PALING CEPAT)

```bash
cd web-app
psql -U postgres -h localhost procedure_management -f ../migration/003_insert_pic_standalone.sql
```

**Keuntungan:**
- Langsung tanpa perlu Node.js
- Instant execution
- SQL pure

---

### Option 3: Copy-Paste Query Manual di psql

```bash
# 1. Login ke psql
psql -U postgres -h localhost procedure_management

# 2. Copy-paste query berikut:
```

```sql
-- Fungsi untuk hapus prefix angka
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
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM procedure_documents
WHERE pic IS NOT NULL 
    AND TRIM(pic) != ''
    AND TRIM(pic) != '-'
ON CONFLICT (email) DO NOTHING;

-- Verifikasi
SELECT * FROM pic_users WHERE email LIKE '%@jai.co.id%' ORDER BY created_at DESC;
```

---

## 📧 Email Transformation Examples

Berikut contoh transformasi email:

| Original PIC | → | Generated Email |
|--------------|---|-----------------|
| 123john | → | john@jai.co.id |
| 456maria | → | maria@jai.co.id |
| 789admin | → | admin@jai.co.id |
| 001example | → | example@jai.co.id |

---

## 🔐 Login Credentials

Setelah setup selesai, PIC bisa login dengan:

**URL:** `http://localhost:3000/pic-login`

**Format Login:**
- Email: `[cleaned-pic-name]@jai.co.id`
- Password: `Pic123456!`

**Contoh:**
- Email: `john@jai.co.id`
- Password: `Pic123456!`

---

## ✅ Verifikasi Setup

Untuk memastikan setup berhasil:

```bash
# Login ke psql
psql -U postgres -h localhost procedure_management

# Jalankan query ini
SELECT email, full_name, is_active, created_at 
FROM pic_users 
WHERE email LIKE '%@jai.co.id%'
ORDER BY created_at DESC;
```

Output yang diharapkan:
```
           email           |  full_name  | is_active |         created_at
───────────────────────────┼─────────────┼───────────┼─────────────────────
 john@jai.co.id            | John        | t         | 2024-04-20 10:30:00
 maria@jai.co.id           | Maria       | t         | 2024-04-20 10:30:01
 admin@jai.co.id           | Admin       | t         | 2024-04-20 10:30:02
```

---

## 🚨 Jika Ada Masalah

### Error: "table pic_users does not exist"
Run migration table terlebih dahulu:
```bash
cd web-app
node ../scripts/run-migration.js
```

### Error: "Cannot find module"
Install dependencies:
```bash
cd web-app
npm install
```

### Error: "connection refused"
Pastikan:
1. PostgreSQL sudah running
2. Database credentials benar

---

## 🔄 Menjalankan Lagi

Script & query aman dijalankan berkali-kali - duplicate akan diabaikan.

---

## 📊 File-file yang Tersedia

1. **Scripts:**
   - `scripts/setup-pic-users-from-db.js` - Node.js script (RECOMMENDED)

2. **SQL Migrations:**
   - `migration/001_add_pic_tables.sql` - Create PIC tables
   - `migration/003_insert_pic_from_documents.sql` - Insert PICs (basic version)
   - `migration/003_insert_pic_standalone.sql` - Insert PICs (standalone, with comments)

3. **Documentation:**
   - `PIC_EMAIL_SETUP.md` - Complete setup guide
   - `QUICK_PIC_SETUP.md` - This file (quick reference)

---

## 🎯 Next Steps Setelah Setup

1. ✅ Run setup script/query
2. ✅ Verify PICs di database
3. ✅ Test login di `/pic-login`
4. ✅ Redirect ke `/pic-dashboard`
5. ✅ Done!

---

**Password Default (semua PIC):** `Pic123456!`
**Domain Email:** `@jai.co.id`
