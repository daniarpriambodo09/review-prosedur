# Review Prosedur - Quality Management System

Aplikasi web untuk mengelola review dan dokumentasi prosedur dalam sistem Quality Management System (QMS). Platform ini dirancang untuk memfasilitasi proses review dokumen antara Admin dan PIC (Person In Charge) dengan fitur tracking status, archive management, dan activity logging.

## 📋 Daftar Isi

- [Deskripsi Aplikasi](#deskripsi-aplikasi)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Folder](#struktur-folder)
- [Halaman-Halaman Aplikasi](#halaman-halaman-aplikasi)
- [Cara Menjalankan](#cara-menjalankan)
- [API Routes](#api-routes)

## 🎯 Deskripsi Aplikasi

**Review Prosedur** adalah sistem manajemen dokumen prosedur yang memungkinkan:

- **Admin** untuk mengelola semua dokumen prosedur, melihat status review, dan mengelola archive
- **PIC (Person In Charge)** untuk melihat dokumen yang perlu di-review, membuat request review, dan mengajukan dokumen baru
- **Tracking real-time** untuk status dokumen: Relevan, Revisi, Obsolete, Menunggu Review, dsb.
- **Activity logging** untuk mencatat semua aktivitas yang dilakukan oleh admin dan PIC
- **Document management** dengan kemampuan upload, download, archive, dan restore

### Fitur Utama:
- ✅ Sistem login terpisah untuk Admin dan PIC
- ✅ Dashboard dengan statistik dan monitoring dokumen
- ✅ Filter dan pencarian dokumen berdasarkan bulan dan status
- ✅ Activity log dengan detail aktivitas setiap pengguna
- ✅ Archive management (arsip, restore, delete permanen)
- ✅ Notification system untuk notifikasi review
- ✅ PDF viewer dan file management
- ✅ Request system untuk review dokumen dan dokumen baru

## 🛠️ Teknologi yang Digunakan

- **Framework**: Next.js 16 (App Router)
- **UI Framework**: React 19.2
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (via pg)
- **Authentication**: Custom JWT-based auth dengan bcryptjs
- **Icons**: React Icons
- **Analytics**: Vercel Analytics

### Dependencies:
```json
{
  "@types/pg": "^8.16.0",
  "@vercel/analytics": "^1.6.1",
  "bcryptjs": "^3.0.3",
  "next": "^16.1.6",
  "pg": "^8.18.0",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "react-icons": "^5.5.0"
}
```

## 📁 Struktur Folder

```
web-app/
├── app/
│   ├── api/                      # API Routes untuk backend logic
│   │   ├── auth/                 # Authentication routes (login, register, validate)
│   │   ├── activities/           # Activity logging endpoints
│   │   ├── procedures/           # Document management endpoints
│   │   ├── pic/                  # PIC-specific endpoints
│   │   ├── files/                # File upload/download endpoints
│   │   ├── arsip/                # Archive management endpoints
│   │   ├── reviews/              # Review endpoints
│   │   └── ...
│   ├── admin/                    # Admin pages
│   │   └── seed/                 # Seeding page
│   ├── home/                     # Admin dashboard
│   ├── login-page/               # Admin login
│   ├── pic-login/                # PIC login
│   ├── pic-dashboard/            # PIC dashboard
│   ├── pic-profile/              # PIC profile & settings
│   ├── status-review/            # Status review page (admin)
│   ├── review-page-owner/        # Review page detail
│   ├── arsip-prosedur/          # Archive management page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Entry point (redirect ke login)
├── components/                   # Reusable React components
│   ├── procedures/               # Procedure-related components
│   ├── pic/                      # PIC-specific components
│   ├── documents/                # Document display components
│   ├── admin/                    # Admin-specific components
│   └── ProtectedRoute.tsx        # Authentication wrapper
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Authentication context
├── data/                         # Data fetching & utilities
│   └── procedures/               # Procedure data utilities
├── public/                       # Static assets
└── package.json
```

## 📄 Halaman-Halaman Aplikasi

### 1. **Landing / Root Page** (`/`)
- **Path**: `app/page.tsx`
- **Deskripsi**: Halaman entry point yang langsung redirect ke login page
- **Akses**: Public (belum authenticated)
- **Fitur**: Redirect otomatis ke `/review-prosedur/login-page`

### 2. **Admin Login** (`/login-page`)
- **Path**: `app/login-page/page.tsx`
- **Deskripsi**: Halaman login untuk admin dengan username & password
- **Akses**: Public
- **Fitur**:
  - Form login dengan validasi
  - Error handling
  - Link ke PIC login
  - Loading state
  - Redirect otomatis ke home jika sudah authenticated

### 3. **PIC Login** (`/pic-login`)
- **Path**: `app/pic-login/page.tsx`
- **Deskripsi**: Halaman login khusus untuk PIC (Person In Charge)
- **Akses**: Public
- **Fitur**:
  - Separate login form untuk PIC
  - Link ke admin login
  - PIC-specific authentication

### 4. **Admin Dashboard / Home** (`/home`)
- **Path**: `app/home/page.tsx` 
- **Deskripsi**: Dashboard utama untuk admin dengan overview semua dokumen
- **Akses**: Protected (admin only)
- **Fitur**:
  - **Statistics Cards**: Total dokumen, Relevan, Revisi, Belum Direview
  - **Monthly Filter**: Filter dokumen berdasarkan bulan
  - **Document List**: Tabel dokumen dengan status, tanggal, progress review
  - **Activity Log**: Log aktivitas admin dan PIC dengan pagination
  - **Activity Filters**: Filter berdasarkan user dan activity type
  - **Progress Bar**: Visual progress review dokumen
  - **Real-time Updates**: Status terkini setiap dokumen

### 5. **Status Review** (`/status-review`)
- **Path**: `app/status-review/page.tsx`
- **Deskripsi**: Halaman untuk melihat dan mengelola status review dokumen
- **Akses**: Protected (admin only)
- **Fitur**:
  - List dokumen dengan status detail
  - Filter & search dokumen
  - Quick action untuk change status
  - Breadcrumb navigation

### 6. **Arsip Prosedur** (`/arsip-prosedur`)
- **Path**: `app/arsip-prosedur/page.tsx`
- **Deskripsi**: Halaman untuk mengelola dokumen yang sudah di-archive
- **Akses**: Protected (admin only)
- **Fitur**:
  - List archived documents
  - Restore archived documents
  - Permanent delete documents
  - Status badge untuk setiap dokumen
  - Pagination & filtering

### 7. **Review Page Owner** (`/review-page-owner/[pic]`)
- **Path**: `app/review-page-owner/[pic]/page.tsx`
- **Deskripsi**: Halaman review detail untuk dokumen spesifik dari PIC tertentu
- **Akses**: Protected (admin only)
- **Fitur**:
  - Detail review dokumen
  - PIC identification via URL parameter
  - Document metadata
  - Review history
  - Action buttons untuk approve/reject/revisi

### 8. **PIC Dashboard** (`/pic-dashboard`)
- **Path**: `app/pic-dashboard/page.tsx`
- **Deskripsi**: Dashboard untuk PIC menampilkan dokumen mereka dan request status
- **Akses**: Protected (PIC only)
- **Fitur**:
  - **PIC Stats**: Total dokumen, pending review, completed, requests
  - **Documents List**: List dokumen dengan status
  - **Activity Log**: Activity history PIC
  - **Request Modals**: Modal untuk request review & dokumen baru
  - **Status Filters**: Filter dokumen by status (all, pending, approved, revision, rejected)

### 9. **PIC Profile** (`/pic-profile`)
- **Path**: `app/pic-profile/page.tsx`
- **Deskripsi**: Halaman profile dan pengaturan untuk PIC
- **Akses**: Protected (PIC only)
- **Fitur**:
  - View profile information
  - Change password
  - Update name/personal info
  - Logout

### 10. **Admin Seed** (`/admin/seed`)
- **Path**: `app/admin/seed/page.tsx`
- **Deskripsi**: Halaman untuk seeding/inisialisasi data development
- **Akses**: Protected (admin only)
- **Fitur**:
  - Initialize test data
  - Seed procedures
  - Setup initial users

## 🚀 Cara Menjalankan

### Development

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Server akan berjalan di http://localhost:3090
```

### Production Build

```bash
# Build aplikasi
npm run build

# Jalankan production server
npm start

# Server akan berjalan di http://localhost:3090
```

### Environment Variables

Pastikan `.env.local` memiliki konfigurasi:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

## 🔌 API Routes

### Authentication Routes
- `POST /api/auth/login` - Admin login
- `POST /api/auth/pic-login` - PIC login
- `POST /api/auth/register` - Register new user
- `POST /api/auth/validate` - Validate token

### Procedures Routes
- `GET /api/procedures` - Get all procedures
- `GET /api/procedures/[nomorDokumen]` - Get procedure detail
- `POST /api/procedures/route.ts` - Create procedure
- `POST /api/procedures/archive` - Archive procedure
- `POST /api/procedures/seed` - Seed procedures

### PIC Routes
- `GET /api/pic/dashboard` - Get PIC dashboard data
- `GET /api/pic/documents` - Get PIC's documents
- `GET /api/pic/notifications` - Get PIC notifications
- `POST /api/pic/profile/change-password` - Change password
- `POST /api/pic/profile/update-name` - Update name
- `POST /api/pic/requests/review` - Request review
- `POST /api/pic/requests/new-document` - Request new document

### Files Routes
- `POST /api/files/upload` - Upload file
- `GET /api/files/list` - List files
- `GET /api/files/serve` - Serve file
- `GET /api/files/get` - Get file

### Activities Routes
- `GET /api/activities` - Get activity log

### Archive Routes
- `GET /api/arsip` - Get archived documents
- `POST /api/arsip/delete` - Delete archived document
- `POST /api/arsip/restore` - Restore archived document

### Other Routes
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review
- `GET /api/document-read` - Get document read status
- `GET /api/download-excel` - Download as Excel
- `GET /api/email-schedules` - Get email schedules
- `POST /api/otp/verify` - Verify OTP
- `POST /api/admin/notifications` - Send admin notification

## 📊 Status Dokumen

Aplikasi menggunakan beberapa status untuk dokumen:

| Status | Deskripsi | Warna |
|--------|-----------|-------|
| **Relevan** | Dokumen sudah disetujui dan relevan | Hijau (Emerald) |
| **Revisi** | Dokumen perlu direvisi | Kuning (Amber) |
| **Obsolete** | Dokumen tidak lagi digunakan | Merah (Red) |
| **Menunggu** | Menunggu review | Biru (Blue) |
| **Belum dikirim** | Dokumen belum dikirim untuk review | Orange |
| **Telah terkirim** | Dokumen sudah dikirim | Cyan |
| **Telah dibaca** | Dokumen sudah dibaca | Purple |

## 🔐 Sistem Keamanan

- **Protected Routes**: Setiap page yang memerlukan autentikasi dibungkus dengan `ProtectedRoute`
- **JWT Authentication**: Token-based authentication untuk session management
- **Role-based Access**: Akses berbeda untuk Admin dan PIC
- **Password Hashing**: Menggunakan bcryptjs untuk hashing password

## 📝 License

© 2026 Quality Management System. All rights reserved.