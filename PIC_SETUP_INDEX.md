# 📚 PIC Setup Documentation Index

Panduan lengkap untuk setup PIC (Person In Charge) users dari database dengan email transformation.

---

## 🚀 START HERE - Pilih Cara Setup Anda

### ⭐ Recommended: Node.js Script
**File:** `scripts/setup-pic-users-from-db.js`
```bash
cd web-app && node ../scripts/setup-pic-users-from-db.js
```
- ✅ Otomatis, lengkap, detail report
- ✅ Show preview email mapping
- ✅ Safe untuk dijalankan berkali-kali

→ **Read:** `QUICK_PIC_SETUP.md` (langsung jalankan)

---

### 🔄 Alternative 1: SQL Query File
**File:** `migration/003_insert_pic_standalone.sql`
```bash
cd web-app && psql -U postgres -h localhost procedure_management -f ../migration/003_insert_pic_standalone.sql
```
- ✅ Pure SQL, cepat
- ✅ Dengan comments lengkap
- ✅ Verify query included

→ **Read:** `QUICK_PIC_SETUP.md` (Option 2)

---

### 🔄 Alternative 2: Copy-Paste Manual
**File:** `COPY_PASTE_SQL.sql`
1. Login ke psql: `psql -U postgres -h localhost procedure_management`
2. Copy-paste query dari file ini
3. Enter

- ✅ Manual, full control
- ✅ All verification queries included
- ✅ Best untuk debugging

→ **Read:** `QUICK_PIC_SETUP.md` (Option 3)

---

## 📖 Documentation Files

### Quick References (Start Here)
| File | Purpose | Read Time |
|------|---------|-----------|
| **`QUICK_PIC_SETUP.md`** | Quick reference dengan 3 pilihan setup | 5 min |
| **`PIC_SETUP_SUMMARY.md`** | Ringkasan eksekutif lengkap | 10 min |
| **`COPY_PASTE_SQL.sql`** | SQL siap pakai untuk copy-paste | - |

### Detailed Guides
| File | Purpose | Read Time |
|------|---------|-----------|
| **`PIC_EMAIL_SETUP.md`** | Complete setup guide dengan troubleshooting | 20 min |
| **`SQL_PIC_QUERIES.md`** | 100+ SQL queries untuk berbagai kebutuhan | Reference |
| **`TECHNICAL_REFERENCE.md`** | Architecture & database schema detail | 30 min |

### Implementation Files
| File | Purpose |
|------|---------|
| **`scripts/setup-pic-users-from-db.js`** | Node.js script untuk setup |
| **`migration/001_add_pic_tables.sql`** | Create PIC tables (migration) |
| **`migration/003_insert_pic_standalone.sql`** | Insert query (standalone version) |

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Choose Your Method

**Option A - Most Recommended** (Node.js)
```bash
cd web-app && npm install && node ../scripts/setup-pic-users-from-db.js
```

**Option B - Fastest** (SQL File)
```bash
cd web-app && psql -U postgres -h localhost procedure_management -f ../migration/003_insert_pic_standalone.sql
```

**Option C - Manual** (Copy-Paste)
1. Open `COPY_PASTE_SQL.sql`
2. Copy all SQL
3. Login to psql: `psql -U postgres -h localhost procedure_management`
4. Paste & execute

### Step 2: Verify

```sql
SELECT email, full_name, is_active, created_at 
FROM pic_users 
WHERE email LIKE '%@jai.co.id%'
ORDER BY created_at DESC;
```

### Step 3: Test Login

1. Open: `http://localhost:3000/pic-login`
2. Email: `john@jai.co.id` (atau PIC lain dari hasil verifikasi)
3. Password: `Pic123456!`
4. Should redirect to `/pic-dashboard` ✅

---

## 📊 Email Transformation Explained

```
Input (procedure_documents.pic)  → Transformation → Output (pic_users.email)

123john                          → Remove 123, add @jai.co.id → john@jai.co.id
456maria                         → Remove 456, add @jai.co.id → maria@jai.co.id
789admin                         → Remove 789, add @jai.co.id → admin@jai.co.id
john                             → Add @jai.co.id → john@jai.co.id
```

---

## 🔐 Credentials

**Default Password (semua PIC):** `Pic123456!`
**Domain:** `@jai.co.id`
**Format:** `[cleaned-pic-name]@jai.co.id`

---

## 📋 What Gets Created

### Database Tables
- `pic_users` - PIC credentials & profile
- `pic_documents` - Documents assigned to PIC
- `pic_requests` - Review requests
- `pic_document_requests` - New document requests
- `pic_activities` - Audit trail

