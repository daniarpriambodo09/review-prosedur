// lib/revisionStatuses.ts
//
// Status-status yang menandakan dokumen SEDANG dalam siklus revisi/approval —
// dari saat PIC memberi status 'Revisi' (atau salah satu approver menolak),
// sampai akhirnya dokumen kembali 'Relevan'. Selama status ada di daftar ini,
// versi dokumen SEBELUMNYA (sebelum admin upload ulang) masih relevan untuk
// dibandingkan dengan versi terbaru — dipakai oleh fitur "Bandingkan Dokumen"
// di DocumentModal.tsx dan halaman /acc/[token].

export const REVISION_WORKFLOW_STATUSES = [
  'Revisi',
  'Menunggu ACC Prepared',
  'Menunggu ACC Checked',
  'Menunggu ACC Approved',
  'Ditolak',
];

export function isInRevisionWorkflow(status: string | null | undefined): boolean {
  if (!status) return false;
  return REVISION_WORKFLOW_STATUSES.includes(status);
}