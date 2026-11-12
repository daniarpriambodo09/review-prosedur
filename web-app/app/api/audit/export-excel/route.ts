import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Pembersih nomor dokumen: jika ada embel-embel seperti ": Before : MSU-W-07" atau "BEFORE",
 * ambil nomor dokumen terbaru di bagian depan (misal: "MRS-W-26").
 */
function cleanDocumentNumber(docNum: string | null | undefined): string {
  if (!docNum) return '-';
  const clean = docNum.split(/\s*:\s*before\s*:|\s*:\s*before\s*|\s+before\s+/i)[0].trim();
  return clean || docNum;
}

/**
 * Format tanggal khusus format matriks Daftar Induk Dokumen JAI (contoh: 17-Apr-26, 8-Aug-25, 2-Nov-26).
 */
function formatDateExcel(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    const month = months[m - 1];
    const year = String(y).slice(-2);
    return `${d}-${month}-${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const month = months[wib.getUTCMonth()];
  const year = String(wib.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Format tanggal dan waktu untuk rincian log approver (contoh: 03-Nov-2026 05:34).
 */
function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = String(wib.getUTCDate()).padStart(2, '0');
  const month = months[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const mins = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}`;
}

/**
 * Format tanggal dan waktu untuk badge status review di Excel (contoh: 10 Nov 2026, 07:32 WIB)
 * Selaras 100% dengan tampilan status di web UI.
 */
