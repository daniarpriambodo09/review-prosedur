import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatToDDMonYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\./g, ':');
}

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    let procedures: any[] = [];
    const approversByDoc: Record<string, Record<string, any[]>> = {};
    const actionsByDoc: Record<string, Record<string, any[]>> = {};

    try {
      // 1. Ambil dokumen + status review terbaru + tanggal terakhir review + email schedule
      const procQuery = `
        SELECT 
          pd.nomor_dokumen,
          pd.nama_dokumen,
          pd.level_dokumen,
          pd.tanggal_selesai_approval,
          pd.revisi,
          pd.owner,
          pd.pic,
          pd.email,
          COALESCE(dr.status, 'Menunggu') as status_review,
          COALESCE(pd.last_reviewed_at, dr.updated_at, dr.created_at) as terakhir_direview,
          es.last_sent_at,
          es.email_status,
          es.scheduled_email_at
        FROM procedure_documents pd
        LEFT JOIN LATERAL (
          SELECT status, updated_at, created_at
          FROM document_reviews 
          WHERE nomor_dokumen = pd.nomor_dokumen 
          ORDER BY updated_at DESC, id DESC 
          LIMIT 1
        ) dr ON TRUE
        LEFT JOIN email_schedules es ON es.nomor_dokumen = pd.nomor_dokumen
        ORDER BY pd.owner ASC, pd.nomor_dokumen ASC;
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

    // Helper untuk memformat nama approver per role:
    // Menampilkan approver terdaftar, dan bila sedang/sudah ada siklus approval mencantumkan status ACC atau Pending
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

        // Sertakan juga approver terdaftar yang belum masuk ke action siklus (jika ada)
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
    workbook.creator = 'Sistem Review Prosedur';
    workbook.lastModifiedBy = 'Admin Quality Assurance';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 1: Matriks Audit Status Prosedur
    // ──────────────────────────────────────────────────────────────────────────
    const ws1 = workbook.addWorksheet('Matriks Audit Prosedur', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 4, showGridLines: true }],
      pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4 Landscape
    });

    // Judul Header Dokumen Audit (Kolom A s/d N: 14 Kolom)
    ws1.mergeCells('A1:N1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'MATRIKS REVIEW DAN STATUS DOKUMEN PROSEDUR (AUDIT MUTU ISO 9001 / IATF 16949)';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(1).height = 36;

    // Sub-header informasi tanggal cetak & sistem
    ws1.mergeCells('A2:N2');
    const subCell = ws1.getCell('A2');
    subCell.value = `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB | Total Dokumen Terdaftar: ${procedures.length}`;
    subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(2).height = 20;

    // Baris kosong pemisah
    ws1.getRow(3).height = 10;

    // Kolom Header Tabel (Baris 4: 14 Kolom rapi dan presisi)
    const headers = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nomor Dokumen', key: 'nomor_dokumen', width: 22 },
      { header: 'Nama Dokumen Prosedur', key: 'nama_dokumen', width: 42 },
      { header: 'Level', key: 'level', width: 8 },
      { header: 'Rev', key: 'rev', width: 8 },
      { header: 'Owner (Dept)', key: 'owner', width: 15 },
      { header: 'PIC', key: 'pic', width: 18 },
      { header: 'Target Approval', key: 'target_date', width: 18 },
      { header: 'Status Review', key: 'status_review', width: 18 },
      { header: 'Terakhir Direview', key: 'terakhir_direview', width: 22 },
      { header: 'Notifikasi Terkirim', key: 'sent_at', width: 22 },
      { header: 'Prepared By (ACC)', key: 'prepared', width: 28 },
      { header: 'Checked By (ACC)', key: 'checked', width: 28 },
      { header: 'Approved By (ACC)', key: 'approved', width: 28 },
    ];

    ws1.getRow(4).values = headers.map(h => h.header);
    ws1.getRow(4).height = 30;

    headers.forEach((h, idx) => {
      ws1.getColumn(idx + 1).width = h.width;
      const cell = ws1.getRow(4).getCell(idx + 1);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });

    // Aktifkan Filter Otomatis di Excel untuk Baris Header
    ws1.autoFilter = 'A4:N4';

    // Isi Baris Data
    procedures.forEach((doc, idx) => {
      const preparedText = formatRoleApprovers(doc.nomor_dokumen, 'prepared');
      const checkedText = formatRoleApprovers(doc.nomor_dokumen, 'checked');
      const approvedText = formatRoleApprovers(doc.nomor_dokumen, 'approved');
      const reviewDateText = formatDateTime(doc.terakhir_direview);

      const rowValues = [
        idx + 1,
        doc.nomor_dokumen,
        doc.nama_dokumen,
        doc.level_dokumen || '-',
        doc.revisi ?? '0',
        doc.owner,
        doc.pic,
        formatToDDMonYYYY(doc.tanggal_selesai_approval),
        doc.status_review,
        reviewDateText,
        doc.last_sent_at ? formatDateTime(doc.last_sent_at) : (doc.email_status === 'sent' ? 'Terkirim' : '-'),
        preparedText,
        checkedText,
        approvedText,
      ];

      const row = ws1.addRow(rowValues);

      // Hitung tinggi baris dinamis agar konten multi-line pada approver tidak terpotong
      const countLines = (str: string) => (str ? (str.match(/\n/g) || []).length + 1 : 1);
      const maxLines = Math.max(
        1,
        countLines(preparedText),
        countLines(checkedText),
        countLines(approvedText),
        Math.ceil((doc.nama_dokumen || '').length / 42)
      );
      row.height = Math.max(26, maxLines * 18);

      // Styling per cell
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Alignment kolom
        if (colNumber === 1 || colNumber === 4 || colNumber === 5 || colNumber === 6 || colNumber === 7 || colNumber === 8 || colNumber === 10 || colNumber === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
        } else if (colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else if (colNumber === 9) { // Status Review
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          const val = String(cell.value || '').toLowerCase();
          if (val === 'relevan') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Emerald 100
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } }; // Emerald 800
          } else if (val === 'revisi') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber 100
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF92400E' } }; // Amber 800
          } else if (val === 'obsolete') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red 100
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } }; // Red 800
          } else if (val === 'menunggu') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }; // Sky 100
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } }; // Sky 800
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
          }
        } else if (colNumber >= 12 && colNumber <= 14) {
          // Kolom Approver (Prepared, Checked, Approved)
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Zebra striping untuk baris ganjil/genap (kecuali status review)
        if (colNumber !== 9 && idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

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
    ws2.getColumn(7).width = 20;

    // Header Summary
    ws2.mergeCells('B2:G2');
    const sumTitle = ws2.getCell('B2');
    sumTitle.value = 'RINGKASAN STATUS KEPATUHAN REVIEW PROSEDUR (ISO/IATF AUDIT)';
    sumTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Navy Blue
    sumTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getRow(2).height = 32;

    // Hitung Statistik
    const totalDocs = procedures.length;
    const countRelevan = procedures.filter(p => p.status_review === 'Relevan').length;
    const countRevisi = procedures.filter(p => p.status_review === 'Revisi').length;
    const countObsolete = procedures.filter(p => p.status_review === 'Obsolete').length;
    const countMenunggu = procedures.filter(p => ['Menunggu', 'Belum dikirim', '-'].includes(p.status_review)).length;
    const complianceRate = totalDocs > 0 ? Math.round((countRelevan / totalDocs) * 100) : 0;

    // Tabel KPI Utama
    const kpis = [
      ['Total Dokumen Terdaftar', totalDocs, 'FF0F172A'],
      ['Dokumen Berstatus Relevan (Lolos Review)', countRelevan, 'FF166534'],
      ['Dokumen Sedang Dalam Revisi', countRevisi, 'FFB45309'],
      ['Dokumen Obsolete (Kadaluarsa/Diganti)', countObsolete, 'FF991B1B'],
      ['Dokumen Belum Direview / Menunggu PIC', countMenunggu, 'FF475569'],
      ['Tingkat Kepatuhan Review (% Compliance)', `${complianceRate}%`, 'FF1D4ED8'],
    ];

    ws2.getCell('B4').value = 'Indikator Utama';
    ws2.getCell('B4').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    ws2.mergeCells('C4:D4');
    ws2.getCell('C4').value = 'Nilai';
    ws2.getCell('C4').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    ws2.getCell('C4').alignment = { horizontal: 'center' };

    kpis.forEach((kpi, i) => {
      const r = i + 5;
      ws2.getCell(`B${r}`).value = kpi[0];
      ws2.getCell(`B${r}`).font = { name: 'Arial', size: 10, bold: i === kpis.length - 1 };
      ws2.mergeCells(`C${r}:D${r}`);
      const valCell = ws2.getCell(`C${r}`);
      valCell.value = kpi[1];
      valCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: kpi[2] as string } };
      valCell.alignment = { horizontal: 'center' };
      ws2.getRow(r).height = 24;
    });

    // Breakdown Departemen
    const deptMap: Record<string, { total: number; relevan: number; revisi: number; obsolete: number; menunggu: number }> = {};
    procedures.forEach(p => {
      const dept = p.owner || 'UNKNOWN';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, relevan: 0, revisi: 0, obsolete: 0, menunggu: 0 };
      }
      deptMap[dept].total++;
      if (p.status_review === 'Relevan') deptMap[dept].relevan++;
      else if (p.status_review === 'Revisi') deptMap[dept].revisi++;
      else if (p.status_review === 'Obsolete') deptMap[dept].obsolete++;
      else deptMap[dept].menunggu++;
    });

    const deptStartRow = 13;
    ws2.getCell(`B${deptStartRow}`).value = 'Departemen (Owner)';
    ws2.getCell(`C${deptStartRow}`).value = 'Total Dokumen';
    ws2.getCell(`D${deptStartRow}`).value = 'Relevan';
    ws2.getCell(`E${deptStartRow}`).value = 'Revisi';
    ws2.getCell(`F${deptStartRow}`).value = 'Menunggu';
    ws2.getCell(`G${deptStartRow}`).value = '% Kepatuhan';

    ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
      const c = ws2.getCell(`${col}${deptStartRow}`);
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws2.getRow(deptStartRow).height = 26;

    let curRow = deptStartRow + 1;
    Object.keys(deptMap).sort().forEach(dept => {
      const data = deptMap[dept];
      const deptRate = data.total > 0 ? Math.round((data.relevan / data.total) * 100) : 0;
      ws2.getCell(`B${curRow}`).value = dept;
      ws2.getCell(`C${curRow}`).value = data.total;
      ws2.getCell(`D${curRow}`).value = data.relevan;
      ws2.getCell(`E${curRow}`).value = data.revisi;
      ws2.getCell(`F${curRow}`).value = data.menunggu;
      ws2.getCell(`G${curRow}`).value = `${deptRate}%`;

      ['C', 'D', 'E', 'F', 'G'].forEach(col => {
        ws2.getCell(`${col}${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      });
      ws2.getRow(curRow).height = 22;
      curRow++;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const dateFormatted = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Rekap-Matriks-Audit-Prosedur-${dateFormatted}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating audit excel:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat file Rekap Audit' }, { status: 500 });
  }
}