### API Endpoints
- `POST /api/auth/pic-login` - PIC authentication
- `GET /api/pic/dashboard` - Dashboard data
- `GET/POST /api/pic/requests/review` - Review requests
- `POST /api/pic/requests/new-document` - New document requests

### Frontend Pages
- `/pic-login` - PIC login page
- `/pic-dashboard` - PIC dashboard

---

## 🔍 How to Find What You Need

### "I want to setup PICs quickly"
→ Read: `QUICK_PIC_SETUP.md`

### "I want to understand the full setup"
→ Read: `PIC_EMAIL_SETUP.md`

### "I need specific SQL queries"
→ Read: `SQL_PIC_QUERIES.md`

### "I want to understand architecture"
→ Read: `TECHNICAL_REFERENCE.md`

### "I have questions about database"
→ Read: `PIC_SETUP_SUMMARY.md` (Troubleshooting section)

### "Just give me the SQL to copy-paste"
→ Use: `COPY_PASTE_SQL.sql`

---

## 🆘 Troubleshooting

| Issue | Solution | Doc |
|-------|----------|-----|
| Module 'pg' not found | Run `npm install` in web-app | PIC_EMAIL_SETUP.md |
| Table pic_users not exist | Run migration first | PIC_EMAIL_SETUP.md |
| Connection refused | Check PostgreSQL & credentials | PIC_EMAIL_SETUP.md |
| Email format wrong | Check email transformation logic | SQL_PIC_QUERIES.md #8 |

---

## 📈 Setup Progress Checklist

- [ ] Choose setup method (Node.js / SQL / Manual)
- [ ] Run setup script/query
- [ ] Verify in database (SELECT query)
- [ ] Test login at `/pic-login`
- [ ] Check `/pic-dashboard` works
- [ ] All done! ✅

---

## 🔗 File Relationships

```
QUICK_PIC_SETUP.md (Start here)
├── Node.js Method
│   └── scripts/setup-pic-users-from-db.js
├── SQL File Method
│   └── migration/003_insert_pic_standalone.sql
└── Manual Method
    └── COPY_PASTE_SQL.sql

PIC_EMAIL_SETUP.md (Detailed)
└── References SQL_PIC_QUERIES.md

SQL_PIC_QUERIES.md (100+ queries)
└── All SQL examples for various needs

TECHNICAL_REFERENCE.md (Architecture)
└── Database schema & design details
```

---

## ✅ Success Criteria

After setup, you should be able to:
- [ ] See PICs in pic_users table
- [ ] Email format is `[name]@jai.co.id`
- [ ] Password is hashed with bcryptjs
- [ ] Login works at `/pic-login`
- [ ] Dashboard shows at `/pic-dashboard`
- [ ] Activity logs are created
- [ ] PICs can request reviews/documents

---

## 📊 Files Overview

| File | Type | Size | Purpose |
|------|------|------|---------|
| `QUICK_PIC_SETUP.md` | Doc | 10KB | Quick start guide |
| `PIC_SETUP_SUMMARY.md` | Doc | 8KB | Executive summary |
| `PIC_EMAIL_SETUP.md` | Doc | 15KB | Complete guide |
| `SQL_PIC_QUERIES.md` | Doc | 25KB | SQL reference |
| `COPY_PASTE_SQL.sql` | SQL | 3KB | Ready to use SQL |
| `scripts/setup-pic-users-from-db.js` | JS | 6KB | Node.js script |
| `migration/003_insert_pic_standalone.sql` | SQL | 4KB | SQL migration |

---

## 🎓 Learning Path

1. **For Quick Setup:** `QUICK_PIC_SETUP.md` → Choose method → Execute
2. **For Understanding:** `PIC_SETUP_SUMMARY.md` → `PIC_EMAIL_SETUP.md`
3. **For Deep Dive:** `TECHNICAL_REFERENCE.md` → `SQL_PIC_QUERIES.md`
4. **For Reference:** `SQL_PIC_QUERIES.md` (bookmark this!)

---

## 📞 Documentation Quick Links

- **Quick Start:** See `QUICK_PIC_SETUP.md`
- **SQL Queries:** See `SQL_PIC_QUERIES.md`
- **Troubleshooting:** See `PIC_EMAIL_SETUP.md`
- **Architecture:** See `TECHNICAL_REFERENCE.md`
- **Copy-Paste SQL:** See `COPY_PASTE_SQL.sql`

---

**Status:** ✅ Complete & Ready to Use
**Last Updated:** 2024-04-20
**Version:** 1.0
