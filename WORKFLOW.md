# Workflow Sistem Review Prosedur (QMS)

Dokumen ini mendefinisikan alur kerja (*workflow*) menyeluruh pada sistem Review Prosedur QMS, mencakup siklus review berkala, matriks approval bertingkat (*sequential approval*), hingga stempel tanggal dan verifikasi QR Code.

---

## 1. End-to-End Workflow Diagram

```mermaid
flowchart TD
    %% Actors / Triggers
    Cron[Sistem Email Scheduler / APScheduler]
    Admin[Admin QMS]
    PIC[PIC / Dokumen Owner]
    Approvers[Approvers: Prepared / Checked / Approved]
    Verifier[Auditor / User Umum]

    subgraph F1 [1. Siklus Monitoring & Notifikasi Berkala]
        Cron -->|Cek jadwal review berkala di DB| EmailNotif[Kirim Email Reminder ke PIC]
        EmailNotif --> PIC
        PIC -->|Login ke PIC Dashboard| PICReview[Periksa Dokumen di PDF Viewer]
        PICReview --> StatusDecision{Status Prosedur?}
        StatusDecision -->|Masih Relevan| MarkRelevan[Simpan Status: Relevan]
        StatusDecision -->|Perlu Revisi| RequestRevisi[Ajukan Request Revisi & Upload Draf Baru]
        StatusDecision -->|Sudah Obsolete| MarkObsolete[Tandai Obsolete / Arsipkan]
        MarkRelevan --> AdminDash[Dashboard Admin & Log Aktivitas]
        RequestRevisi --> AdminDash
        MarkObsolete --> AdminDash
    end

    subgraph F2 [2. Siklus Matriks Approval Dokumen]
        AdminDash --> ConfigApproval[Set Matriks Approver & Upload File Final]
        ConfigApproval --> StartCycle[Inisiasi Approval Cycle]
        StartCycle --> Stage1[Kirim Link Token ACC ke Approver 1: Prepared]
        
        Stage1 --> Dec1{Action Approver 1?}
        Dec1 -->|Reject + Alasan| RejectStep[Status: Revisi / Rejected Draf Dikembalikan]
        RejectStep --> PIC
        
        Dec1 -->|ACC / Approve| Stage2[Kirim Link Token ACC ke Approver 2: Checked]
        Dec2 -->|Reject + Alasan| RejectStep
        
        Stage2 --> Dec2{Action Approver 2?}
        Dec2 -->|ACC / Approve| Stage3[Kirim Link Token ACC ke Approver 3: Approved]
        Dec3 -->|Reject + Alasan| RejectStep
        
        Stage3 --> Dec3{Action Approver 3?}
        Dec3 -->|ACC / Approve| AllApproved[Approval Selesai / Completed]
    end

    subgraph F3 [3. Finalisasi & Verifikasi Dokumen]
        AllApproved --> DateStamp[Date Stamping & Generate QR Code Verifikasi]
        DateStamp --> SaveFinalPDF[Simpan PDF Resmi & Update Nomor Revisi]
        SaveFinalPDF --> VerifierPage[Akses Publik: /verify/:code]
        Verifier -->|Scan QR di Dokumen Cetak/PDF| VerifierPage
    end
```

---

## 2. Sequence Diagram Approval & Verifikasi

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin QMS
    actor PIC as PIC
    actor Approver as Approvers (1 -> 2 -> 3)
    participant App as Next.js Web App
    participant DB as PostgreSQL
    participant Mail as SMTP Service

    Admin->>App: Inisiasi Siklus Approval
    App->>DB: Buat siklus approval & token unik tiap stage
    App->>Mail: Trigger email notifikasi + secure token link
    Mail-->>Approver: Email link (/acc/[token])
    
    Approver->>App: Buka link ACC (Split-screen viewer, chat, anotasi)
    alt Dokumen Disetujui (ACC)
        Approver->>App: Submit ACC
        App->>DB: Update stage status = 'acc'
        alt Masih ada approver berikutnya
            App->>Mail: Kirim email ke approver level selanjutnya
        else Semua stage sudah ACC
            App->>Admin: Notifikasi Approval Selesai
            Admin->>App: Lakukan Stamp Tanggal Efektif & QR Code
            App->>DB: Simpan kode verifikasi & metadata dokumen final
        end
    else Dokumen Ditolak (Reject)
        Approver->>App: Submit Rejection + Alasan Perbaikan
        App->>DB: Catat alasan reject & tandai status revisi
        App->>Mail: Kirim notifikasi revisi ke Admin & PIC
    end
```

---

## 3. Matriks Aktor & Peran

| Aktor | Peran & Hak Akses |
|---|---|
| **Admin QMS** | Monitoring keseluruhan status dokumen, kelola departemen, setup matriks approval, date stamping, arsip dokumen |
| **PIC / Owner** | Review dokumen tahunan/berkala, ajukan revisi, upload draf dokumen baru |
| **Approver 1 (Prepared)** | Review draf teknis awal melalui tautan aman ber-token (`/acc/:token`) |
| **Approver 2 (Checked)** | Verifikasi kesesuaian prosedur dan standar kerja |
| **Approver 3 (Approved)** | Pengesahan akhir manajemen sebelum prosedur berlaku |
| **Auditor / Verifier** | Verifikasi keaslian dokumen via QR Code (`/verify/:code`) tanpa perlu login |
