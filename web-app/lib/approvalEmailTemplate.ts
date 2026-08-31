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

interface AccEmailParams {
  nama: string | null;
  role: ApprovalRole;
  namaDokumen: string;
  nomorDokumen: string;
  accLink: string;
}

export function buildAccEmailHtml(params: AccEmailParams): string {
  const { nama, role, namaDokumen, nomorDokumen, accLink } = params;
  const greeting  = nama ? `Dear. ${escapeHtml(nama)},` : 'Dear. Bapak/Ibu,';
  const roleLabel = STAGE_DISPLAY[role];
  const accLinkSafe = escapeHtml(accLink);

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
                Tahap: ${roleLabel}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
                ${greeting}
              </p>
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
  const { nama, role, namaDokumen, nomorDokumen, accLink } = params;
  const roleLabel = STAGE_DISPLAY[role];
  return [
    nama ? `Dear. ${nama},` : 'Dear. Bapak/Ibu,',
    '',
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
  ].join('\n');
}