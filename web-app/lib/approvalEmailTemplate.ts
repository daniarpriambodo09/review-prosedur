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
  rejectionNote?: RejectionInfoParam | null;
}

export function buildAccEmailHtml(params: AccEmailParams): string {
  const { nama, role, namaDokumen, nomorDokumen, accLink, rejectionNote } = params;
  const greeting  = nama ? `Dear. ${escapeHtml(nama)},` : 'Dear. Bapak/Ibu,';
  const roleLabel = STAGE_DISPLAY[role];
  const accLinkSafe = escapeHtml(accLink);

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
                    border-radius:6px;margin-bottom:24px;border-collapse:collapse;">
        <tr>
          <td style="padding:16px;">
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
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Permintaan Approval Dokumen</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);
                      max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#7c3aed;padding:28px 32px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">
                Permintaan Approval Dokumen
              </h1>
              <p style="margin:6px 0 0;color:#e5d9fb;font-size:13px;">
                Tahap: ${roleLabel}${rejectionNote ? ' (Revisi)' : ''}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
                ${greeting}
              </p>
              ${rejectionBannerHtml}
              <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
                Dokumen prosedur berikut telah diperbarui (revisi) dan memerlukan
                persetujuan (ACC) Anda sebagai <strong>${roleLabel}</strong>:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #e0e0e0;border-radius:6px;
                            border-collapse:collapse;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 4px;color:#333;font-size:14px;font-weight:700;">
                      ${escapeHtml(namaDokumen)}
                    </p>
                    <p style="margin:0;color:#666;font-size:12px;">
                      Nomor: ${escapeHtml(nomorDokumen)}
                    </p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="background-color:#7c3aed;border-radius:6px;">
                    <a href="${accLinkSafe}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:13px 32px;
                              color:#ffffff;font-size:15px;font-weight:700;
                              text-decoration:none;letter-spacing:0.3px;">
                      Buka &amp; Setujui Dokumen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888;font-size:12px;text-align:center;">
                Apabila tombol tidak dapat diklik, gunakan link berikut:
              </p>
              <p style="margin:0 0 24px;text-align:center;word-break:break-all;">
                <a href="${accLinkSafe}" target="_blank" rel="noopener noreferrer"
                   style="color:#7c3aed;font-size:12px;text-decoration:underline;">
                  ${accLinkSafe}
                </a>
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#faf5ff;border-left:4px solid #7c3aed;
                            border-radius:4px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
                      ⓘ Link ini khusus untuk Anda dan hanya berlaku sekali.
                      Setelah disetujui, sistem otomatis melanjutkan ke tahap berikutnya.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:18px 32px;
                       border-top:1px solid #e8e8e8;border-radius:0 0 8px 8px;">
              <p style="margin:0;color:#aaa;font-size:12px;text-align:center;line-height:1.6;">
                Email ini dikirim secara otomatis oleh
                <strong style="color:#888;">Procedure Management System</strong>.<br>
                Mohon tidak membalas email ini.
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
    nama ? `Dear. ${nama},` : 'Dear. Bapak/Ibu,',
    '',
    rejectionText,
    `Dokumen prosedur berikut memerlukan persetujuan (ACC) Anda sebagai ${roleLabel}:`,
    `  ${namaDokumen} (${nomorDokumen})`,
    '',
    'Silakan buka link berikut untuk menyetujui:',
    accLink,
    '',
    'Link ini khusus untuk Anda dan hanya berlaku sekali.',
    '',
    'Terima kasih.',
    'Procedure Management System',
  ].filter(line => line !== null).join('\n');
}