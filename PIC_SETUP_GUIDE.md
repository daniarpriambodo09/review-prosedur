# PIC Setup Guide

## Overview
Panduan lengkap untuk setup PIC (Person In Charge) users dengan email dan password yang sudah di-hash menggunakan bcryptjs.

## Prerequisites
- Database sudah dibuat dengan tabel `pic_users` (dari migration `001_add_pic_tables.sql`)
- Node.js 14+ terinstall
- bcryptjs package sudah terinstall

## Step 1: Run Database Migration (jika belum)

Jalankan migration untuk membuat tabel pic_users:

```bash
cd web-app
node ../scripts/run-migration.js
```

## Step 2: Insert PIC Users dengan Script

Ada 2 cara untuk insert PIC users:

### Cara 1: Menggunakan Node.js Script (RECOMMENDED)

Script ini akan secara otomatis generate hash password dengan bcryptjs:

```bash
cd web-app
node ../scripts/insert-pic-users.js
```

**Keuntungan:**
- ✓ Hash password dilakukan di Node.js dengan bcryptjs (standard)
- ✓ Lebih aman
- ✓ Mudah customize

### Cara 2: Menggunakan SQL Query Langsung

Jika Anda ingin menggunakan query SQL langsung:

```bash
cd web-app
psql -U postgres -h localhost procedure_management -f ../migration/002_insert_pic_users.sql
```

## Default PIC Users (After Setup)

Setelah menjalankan script, berikut PIC users yang sudah siap:

| Email | Password | Nama | Department |
|-------|----------|------|-----------|
| pic.quality@example.com | Pic123456! | PIC Quality Assurance | Quality Assurance |
| pic.operations@example.com | Operations123! | PIC Operations | Operations |
| pic.compliance@example.com | Compliance123! | PIC Compliance | Compliance |

## Step 3: Verify PIC Users

Untuk memverifikasi bahwa PIC users sudah tersimpan di database:

```sql
SELECT id, email, full_name, department, is_active, created_at 
FROM pic_users 
ORDER BY id;
```

## Cara Login dengan PIC Account

1. Akses aplikasi di `/pic-login`
2. Masukkan email dan password
3. Sistem akan validate credentials dan mengarahkan ke `/pic-dashboard`

## Generate Custom PIC User

Jika Anda ingin menambah PIC user baru dengan custom email dan password:

### Menggunakan Node.js

```javascript
const bcryptjs = require('bcryptjs');

async function generateHash(password) {
  const salt = await bcryptjs.genSalt(10);
  const hash = await bcryptjs.hash(password, salt);
  console.log('Hash:', hash);
}

generateHash('YourPassword123!');
```

Kemudian gunakan hash tersebut dalam SQL query:

```sql
INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
VALUES (
  'new.pic@example.com',
  '$2b$10$YOUR_GENERATED_HASH_HERE',
  'New PIC Name',
  'Department Name',
  true,
  NOW(),
  NOW()
);
```

## Troubleshooting

### Error: "relation "pic_users" does not exist"
- Run migration dulu: `node ../scripts/run-migration.js`

### Error: "duplicate key value violates unique constraint"
- Email sudah ada di database
- Update password dengan query UPDATE atau hapus dulu dan insert ulang

### Cannot login dengan PIC email/password
1. Pastikan PIC user sudah ada di database
2. Cek password hash dengan `SELECT email, password FROM pic_users WHERE email = 'your-email';`
3. Pastikan format email dan password sudah benar

## Security Notes

- ✓ Password di-hash dengan bcryptjs (10 salt rounds)
- ✓ Password tidak pernah disimpan dalam plain text
- ✓ Hash password tidak dapat di-reverse
- ✓ Setiap login melakukan verify dengan bcryptjs.compare()

## File References

| File | Deskripsi |
|------|-----------|
| `scripts/insert-pic-users.js` | Node.js script untuk insert PIC users |
| `migration/002_insert_pic_users.sql` | SQL query untuk insert PIC users (dengan pre-generated hashes) |
| `web-app/app/pic-login/page.tsx` | Login page untuk PIC |
| `web-app/app/api/auth/pic-login/route.ts` | API endpoint untuk PIC login |