function formatStatusDateTime(dateStr: string | Date | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = String(wib.getUTCDate()).padStart(2, '0');
  const month = months[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const mins = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${mins} WIB`;
}

/**
 * Mendapatkan timestamp status review yang relevan sesuai jenis status dokumen.
 */
function getStatusDateTime(status: string, doc: any): string | null {
  let targetDate: any = null;
  const effectiveLastReviewedAt = doc.last_reviewed_at || doc.dr_updated_at || doc.dr_created_at;
  const effectiveUpdatedAt = doc.dr_updated_at || doc.updated_at;

  switch (status) {
    case 'Telah terkirim':
      targetDate = doc.last_sent_at || effectiveUpdatedAt;
      break;
    case 'Relevan':
      targetDate = effectiveLastReviewedAt || effectiveUpdatedAt || doc.created_at;
      break;
    case 'Revisi':
      targetDate = doc.request_revisi_at || effectiveLastReviewedAt || effectiveUpdatedAt;
      break;
    case 'Obsolete':
      targetDate = effectiveLastReviewedAt || effectiveUpdatedAt;
      break;
    case 'Telah dibaca':
      targetDate = effectiveUpdatedAt;
      break;
    case 'Menunggu':
    case 'Belum dikirim':
      targetDate = doc.scheduled_email_at || effectiveUpdatedAt || doc.created_at;
      break;
    case 'Menunggu ACC Prepared':
    case 'Menunggu ACC Checked':
    case 'Menunggu ACC Approved':
      targetDate = doc.mulai_approval_at || effectiveUpdatedAt || doc.created_at;
      break;
    case 'Ditolak':
      targetDate = effectiveUpdatedAt;
      break;
    default:
      targetDate = effectiveUpdatedAt || doc.created_at;
      break;
  }
  return formatStatusDateTime(targetDate);
}

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    let procedures: any[] = [];
    const approversByDoc: Record<string, Record<string, any[]>> = {};
    const actionsByDoc: Record<string, Record<string, any[]>> = {};

    try {
      // 1. Ambil dokumen + status review terbaru + tanggal terakhir review + email schedule
      //    beserta linimasa Request Revisi, Upload Dokumen, Mulai Approval, dan Selesai Approval
      const procQuery = `
        SELECT 
          pd.nomor_dokumen,
          pd.nama_dokumen,
          pd.level_dokumen,
          pd.tanggal_selesai_approval::text as tanggal_selesai_approval_text,
          pd.tanggal_selesai_approval,
          pd.revisi,
          pd.owner,
          pd.pic,
          pd.email,
          pd.block_activity,
          pd.status as pd_status,
          pd.created_at,
          pd.updated_at,
          pd.last_reviewed_at,
          dr.updated_at as dr_updated_at,
          dr.created_at as dr_created_at,
          CASE
            WHEN c_latest.cycle_status = 'in_progress' AND c_latest.current_stage = 'prepared' THEN 'Menunggu ACC Prepared'
            WHEN c_latest.cycle_status = 'in_progress' AND c_latest.current_stage = 'checked'  THEN 'Menunggu ACC Checked'
            WHEN c_latest.cycle_status = 'in_progress' AND c_latest.current_stage = 'approved' THEN 'Menunggu ACC Approved'
            WHEN pd.status IN ('Relevan', 'Revisi', 'Obsolete', 'Menunggu ACC Prepared', 'Menunggu ACC Checked', 'Menunggu ACC Approved', 'Ditolak') THEN pd.status
            WHEN dr.status IN ('Relevan', 'Revisi', 'Obsolete') THEN dr.status
            WHEN es.email_status = 'pending' THEN 'Belum dikirim'
            WHEN es.email_status = 'sent' AND (es.last_sent_at IS NOT NULL AND es.last_sent_at >= NOW() - INTERVAL '2 months') THEN 'Telah terkirim'
            WHEN pd.status IS NOT NULL AND pd.status != '' THEN pd.status
            ELSE 'Menunggu'
          END AS status_review,
          COALESCE(pd.last_reviewed_at, dr.updated_at, dr.created_at) as terakhir_direview,
          es.last_sent_at,
          es.email_status,
          es.scheduled_email_at,
          COALESCE(prr.created_at, dr_rev.updated_at, (CASE WHEN pd.status = 'Revisi' THEN pd.last_reviewed_at ELSE NULL END)) as request_revisi_at,
          COALESCE(
            pf_trig.uploaded_at,
            (CASE 
              WHEN prr.created_at IS NOT NULL OR dr_rev.updated_at IS NOT NULL OR c_latest.id IS NOT NULL OR pd.revisi != '0' 
              THEN pf_admin.uploaded_at 
              ELSE NULL 
            END)
          ) as upload_dokumen_at,
          c_latest.started_at as mulai_approval_at,
          CASE 
            WHEN c_latest.cycle_status = 'completed' AND c_latest.completed_at IS NOT NULL THEN c_latest.completed_at
            WHEN c_latest.cycle_status = 'in_progress' THEN NULL
            ELSE pd.tanggal_selesai_approval::timestamp
          END as selesai_approval_at
        FROM procedure_documents pd
        LEFT JOIN LATERAL (
          SELECT status, updated_at, created_at
          FROM document_reviews 
          WHERE nomor_dokumen = pd.nomor_dokumen 
          ORDER BY updated_at DESC, id DESC 
          LIMIT 1
        ) dr ON TRUE
        LEFT JOIN email_schedules es ON es.nomor_dokumen = pd.nomor_dokumen
        LEFT JOIN LATERAL (
          SELECT created_at FROM pic_review_requests
          WHERE nomor_dokumen = pd.nomor_dokumen
          ORDER BY id DESC LIMIT 1
        ) prr ON TRUE
        LEFT JOIN LATERAL (
          SELECT updated_at, created_at FROM document_reviews
          WHERE nomor_dokumen = pd.nomor_dokumen AND status = 'Revisi'
          ORDER BY updated_at DESC LIMIT 1
        ) dr_rev ON TRUE
        LEFT JOIN LATERAL (
          SELECT id, started_at, completed_at, triggered_by_file_id, status AS cycle_status, current_stage
          FROM procedure_approval_cycles
          WHERE nomor_dokumen = pd.nomor_dokumen AND status != 'cancelled'
          ORDER BY id DESC LIMIT 1
        ) c_latest ON TRUE
        LEFT JOIN procedure_files pf_trig ON pf_trig.id = c_latest.triggered_by_file_id
        LEFT JOIN LATERAL (
          SELECT uploaded_at FROM procedure_files
          WHERE nomor_dokumen = pd.nomor_dokumen AND uploaded_by != 'system' AND file_path NOT LIKE '%_stamped.pdf%'
          ORDER BY version DESC, id DESC LIMIT 1
        ) pf_admin ON TRUE
        ORDER BY 
          CASE WHEN pd.block_activity IS NULL OR pd.block_activity = '' THEN 0 ELSE 1 END,
          pd.block_activity ASC,
          pd.owner ASC,
          pd.nomor_dokumen ASC;
      `;
      const procRes = await client.query(procQuery);
      procedures = procRes.rows;

      // 2. Ambil seluruh approver terdaftar di procedure_approvers
      const paRes = await client.query(`
        SELECT nomor_dokumen, role, nama, email, grup, urutan 
        FROM procedure_approvers 
        ORDER BY nomor_dokumen, role, urutan ASC, id ASC
      `);
      for (const r of paRes.rows) {
        if (!approversByDoc[r.nomor_dokumen]) approversByDoc[r.nomor_dokumen] = {};
        const roleKey = (r.role || '').toLowerCase();
        if (!approversByDoc[r.nomor_dokumen][roleKey]) approversByDoc[r.nomor_dokumen][roleKey] = [];
        approversByDoc[r.nomor_dokumen][roleKey].push(r);
      }

      // 3. Ambil data approval cycle terbaru untuk setiap dokumen (beserta action approval)
      const cyclesQuery = `
        WITH RankedCycles AS (
          SELECT 
            c.id as cycle_id,
            c.nomor_dokumen,
            c.status as cycle_status,
            c.current_stage,
            c.completed_at,
            ROW_NUMBER() OVER (PARTITION BY c.nomor_dokumen ORDER BY c.id DESC) as rn
          FROM procedure_approval_cycles c
          WHERE c.status != 'cancelled'
        )
        SELECT 
          rc.cycle_id,
          rc.nomor_dokumen,
          rc.cycle_status,
          pa.role,
          pa.nama,
          pa.email,
          pa.acc_status,
          pa.acc_at
        FROM RankedCycles rc
        JOIN procedure_approval_actions pa ON pa.cycle_id = rc.cycle_id
        WHERE rc.rn = 1
        ORDER BY pa.id ASC;
      `;
      const cyclesRes = await client.query(cyclesQuery);
      for (const row of cyclesRes.rows) {
        if (!actionsByDoc[row.nomor_dokumen]) actionsByDoc[row.nomor_dokumen] = {};
        const roleKey = (row.role || '').toLowerCase();
        if (!actionsByDoc[row.nomor_dokumen][roleKey]) actionsByDoc[row.nomor_dokumen][roleKey] = [];
        actionsByDoc[row.nomor_dokumen][roleKey].push(row);
      }
    } finally {
      client.release();
    }

    // 4. Sinkronisasi Filter: Ambil parameter filter dari request URL (Status, Bulan, Search)
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || '';
    const monthParam  = searchParams.get('month');
    const searchParam = searchParams.get('search') || '';

    // Filter status
    if (statusParam) {
      procedures = procedures.filter(p => {
        if (statusParam === '-') {
          return p.status_review === '-' || p.status_review === 'Menunggu';
        }
        return p.status_review === statusParam;
      });
    }

    // Filter bulan (0-indexed: 0 = Januari, 10 = November, dst.)
    if (monthParam !== null && monthParam !== '' && !isNaN(Number(monthParam))) {
      const targetMonth = parseInt(monthParam, 10);
      procedures = procedures.filter(p => {
        const rawDate = p.tanggal_selesai_approval_text || p.tanggal_selesai_approval;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        return d.getMonth() === targetMonth;
      });
    }

    // Filter pencarian teks
    if (searchParam) {
      const q = searchParam.toLowerCase().trim();
      procedures = procedures.filter(p => {
        const docNum = (p.nomor_dokumen || '').toLowerCase();
        const docName = (p.nama_dokumen || '').toLowerCase();
        const owner = (p.owner || '').toLowerCase();
        const pic = (p.pic || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const status = (p.status_review || '').toLowerCase();
        const block = (p.block_activity || '').toLowerCase();
        return (
          docNum.includes(q) ||
          docName.includes(q) ||
          owner.includes(q) ||
          pic.includes(q) ||
          email.includes(q) ||
          status.includes(q) ||
          block.includes(q)
        );
      });
    }

    // Helper untuk memformat nama approver per role
    const formatRoleApprovers = (docNum: string, role: string): string => {
      const registered = approversByDoc[docNum]?.[role] || [];
      const actions = actionsByDoc[docNum]?.[role] || [];

      if (actions.length > 0) {
        const formattedList = actions.map(act => {
          const nama = act.nama || '-';
          if (act.acc_status === 'acc' && act.acc_at) {
            return `${nama}\n(ACC: ${formatDateTime(act.acc_at)})`;
          } else if (act.acc_status === 'rejected') {
            return `${nama} (Ditolak)`;
          } else if (act.acc_status === 'pending') {
            return `${nama} (Pending)`;
          }
          return nama;
        });

        // Sertakan approver terdaftar yang belum masuk ke action siklus (jika ada)
        const actionEmails = new Set(actions.map(a => (a.email || '').toLowerCase().trim()));
        const actionNames = new Set(actions.map(a => (a.nama || '').toLowerCase().trim()));
        for (const reg of registered) {
          const regEmail = (reg.email || '').toLowerCase().trim();
          const regNama = (reg.nama || '').toLowerCase().trim();
          if ((!regEmail || !actionEmails.has(regEmail)) && (!regNama || !actionNames.has(regNama))) {
            formattedList.push(reg.nama);
          }
        }

        return formattedList.length > 0 ? formattedList.join('\n') : '-';
      }

      // Jika belum ada siklus approval, gunakan approver dari procedure_approvers
      if (registered.length > 0) {
        const names = registered.map(r => r.nama).filter(Boolean);
        return names.length > 0 ? names.join('\n') : '-';
      }

      return '-';
    };

    // ── Build Excel Workbook with ExcelJS ──────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT. JATIM AUTOCOMP INDONESIA';
    workbook.lastModifiedBy = 'Admin Quality Assurance';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 1: DAFTAR INDUK DOKUMEN (Sesuai format resmi PT. JAI)
    // ──────────────────────────────────────────────────────────────────────────
    const ws1 = workbook.addWorksheet('DAFTAR INDUK DOKUMEN', {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 5, showGridLines: true }],
      pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4 Landscape
    });

    const endColLetter = 'T';

    // 1. Kop / Header Judul Perusahaan (Baris 1: PT. JATIM AUTOCOMP INDONESIA)
    // Diletakkan pada panel kiri (A1:D1) yang dibekukan (frozen) agar tidak ikut bergeser saat di-scroll ke samping
    ws1.mergeCells('A1:D1');
    const c1 = ws1.getCell('A1');
    c1.value = 'PT. JATIM AUTOCOMP INDONESIA';
    c1.font = { name: 'Arial Narrow', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; // Soft light steel blue
    c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    c1.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };

    ws1.mergeCells(`E1:${endColLetter}1`);
    const r1 = ws1.getCell('E1');
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    r1.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
    ws1.getRow(1).height = 22;

    // 2. Judul Utama (Baris 2: DAFTAR INDUK DOKUMEN)
    ws1.mergeCells('A2:D2');
    const c2 = ws1.getCell('A2');
    c2.value = 'DAFTAR INDUK DOKUMEN';
    c2.font = { name: 'Arial Narrow', size: 18, bold: true, color: { argb: 'FF0F172A' } };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    c2.border = {
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };

    ws1.mergeCells(`E2:${endColLetter}2`);
    const r2 = ws1.getCell('E2');
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    r2.border = {
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
    ws1.getRow(2).height = 34;

    // 3. Sub-header informasi tanggal cetak & sistem
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const filterLabels: string[] = [];
    if (monthParam !== null && monthParam !== '' && !isNaN(Number(monthParam))) {
      const mIdx = parseInt(monthParam, 10);
      filterLabels.push(`Bulan: ${monthNames[mIdx] || monthParam}`);
    }
    if (statusParam) {
      filterLabels.push(`Status: ${statusParam}`);
    }
    if (searchParam) {
      filterLabels.push(`Pencarian: "${searchParam}"`);
    }
    const filterText = filterLabels.length > 0 ? ` [Filter Aktif: ${filterLabels.join(' | ')}]` : '';

    ws1.mergeCells('A3:D3');
    const c3 = ws1.getCell('A3');
    c3.value = `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB | Total Dokumen Ditampilkan: ${procedures.length}${filterText}`;
    c3.font = { name: 'Arial Narrow', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
    c3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    c3.border = {
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };

    ws1.mergeCells(`E3:${endColLetter}3`);
    const r3 = ws1.getCell('E3');
    r3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
    r3.border = {
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
    ws1.getRow(3).height = 20;

    // Baris 4: Spacing pemisah
    ws1.getRow(4).height = 8;

    // 4. Kolom Header Tabel (Baris 5: Warna Kuning Elegan Sesuai Gambar Referensi)
    const headers = [
      { header: 'NO', key: 'no', width: 5 },
      { header: 'BLOCK ACTIVITY', key: 'block_activity', width: 18 },
      { header: 'DOKUMEN', key: 'dokumen', width: 44 },
      { header: 'NO DOKUMEN', key: 'no_dokumen', width: 16 },
      { header: 'REV', key: 'rev', width: 7 },
      { header: 'LEVEL', key: 'level', width: 7 },
      { header: 'OWNER', key: 'owner', width: 12 },
      { header: 'PIC', key: 'pic', width: 8 },
      { header: 'STATUS REVIEW', key: 'status_review', width: 26 },
      { header: 'TANGGAL PENGAJUAN', key: 'tgl_pengajuan', width: 15 },
      { header: 'TANGGAL SELESAI REVISI', key: 'tgl_selesai_revisi', width: 15 },
      { header: 'TANGGAL MULAI APPROVAL', key: 'tgl_mulai_approval', width: 15 },
      { header: 'TANGGAL SELESAI APPROVAL', key: 'tgl_selesai_approval', width: 15 },
      { header: 'TANGGAL UPLOAD DI INTRANET\n(SEBELUM IMPLEMENTASI)', key: 'tgl_intranet', width: 17 },
      { header: 'TANGGAL IMPLEMENTASI', key: 'tgl_implementasi', width: 15 },
      { header: 'TANGGAL SOSIALISASI BY EMAIL', key: 'tgl_sosialisasi', width: 15 },
      { header: 'TANGGAL OBSOLETE', key: 'tgl_obsolete', width: 14 },
      { header: 'PREPARED BY (ACC)', key: 'prepared', width: 25 },
      { header: 'CHECKED BY (ACC)', key: 'checked', width: 25 },
      { header: 'APPROVED BY (ACC)', key: 'approved', width: 25 },
    ];

    ws1.getRow(5).values = headers.map(h => h.header);
    ws1.getRow(5).height = 38;

    headers.forEach((h, idx) => {
      ws1.getColumn(idx + 1).width = h.width;
      const cell = ws1.getRow(5).getCell(idx + 1);
      cell.font = { name: 'Arial Narrow', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Soft Pastel Yellow
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Aktifkan Filter Otomatis di Excel untuk Baris Header
    ws1.autoFilter = `A5:${endColLetter}5`;

    // 5. Isi Baris Data Mulai Baris 6
    const startDataRow = 6;
    procedures.forEach((doc, idx) => {
      const preparedText = formatRoleApprovers(doc.nomor_dokumen, 'prepared');
      const checkedText = formatRoleApprovers(doc.nomor_dokumen, 'checked');
      const approvedText = formatRoleApprovers(doc.nomor_dokumen, 'approved');

      // Tanggal linimasa
      const tglSelesai = doc.selesai_approval_at || (doc.status_review === 'Relevan' ? (doc.tanggal_selesai_approval_text || doc.tanggal_selesai_approval) : null);
      const tglIntranet = tglSelesai;
      const tglImplementasi = tglSelesai;
      const tglObsolete = doc.status_review === 'Obsolete' ? doc.terakhir_direview : null;

      // Nomor dokumen bersih tanpa kata ": Before :"
      const cleanedNomorDokumen = cleanDocumentNumber(doc.nomor_dokumen);

      const rowValues = [
        idx + 1,
        doc.block_activity || doc.owner || '-',
        doc.nama_dokumen,
        cleanedNomorDokumen,
        doc.revisi ?? '0',
        doc.level_dokumen || '-',
        doc.owner,
        doc.pic,
        doc.status_review,
        formatDateExcel(doc.request_revisi_at),
        formatDateExcel(doc.upload_dokumen_at),
        formatDateExcel(doc.mulai_approval_at),
        formatDateExcel(tglSelesai),
        formatDateExcel(tglIntranet),
        formatDateExcel(tglImplementasi),
        formatDateExcel(doc.last_sent_at),
        formatDateExcel(tglObsolete),
        preparedText,
        checkedText,
        approvedText,
      ];

      const row = ws1.addRow(rowValues);

      // Hitung tinggi baris dinamis agar approver multi-line & tanggal status tidak terpotong
      const statusTimeStr = getStatusDateTime(doc.status_review, doc);
      const countLines = (str: string) => (str ? (str.match(/\n/g) || []).length + 1 : 1);
      const maxLines = Math.max(
        statusTimeStr ? 2 : 1,
        countLines(preparedText),
        countLines(checkedText),
        countLines(approvedText),
        Math.ceil((doc.nama_dokumen || '').length / 44)
      );
      row.height = Math.max(30, maxLines * 16);

      // Styling per cell
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial Narrow', size: 9.5, color: { argb: 'FF1E293B' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };

        if (colNumber === 3) {
          // Kolom Dokumen (Nama Dokumen)
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.font = { name: 'Arial Narrow', size: 9.5, color: { argb: 'FF1D4ED8' } }; // Blue text seperti hyperlink
        } else if (colNumber === 4) {
          // Kolom Nomor Dokumen
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial Narrow', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        } else if (colNumber === 9) {
          // Status Review Badge dengan Tanggal Status Sesuai Web UI
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          const val = String(doc.status_review || '').toLowerCase();
          let fontColor = { argb: 'FF166534' };
          let bgColor = { argb: 'FFDCFCE7' };

          if (val === 'relevan') {
            bgColor = { argb: 'FFDCFCE7' };
            fontColor = { argb: 'FF166534' };
          } else if (val === 'revisi') {
            bgColor = { argb: 'FFFEF3C7' };
            fontColor = { argb: 'FF92400E' };
          } else if (val === 'obsolete') {
            bgColor = { argb: 'FFFEE2E2' };
            fontColor = { argb: 'FF991B1B' };
          } else if (val.startsWith('menunggu acc')) {
            bgColor = { argb: 'FFF3E8FF' };
            fontColor = { argb: 'FF6B21A8' };
          } else if (val === 'ditolak') {
            bgColor = { argb: 'FFFFE4E6' };
            fontColor = { argb: 'FF9F1239' };
          } else if (val === 'telah terkirim') {
            bgColor = { argb: 'FFE0F2FE' };
            fontColor = { argb: 'FF0369A1' };
          } else if (val === 'belum dikirim') {
            bgColor = { argb: 'FFF1F5F9' };
            fontColor = { argb: 'FF475569' };
          } else if (val === 'telah dibaca') {
            bgColor = { argb: 'FFDBEAFE' };
            fontColor = { argb: 'FF1E40AF' };
          } else if (val === 'menunggu') {
            bgColor = { argb: 'FFE0F2FE' };
            fontColor = { argb: 'FF0369A1' };
          } else {
            bgColor = { argb: 'FFF8FAFC' };
            fontColor = { argb: 'FF64748B' };
          }

          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: bgColor };

          if (statusTimeStr) {
            cell.value = {
              richText: [
                {
                  text: doc.status_review + '\n',
                  font: { name: 'Arial Narrow', size: 9.5, bold: true, color: fontColor },
                },
                {
                  text: `(${statusTimeStr})`,
                  font: { name: 'Arial Narrow', size: 8, italic: true, color: fontColor },
                },
              ],
            };
          } else {
            cell.value = doc.status_review;
            cell.font = { name: 'Arial Narrow', size: 9.5, bold: true, color: fontColor };
          }
        } else if (colNumber >= 18) {
          // Kolom Approver (Prepared, Checked, Approved)
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.font = { name: 'Arial Narrow', size: 9, color: { argb: 'FF334155' } };
        } else {
          // Kolom lainnya (No, Block Activity, Rev, Level, Owner, PIC, Tanggal 10-17)
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Zebra striping tipis untuk baris ganjil (kecuali kolom badge status)
        if (colNumber !== 9 && idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    // 6. Merge Vertikal untuk BLOCK ACTIVITY (Kolom 2) jika ada beberapa baris berurutan dengan Block Activity yang sama
    if (procedures.length > 0) {
      let mergeStart = startDataRow;
      let currentBlock = procedures[0]?.block_activity || procedures[0]?.owner || '';

      for (let i = 1; i < procedures.length; i++) {
        const block = procedures[i]?.block_activity || procedures[i]?.owner || '';
        const rowIdx = startDataRow + i;
        if (block && block === currentBlock) {
          // masih kelompok yang sama
        } else {
          // selesai kelompok sebelumnya jika span > 1 baris
          if (mergeStart < rowIdx - 1 && currentBlock && currentBlock !== '-') {
            ws1.mergeCells(mergeStart, 2, rowIdx - 1, 2);
            const mCell = ws1.getCell(mergeStart, 2);
            mCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            mCell.font = { name: 'Arial Narrow', size: 9.5, bold: true, color: { argb: 'FF334155' } };
          }
          mergeStart = rowIdx;
          currentBlock = block;
        }
      }
      // Periksa kelompok terakhir
      if (mergeStart < startDataRow + procedures.length - 1 && currentBlock && currentBlock !== '-') {
        ws1.mergeCells(mergeStart, 2, startDataRow + procedures.length - 1, 2);
        const mCell = ws1.getCell(mergeStart, 2);
        mCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        mCell.font = { name: 'Arial Narrow', size: 9.5, bold: true, color: { argb: 'FF334155' } };
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 2: Ringkasan & Kepatuhan Audit (Executive Summary)
    // ──────────────────────────────────────────────────────────────────────────
    const ws2 = workbook.addWorksheet('Ringkasan Kepatuhan Audit', {
      views: [{ showGridLines: true }],
    });

    ws2.getColumn(1).width = 4;
    ws2.getColumn(2).width = 32;
    ws2.getColumn(3).width = 16;
    ws2.getColumn(4).width = 16;
    ws2.getColumn(5).width = 16;
    ws2.getColumn(6).width = 16;
    ws2.getColumn(7).width = 16;
    ws2.getColumn(8).width = 20;

    // Header Summary
    ws2.mergeCells('B2:H2');
    const sumTitle = ws2.getCell('B2');
    sumTitle.value = `RINGKASAN STATUS KEPATUHAN REVIEW PROSEDUR (ISO/IATF AUDIT)${filterLabels.length > 0 ? ` - ${filterLabels.join(' | ')}` : ''}`;
    sumTitle.font = { name: 'Arial Narrow', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Navy Blue
    sumTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getRow(2).height = 32;

    // Hitung Statistik
    const totalDocs = procedures.length;
    const countRelevan = procedures.filter(p => p.status_review === 'Relevan').length;
    const countRevisi = procedures.filter(p => p.status_review === 'Revisi').length;
    const countObsolete = procedures.filter(p => p.status_review === 'Obsolete').length;
    const countApproval = procedures.filter(p => String(p.status_review).startsWith('Menunggu ACC')).length;
    const countMenunggu = procedures.filter(p => ['Menunggu', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca', '-'].includes(p.status_review)).length;
    const complianceRate = totalDocs > 0 ? Math.round((countRelevan / totalDocs) * 100) : 0;

    // Tabel KPI Utama
    const kpis = [
      ['Total Dokumen Terdaftar', totalDocs, 'FF0F172A'],
      ['Dokumen Berstatus Relevan (Lolos Review)', countRelevan, 'FF166534'],
      ['Dokumen Sedang Dalam Revisi', countRevisi, 'FFB45309'],
      ['Dokumen Dalam Alur Approval (Prepared/Checked/Approved)', countApproval, 'FF6B21A8'],
      ['Dokumen Obsolete (Kadaluarsa/Diganti)', countObsolete, 'FF991B1B'],
      ['Dokumen Belum Direview / Menunggu PIC', countMenunggu, 'FF475569'],
      ['Tingkat Kepatuhan Review (% Compliance)', `${complianceRate}%`, 'FF1D4ED8'],
    ];

    ws2.getCell('B4').value = 'Indikator Utama';
    ws2.getCell('B4').font = { name: 'Arial Narrow', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    ws2.mergeCells('C4:D4');
    ws2.getCell('C4').value = 'Nilai';
    ws2.getCell('C4').font = { name: 'Arial Narrow', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    ws2.getCell('C4').alignment = { horizontal: 'center' };

    kpis.forEach((kpi, i) => {
      const r = i + 5;
      ws2.getCell(`B${r}`).value = kpi[0];
      ws2.getCell(`B${r}`).font = { name: 'Arial Narrow', size: 10, bold: i === kpis.length - 1 };
      ws2.mergeCells(`C${r}:D${r}`);
      const valCell = ws2.getCell(`C${r}`);
      valCell.value = kpi[1];
      valCell.font = { name: 'Arial Narrow', size: 11, bold: true, color: { argb: kpi[2] as string } };
      valCell.alignment = { horizontal: 'center' };
      ws2.getRow(r).height = 24;
    });

    // Breakdown Departemen
    const deptMap: Record<string, { total: number; relevan: number; revisi: number; approval: number; obsolete: number; menunggu: number }> = {};
    procedures.forEach(p => {
      const dept = p.owner || 'UNKNOWN';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, relevan: 0, revisi: 0, approval: 0, obsolete: 0, menunggu: 0 };
      }
      deptMap[dept].total++;
      if (p.status_review === 'Relevan') deptMap[dept].relevan++;
      else if (p.status_review === 'Revisi') deptMap[dept].revisi++;
      else if (String(p.status_review).startsWith('Menunggu ACC')) deptMap[dept].approval++;
      else if (p.status_review === 'Obsolete') deptMap[dept].obsolete++;
      else deptMap[dept].menunggu++;
    });

    const deptStartRow = 14;
    ws2.getCell(`B${deptStartRow}`).value = 'Departemen (Owner)';
    ws2.getCell(`C${deptStartRow}`).value = 'Total Dokumen';
    ws2.getCell(`D${deptStartRow}`).value = 'Relevan';
    ws2.getCell(`E${deptStartRow}`).value = 'Revisi';
    ws2.getCell(`F${deptStartRow}`).value = 'Dalam Approval';
    ws2.getCell(`G${deptStartRow}`).value = 'Menunggu';
    ws2.getCell(`H${deptStartRow}`).value = '% Kepatuhan';

    ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const c = ws2.getCell(`${col}${deptStartRow}`);
      c.font = { name: 'Arial Narrow', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws2.getRow(deptStartRow).height = 26;

    let curRow = deptStartRow + 1;
    Object.keys(deptMap).sort().forEach(dept => {
      const data = deptMap[dept];
      const deptRate = data.total > 0 ? Math.round((data.relevan / data.total) * 100) : 0;
      ws2.getCell(`B${curRow}`).value = dept;
      ws2.getCell(`B${curRow}`).font = { name: 'Arial Narrow', size: 9.5 };
      ws2.getCell(`C${curRow}`).value = data.total;
      ws2.getCell(`C${curRow}`).font = { name: 'Arial Narrow', size: 9.5 };
      ws2.getCell(`D${curRow}`).value = data.relevan;
      ws2.getCell(`D${curRow}`).font = { name: 'Arial Narrow', size: 9.5 };
      ws2.getCell(`E${curRow}`).value = data.revisi;
      ws2.getCell(`E${curRow}`).font = { name: 'Arial Narrow', size: 9.5 };
      ws2.getCell(`F${curRow}`).value = data.approval;
      ws2.getCell(`F${curRow}`).font = { name: 'Arial Narrow', size: 9.5 };
      ws2.getCell(`G${curRow}`).value = data.menunggu;
      ws2.getCell(`G${curRow}`).font = { name: 'Arial Narrow', size: 9.5 };
      ws2.getCell(`H${curRow}`).value = `${deptRate}%`;
      ws2.getCell(`H${curRow}`).font = { name: 'Arial Narrow', size: 9.5, bold: true };

      ['C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
        ws2.getCell(`${col}${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      });
      ws2.getRow(curRow).height = 22;
      curRow++;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const dateFormatted = new Date().toISOString().slice(0, 10);
    const monthLabel = (monthParam !== null && monthParam !== '' && !isNaN(Number(monthParam))) ? `_${monthNames[parseInt(monthParam, 10)] || monthParam}` : '';
    const statusLabel = statusParam ? `_${statusParam.replace(/\s+/g, '_')}` : '';
    const filename = `DAFTAR_INDUK_DOKUMEN_${dateFormatted}${monthLabel}${statusLabel}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating audit excel:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat file Rekap Audit' }, { status: 500 });
  }
}
