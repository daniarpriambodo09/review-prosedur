import assert from 'node:assert';
import { buildAccEmailHtml, buildAccEmailText } from '../lib/approvalEmailTemplate';

const sampleParams = {
  nama: 'Daniar Priambodo (M. PENS)',
  role: 'approved' as const,
  namaDokumen: 'Testing Dokumen Approve - V1',
  nomorDokumen: 'TEST - V1',
  accLink: 'http://192.168.1.55/review-prosedur/acc/5b8ed25c44da71795957fbdbc931f7690f1a5efaf827da0',
};

const html = buildAccEmailHtml(sampleParams);
assert(html.includes('Buka &amp; Setujui Dokumen'), 'HTML must include approval button');
assert(html.includes('Buka Halaman PIC Approval'), 'HTML must include PIC Approval button');
assert(html.includes('redirect=/pic-approval'), 'HTML must include redirect=/pic-approval URL');
assert(!html.includes('Apabila tombol tidak dapat diklik, gunakan link berikut'), 'HTML must not have duplicate raw link section');
assert(html.includes('Membuka lembar persetujuan dokumen ini secara langsung'), 'HTML must include description for button 1');
assert(html.includes('Membuka dashboard persetujuan PIC'), 'HTML must include description for button 2');

const text = buildAccEmailText(sampleParams);
assert(text.includes('Buka & Setujui Dokumen Ini Langsung'), 'Text must include direct acc link section');
assert(text.includes('Buka Halaman PIC Approval'), 'Text must include PIC Approval link section');
assert(text.includes('redirect=/pic-approval'), 'Text must include redirect=/pic-approval URL');

console.log('✅ All email template assertions passed successfully!');
