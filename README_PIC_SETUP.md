# 🔐 PIC User Setup - Dokumentasi Lengkap

**Setelah** TypeScript error diperbaiki, sekarang siap untuk setup PIC users dengan email dari database.

---

## ⚡ FASTEST WAY (1 Command)

```bash
cd web-app && npm install && node ../scripts/setup-pic-users-from-db.js
```

Done! ✅

---

## 📚 Dokumentasi Tersedia

| Document | Waktu Baca | Untuk |
|----------|-----------|-------|
| **`QUICK_PIC_SETUP.md`** | 5 min | Start here - 3 pilihan setup |
| **`PIC_SETUP_SUMMARY.md`** | 10 min | Ringkasan lengkap dengan troubleshooting |
| **`PIC_EMAIL_SETUP.md`** | 20 min | Complete guide dengan semua detail |
| **`SQL_PIC_QUERIES.md`** | Reference | 100+ SQL queries untuk berbagai kebutuhan |
| **`PIC_SETUP_INDEX.md`** | Navigation | Index untuk semua dokumentasi |
| **`COPY_PASTE_SQL.sql`** | - | SQL siap untuk copy-paste |

---

## 🎯 Choose Your Setup Method

### Method 1: Node.js Script (RECOMMENDED)
```bash
cd web-app
node ../scripts/setup-pic-users-from-db.js
```
✅ Otomatis, detail report, safe  
📖 Read: `QUICK_PIC_SETUP.md` (Option 1)

### Method 2: SQL File
```bash
cd web-app
psql -U postgres -h localhost procedure_management -f ../migration/003_insert_pic_standalone.sql
```
✅ Pure SQL, cepat, dengan comments  
📖 Read: `QUICK_PIC_SETUP.md` (Option 2)

### Method 3: Copy-Paste Manual
1. Open: `COPY_PASTE_SQL.sql`
2. Copy seluruh SQL
3. Paste di psql
4. Execute

✅ Manual, full control, debug friendly  
📖 Read: `QUICK_PIC_SETUP.md` (Option 3)

---

## 📊 Email Format Transformation

```
Before (procedure_documents.pic) → After (pic_users.email)
123john                         → john@jai.co.id
456maria                        → maria@jai.co.id
789admin                        → admin@jai.co.id
```

---

## 🔐 Login Credentials

**All PICs have same password initially:**
```
Email:    [cleaned-pic-name]@jai.co.id
Password: Pic123456!
```

Example: `john@jai.co.id` / `Pic123456!`

---

## ✅ Verify Setup

After running setup, run this query:

```sql
SELECT email, full_name, is_active, created_at 
FROM pic_users 
WHERE email LIKE '%@jai.co.id%'
ORDER BY created_at DESC;
```

Should show all PIC users.

---

## 🧪 Test Login

1. Go to: `http://localhost:3000/pic-login`
2. Enter email PIC from verification query
3. Enter password: `Pic123456!`
4. Should redirect to `/pic-dashboard` ✅

---

## 🐛 Troubleshooting

**Q: Module 'pg' not found**  
A: Run `npm install` in web-app folder

**Q: Table pic_users not exist**  
A: Run migration first: `node ../scripts/run-migration.js`

**Q: Connection refused**  
A: Check PostgreSQL is running & database credentials correct

For more help: See `PIC_EMAIL_SETUP.md`

---

## 📁 Files Created

### Scripts
- `scripts/setup-pic-users-from-db.js` - Main setup script (recommended)
- `scripts/run-migration.js` - Create tables

### SQL Migrations
- `migration/001_add_pic_tables.sql` - Create PIC tables
- `migration/003_insert_pic_standalone.sql` - Insert PICs (standalone)

### Documentation (Pick What You Need)
- `QUICK_PIC_SETUP.md` ← **Start here**
- `PIC_SETUP_SUMMARY.md` - Executive summary
- `PIC_EMAIL_SETUP.md` - Complete guide
- `SQL_PIC_QUERIES.md` - SQL reference
- `PIC_SETUP_INDEX.md` - Documentation index
- `COPY_PASTE_SQL.sql` - Ready to use SQL

---

## 🔧 What Gets Set Up

### Database
- ✅ pic_users table with emails from database
- ✅ pic_documents, pic_requests tables
- ✅ pic_activities table for audit trail

### Application
- ✅ `/pic-login` page
- ✅ `/pic-dashboard` page
- ✅ PIC authentication APIs
- ✅ Activity logging system

### Features
- ✅ PIC login with email & password
- ✅ Dashboard with stats
- ✅ Request review modal
- ✅ Request new document modal
- ✅ Activity log

---

## 📋 What Was Fixed

1. **TypeScript Error:** Type definition added to `picActivityLogger.ts`
2. **Email Setup:** 3 methods created to insert PICs with email transformation
3. **Password Management:** bcrypt hashing included
4. **Documentation:** Complete setup guides created

---

## 🚀 Quick Start (Copy & Paste)

```bash
# 1. Setup
cd /path/to/review-prosedur/web-app
npm install
node ../scripts/setup-pic-users-from-db.js

# 2. Verify (in psql)
SELECT COUNT(*) FROM pic_users WHERE email LIKE '%@jai.co.id%';

# 3. Test login at browser
# http://localhost:3000/pic-login
# Email: john@jai.co.id (or any from step 2)
# Password: Pic123456!
```

---

## 📖 Documentation Map

```
START HERE
    ↓
├─ Quick: QUICK_PIC_SETUP.md (5 min)
├─ Deep:  PIC_EMAIL_SETUP.md (20 min)
├─ SQL:   SQL_PIC_QUERIES.md (reference)
├─ Index: PIC_SETUP_INDEX.md (navigation)
└─ Copy:  COPY_PASTE_SQL.sql (ready to use)
```

---

## ✅ Success Checklist

- [ ] Run setup script/query
- [ ] Verify PICs in database
- [ ] Test login at `/pic-login`
- [ ] Dashboard works at `/pic-dashboard`
- [ ] Activity log shows actions
- [ ] Done! ✅

---

## 🆘 Need Help?

1. **Quick help:** `QUICK_PIC_SETUP.md`
2. **Detailed help:** `PIC_EMAIL_SETUP.md`
3. **SQL help:** `SQL_PIC_QUERIES.md`
4. **Architecture:** `TECHNICAL_REFERENCE.md`

---

**Status:** ✅ Ready to Use  
**Setup Time:** ~5 minutes  
**Difficulty:** Easy  
**No data loss:** Safe to rerun  

**Next:** Pick a setup method and run! 🚀
