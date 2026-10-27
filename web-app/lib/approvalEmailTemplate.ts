// lib/approvalEmailTemplate.ts
//
// Builder HTML/text untuk email permintaan ACC (Prepared/Checked/Approved).
// Gaya visual disamakan dengan reminder email review (scripts/send_email.py)
// supaya konsisten, warna header dibedakan (ungu) agar mudah dibedakan dari
// email reminder review PIC (biru).

import type { ApprovalRole } from './approvalCycle';
import { STAGE_DISPLAY } from './approvalCycle';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RejectionInfoParam {
  role: ApprovalRole | string;
  roleLabel: string;
  nama: string | null;
  email: string;
  reason: string;
  rejectedAt?: string | null;
}

export interface AccEmailParams {
  nama: string | null;
  role: ApprovalRole;
  namaDokumen: string;
  nomorDokumen: string;
  accLink: string;
  picApprovalLink?: string;
  rejectionNote?: RejectionInfoParam | null;
}

export function buildAccEmailHtml(params: AccEmailParams): string {
  const { nama, role, namaDokumen, nomorDokumen, accLink, rejectionNote } = params;
  const greeting  = nama ? `Dear. ${escapeHtml(nama)},` : 'Dear. Bapak/Ibu Pejabat Approver,';
  const roleLabel = STAGE_DISPLAY[role];
  const accLinkSafe = escapeHtml(accLink);
  const picApprovalLink = params.picApprovalLink || `${accLink}${accLink.includes('?') ? '&' : '?'}redirect=/pic-approval`;
  const picApprovalLinkSafe = escapeHtml(picApprovalLink);

  let rejectionBannerHtml = '';
  if (rejectionNote) {
    const rejectionAuthor = rejectionNote.nama
      ? `${escapeHtml(rejectionNote.nama)} (${escapeHtml(rejectionNote.email)})`
      : escapeHtml(rejectionNote.email);

    let rejectedAtText = '';
    if (rejectionNote.rejectedAt) {
      try {
        const d = new Date(rejectionNote.rejectedAt).toLocaleString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        rejectedAtText = ` pada ${d}`;
      } catch {}
    }

    rejectionBannerHtml = `
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background-color:#fff1f2;border:1px solid #fecdd3;border-left:4px solid #e11d48;
                    border-radius:8px;margin-bottom:24px;border-collapse:collapse;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 6px;color:#9f1239;font-size:13px;font-weight:700;">
              ⚠️ Dokumen Hasil Revisi (Siklus Sebelumnya Ditolak)
            </p>
            <p style="margin:0 0 10px;color:#4c0519;font-size:13px;line-height:1.5;">
              Dokumen ini diajukan kembali ke alur persetujuan setelah sebelumnya mendapatkan <strong>penolakan</strong> pada tahap <strong>${escapeHtml(rejectionNote.roleLabel)}</strong> oleh <strong>${rejectionAuthor}</strong>${rejectedAtText}.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background-color:#ffffff;border:1px dashed #fda4af;border-radius:6px;">
              <tr>
                <td style="padding:12px 14px;">
                  <p style="margin:0 0 4px;color:#881337;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                    Catatan / Alasan Penolakan:
                  </p>
                  <p style="margin:0;color:#1e293b;font-size:13px;line-height:1.5;font-style:italic;">
                    &ldquo;${escapeHtml(rejectionNote.reason)}&rdquo;
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0;color:#881337;font-size:11px;line-height:1.4;">
              Harap periksa lembar dokumen hasil revisi ini dengan seksama sebelum memberikan persetujuan Anda.
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Permintaan Approval Dokumen Prosedur</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:36px 12px;">
    <tr>
      <td align="center">
        <!-- Container Utama Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 16px rgba(15,23,42,0.06);border:1px solid #e2e8f0;
                      max-width:600px;width:100%;">
          
          <!-- Header Card Modern -->
          <tr>
            <td style="background-color:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);padding:30px 32px;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:rgba(255,255,255,0.18);border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#ffffff;margin-bottom:10px;">
                      Procedure Management System
                    </span>
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.2px;line-height:1.3;">
                      Permintaan Approval Dokumen
                    </h1>
                    <p style="margin:6px 0 0;color:#e0e7ff;font-size:13px;font-weight:500;">
                      Tahap: <strong style="color:#ffffff;">${roleLabel}</strong> &bull; Status: <span style="color:#ffffff;">${rejectionNote ? 'Revisi Dokumen' : 'Menunggu Tindakan'}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Konten Email -->
          <tr>
            <td style="padding:28px 32px 20px;">
              
              <p style="margin:0 0 16px;color:#0f172a;font-size:15px;font-weight:600;line-height:1.6;">
                ${greeting}
              </p>

              ${rejectionBannerHtml}

              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Dokumen prosedur berikut memerlukan persetujuan (ACC) dari Anda sebagai <strong>${roleLabel}</strong> sebelum dapat dipublikasikan ke tahap operasional:
              </p>

              <!-- Card Ringkasan Dokumen -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #6366f1;
                            border-radius:8px;margin-bottom:26px;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                      Nama Dokumen Prosedur:
                    </p>
                    <p style="margin:0 0 10px;color:#0f172a;font-size:15px;font-weight:700;line-height:1.4;">
                      ${escapeHtml(namaDokumen)}
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px dashed #cbd5e1;padding-top:10px;">
                      <tr>
                        <td width="50%" style="padding-top:8px;">
                          <span style="color:#64748b;font-size:11px;">Nomor Dokumen:</span><br>
                          <strong style="color:#1e293b;font-size:12px;font-family:Consolas,monospace;">${escapeHtml(nomorDokumen)}</strong>
                        </td>
                        <td width="50%" style="padding-top:8px;">
                          <span style="color:#64748b;font-size:11px;">Peran Persetujuan:</span><br>
                          <span style="display:inline-block;padding:2px 8px;background-color:#ede9fe;color:#6d28d9;border-radius:4px;font-size:11px;font-weight:700;">
                            ${roleLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#334155;font-size:13px;font-weight:700;">
                Silakan pilih opsi akses yang diinginkan:
              </p>

              <!-- Opsi 1: ACC Langsung Dokumen Ini -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#faf5ff;border:1px solid #e9d5ff;border-left:4px solid #7c3aed;
                            border-radius:8px;margin-bottom:14px;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px;color:#581c87;font-size:13px;font-weight:700;">
                      1. Buka &amp; Setujui Dokumen Ini Langsung
                    </p>
                    <p style="margin:0 0 12px;color:#6b21a8;font-size:12px;line-height:1.5;">
                      Membuka lembar persetujuan dokumen ini secara langsung untuk memeriksa pratinjau PDF, melihat riwayat revisi, dan memberikan keputusan persetujuan (ACC/Tolak).
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#7c3aed;border-radius:6px;box-shadow:0 2px 4px rgba(124,58,237,0.25);">
                          <a href="${accLinkSafe}" target="_blank" rel="noopener noreferrer"
                             style="display:inline-block;padding:10px 22px;color:#ffffff;font-size:13px;
                                    font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                            Buka &amp; Setujui Dokumen
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Opsi 2: Ke Dashboard PIC Approval -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;
                            border-radius:8px;margin-bottom:24px;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px;color:#14532d;font-size:13px;font-weight:700;">
                      2. Buka Halaman PIC Approval (Dashboard)
                    </p>
                    <p style="margin:0 0 12px;color:#166534;font-size:12px;line-height:1.5;">
                      Membuka dashboard persetujuan PIC untuk melihat seluruh daftar antrean dokumen prosedur yang memerlukan tindakan atau monitoring Anda (otomatis login akun PIC).
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#16a34a;border-radius:6px;box-shadow:0 2px 4px rgba(22,163,74,0.25);">
                          <a href="${picApprovalLinkSafe}" target="_blank" rel="noopener noreferrer"
                             style="display:inline-block;padding:10px 22px;color:#ffffff;font-size:13px;
                                    font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                            Buka Halaman PIC Approval &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Catatan Keamanan / Auto-Login -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:12px;">
                <tr>
                  <td style="padding:12px 14px;">
                    <p style="margin:0;color:#64748b;font-size:11px;line-height:1.6;">
                      🔒 <strong>Keamanan &amp; Otentikasi:</strong> Tautan pada kedua tombol di atas terenkripsi khusus untuk email Anda dan akan otomatis mengautentikasi (login) akun PIC Anda. Mohon tidak membagikan email ini kepada pihak yang tidak berkepentingan.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Resmi -->
          <tr>
            <td style="background-color:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
                Email notifikasi resmi ini dikirimkan secara otomatis oleh<br>
                <strong style="color:#64748b;">Procedure Management System &bull; Quality Management System</strong><br>
                Harap tidak membalas email otomatis ini secara langsung.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAccEmailText(params: AccEmailParams): string {
  const { nama, role, namaDokumen, nomorDokumen, accLink, rejectionNote } = params;
  const roleLabel = STAGE_DISPLAY[role];
  const picApprovalLink = params.picApprovalLink || `${accLink}${accLink.includes('?') ? '&' : '?'}redirect=/pic-approval`;

  let rejectionText = '';
  if (rejectionNote) {
    const rejectionAuthor = rejectionNote.nama
      ? `${rejectionNote.nama} (${rejectionNote.email})`
      : rejectionNote.email;
    rejectionText = [
      '------------------------------------------------------------',
      '⚠️ INFORMASI REVISI DOKUMEN (SEBELUMNYA DITOLAK)',
      `Tahap Penolakan : ${rejectionNote.roleLabel}`,
      `Ditolak Oleh    : ${rejectionAuthor}`,
      `Catatan/Alasan  : "${rejectionNote.reason}"`,
      'Harap periksa lembar dokumen hasil revisi sebelum menyetujui.',
      '------------------------------------------------------------',
      '',
    ].join('\n');
  }

  return [
    nama ? `Dear. ${nama},` : 'Dear. Bapak/Ibu Pejabat Approver,',
    '',
    rejectionText,
    `Dokumen prosedur berikut memerlukan persetujuan (ACC) dari Anda sebagai ${roleLabel}:`,
    `  Nama Dokumen  : ${namaDokumen}`,
    `  Nomor Dokumen : ${nomorDokumen}`,
    `  Tahap Approval: ${roleLabel}`,
    '',
    'PILIHAN TINDAKAN:',
    '',
    '1. Buka & Setujui Dokumen Ini Langsung:',
    '(Membuka lembar persetujuan dokumen ini secara langsung untuk memeriksa pratinjau PDF dan memberikan keputusan ACC)',
    accLink,
    '',
    '2. Buka Halaman PIC Approval (Dashboard):',
    '(Membuka dashboard persetujuan PIC untuk melihat seluruh antrean dokumen prosedur Anda)',
    picApprovalLink,
    '',
    'Tautan ini bersifat privat, terenkripsi untuk email Anda, dan akan otomatis mengautentikasi (login) akun PIC Anda.',
    '',
    'Terima kasih.',
    'Procedure Management System • Quality Management System',
  ].filter(line => line !== null).join('\n');
}