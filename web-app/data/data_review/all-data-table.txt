// data/data_review/all-data-table.ts
export interface ProcedureRow {
  nama: string;
  nomorDokumen: string;
  level: string;
  tanggal: string; // format Excel: "1-Oct-25"
  revisi: string;
  owner: string;
  pic: string;
  email: string;
}

export const RAW_EXCEL_ROWS: ProcedureRow[] = [
  {
    nama: 'Business Plan',
    nomorDokumen: 'BPR-P-01',
    level: '2',
    tanggal: '1-Oct-25',
    revisi: '08',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Risk Analysis',
    nomorDokumen: 'BPR-W-01',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '03',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Business Operating System (BOS)',
    nomorDokumen: 'BOS-P-01',
    level: '2',
    tanggal: '1-Oct-25',
    revisi: '04',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Customer Satisfaction',
    nomorDokumen: 'BOS-W-02',
    level: '3',
    tanggal: '3-Jul-17',
    revisi: '02',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Work In Process Finish Good',
    nomorDokumen: 'BOS-W-03',
    level: '3',
    tanggal: '13-Oct-25',
    revisi: '01',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Management Review',
    nomorDokumen: 'MRE-P-01',
    level: '2',
    tanggal: '22-Aug-25',
    revisi: '06',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Quality Meeting',
    nomorDokumen: 'MRE-W-01',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '02',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Internal Audit',
    nomorDokumen: 'IAU-P-01',
    level: '2',
    tanggal: '3-Sep-25',
    revisi: '14',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Quality Management System Audit',
    nomorDokumen: 'IAU-W-01',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '03',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Pengisian Form Corrective Action Request (CAR)',
    nomorDokumen: 'IAU-W-02',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '09',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Tear Down Inspection',
    nomorDokumen: 'IAU-W-03',
    level: '3',
    tanggal: '11-Dec-24',
    revisi: '11',
    owner: 'QC CHECK W/H',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Finish Good Sampling',
    nomorDokumen: 'IAU-W-06',
    level: '3',
    tanggal: '14-Nov-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pemeliharaan & Pengembangan Kompetensi Auditor',
    nomorDokumen: 'IAU-W-07',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '01',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Kakotora Audit',
    nomorDokumen: 'IAU-W-08',
    level: '3',
    tanggal: '28-Aug-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Second Party Audit',
    nomorDokumen: 'IAU-W-09',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '03',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Sertifikasi Eksternal',
    nomorDokumen: 'IAU-W-10',
    level: '3',
    tanggal: '22-Aug-25',
    revisi: '01',
    owner: 'QSA, PGA',
    pic: 'ISR, AIN',
    email: 'ika.y@jai.co.id, agung.i@jai.co.id'
  },
  {
    nama: 'Layered Audit',
    nomorDokumen: 'IAU-W-11',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Moto Audit',
    nomorDokumen: 'IAU-W-13',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '05',
    owner: 'QC STANDARISASI',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: '8 Disciplines (8D)',
    nomorDokumen: 'IMP-W-01',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '03',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pembuatan Dan Pengendalian Informasi Terdokumentasi',
    nomorDokumen: 'COD-P-01',
    level: '2',
    tanggal: '23-Sep-25',
    revisi: '11',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Metode Distribusi Standard kerja',
    nomorDokumen: 'COD-W-02',
    level: '3',
    tanggal: '15-Aug-07',
    revisi: '01',
    owner: 'DSG, QC STD',
    pic: 'VRA, ASW',
    email: 'vinny.r@jai.co.id, atiek.s@jai.co.id'
  },
  {
    nama: 'Pengendalian Quality Record',
    nomorDokumen: 'COD-W-04',
    level: '3',
    tanggal: '22-Aug-25',
    revisi: '08',
    owner: 'QSA',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Responsibility and Authority',
    nomorDokumen: 'HRM-P-01',
    level: '2',
    tanggal: '22-Aug-25',
    revisi: '02',
    owner: 'TOP MGMT (DEVELOPMENT)',
    pic: 'ISR',
    email: 'ika.y@jai.co.id'
  },
  {
    nama: 'Evaluasi Kinerja Karyawan',
    nomorDokumen: 'HRM-W-02',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '08',
    owner: 'IR',
    pic: 'NIA',
    email: 'noivasari@jai.co.id'
  },
  {
    nama: 'Pelaksanaan Rekruitmen Dengan Syarat Khusus',
    nomorDokumen: 'HRM-W-13',
    level: '3',
    tanggal: '31-Dec-25',
    revisi: '05',
    owner: 'IR',
    pic: 'NIA',
    email: 'noivasari@jai.co.id'
  },
  {
    nama: 'Pengunduran Diri',
    nomorDokumen: 'HRM-W-06',
    level: '3',
    tanggal: '20-Aug-25',
    revisi: '07',
    owner: 'IR',
    pic: 'NIA',
    email: 'noivasari@jai.co.id'
  },
  {
    nama: 'ID Card Karyawan & Temporary ID',
    nomorDokumen: 'HRM-W-15',
    level: '3',
    tanggal: '13-Apr-11',
    revisi: '01',
    owner: 'HR',
    pic: 'ATH',
    email: 'arie.t@jai.co.id'
  },
  {
    nama: 'Pelaksanaan Kerja Lembur',
    nomorDokumen: 'HRM-W-14',
    level: '3',
    tanggal: '1-Nov-22',
    revisi: '04',
    owner: 'HR',
    pic: 'ATH',
    email: 'arie.t@jai.co.id'
  },
  {
    nama: 'Training System',
    nomorDokumen: 'HRM-P-03',
    level: '2',
    tanggal: '7-Nov-25',
    revisi: '10',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Sistem Training Karyawan Baru dan Peserta Magang',
    nomorDokumen: 'HRM-W-03',
    level: '3',
    tanggal: '19-Sep-25',
    revisi: '09',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Pembuatan Dan Review Materi Training',
    nomorDokumen: 'HRM-W-05',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '04',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Prosedur Prakerin',
    nomorDokumen: 'HRM-W-08',
    level: '3',
    tanggal: '9-Sep-25',
    revisi: '03',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Pengajuan Training & License User Removal Tool',
    nomorDokumen: 'HRM-W-10',
    level: '3',
    tanggal: '22-Aug-25',
    revisi: '03',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Sistem Promosi Group Leader, Line Leader, Foreman Dan ESO',
    nomorDokumen: 'HRM-W-11',
    level: '3',
    tanggal: '24-Sep-25',
    revisi: '07',
    owner: 'TRAINING & HR',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Penunjukkan Inspektor Baru',
    nomorDokumen: 'HRM-W-12',
    level: '3',
    tanggal: '11-Dec-18',
    revisi: '05',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'License Sistem',
    nomorDokumen: 'HRM-W-16',
    level: '3',
    tanggal: '9-Sep-25',
    revisi: '05',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Prosedur Renewal License',
    nomorDokumen: 'HRM-W-17',
    level: '3',
    tanggal: '9-Sep-25',
    revisi: '02',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Pelaporan Kehilangan Dan Atau Kerusakan Kartu License',
    nomorDokumen: 'HRM-W-20',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '01',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Permohonan Pengesahan Perjanjian Magang Ke Disnaker',
    nomorDokumen: 'HRM-W-21',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '01',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Pengambilan & Pengembalian Form Catatan Meninggalkan Pekerjaan (CMP)',
    nomorDokumen: 'HRM-W-22',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '01',
    owner: 'HR',
    pic: 'ATH',
    email: 'arie.t@jai.co.id'
  },
  {
    nama: 'Prosedur Pengontrolan License',
    nomorDokumen: 'HRM-W-23',
    level: '3',
    tanggal: '9-Sep-25',
    revisi: '05',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Prosedur Pengontrolan License Eksternal',
    nomorDokumen: 'HRM-W-27',
    level: '3',
    tanggal: '9-Sep-25',
    revisi: '01',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Pelaksanaan Kaizen (Improvisasi)',
    nomorDokumen: 'HRM-W-28',
    level: '3',
    tanggal: '10-Nov-25',
    revisi: '10',
    owner: 'NYS',
    pic: 'LSE',
    email: 'lilis.s@jai.co.id'
  },
  {
    nama: 'Aktivitas QC Circle',
    nomorDokumen: 'HRM-W-29',
    level: '3',
    tanggal: '22-Oct-19',
    revisi: '06',
    owner: 'NYS',
    pic: 'LSE',
    email: 'lilis.s@jai.co.id'
  },
  {
    nama: 'Konvensi QC Circle Internal',
    nomorDokumen: 'HRM-W-30',
    level: '3',
    tanggal: '12-Aug-25',
    revisi: '02',
    owner: 'NYS',
    pic: 'LSE',
    email: 'lilis.s@jai.co.id'
  },
  {
    nama: 'Mutasi Karyawan',
    nomorDokumen: 'HRM-W-32',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '01',
    owner: 'IR',
    pic: 'NIA',
    email: 'noivasari@jai.co.id'
  },
  {
    nama: 'Perubahan Atau Pembatalan Pelaksanaan Training',
    nomorDokumen: 'HRM-W-33',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '01',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Pendistribusian Dan Pengisian Form Request Training',
    nomorDokumen: 'HRM-W-35',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '01',
    owner: 'TRAINING',
    pic: 'WWI',
    email: 'wiwin.w@jai.co.id'
  },
  {
    nama: 'Medical Emergency',
    nomorDokumen: 'HRM-W-36',
    level: '3',
    tanggal: '18-Aug-25',
    revisi: '01',
    owner: 'HR, IR',
    pic: 'ATH',
    email: 'arie.t@jai.co.id'
  },
  {
    nama: 'Tidak Masuk Mogok Kerja & Kekurangan Tenaga Kerja',
    nomorDokumen: 'HRM-W-37',
    level: '3',
    tanggal: '6-Jun-22',
    revisi: '0',
    owner: 'IR',
    pic: 'NIA',
    email: 'noivasari@jai.co.id'
  },
  {
    nama: 'Standard Backup Data Komputer',
    nomorDokumen: 'HRM-W-09',
    level: '3',
    tanggal: '26-Oct-18',
    revisi: '02',
    owner: 'IT',
    pic: 'HMA',
    email: 'hendy.m@jai.co.id'
  },
  {
    nama: 'Product Realization',
    nomorDokumen: 'PQP-P-01',
    level: '2',
    tanggal: '4-Sep-23',
    revisi: '19',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Pembuatan PQTP (Product Quality Timing Plan)',
    nomorDokumen: 'PQP-W-01',
    level: '3',
    tanggal: '27-May-24',
    revisi: '07',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Form Pick up Problem',
    nomorDokumen: 'PQP-W-05',
    level: '3',
    tanggal: '12-Nov-10',
    revisi: '02',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Risk Assessment',
    nomorDokumen: 'PQP-W-06',
    level: '3',
    tanggal: '9-Oct-07',
    revisi: '02',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Pembuatan & Pengontrolan Operation Standard (OS)',
    nomorDokumen: 'PQP-W-08',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '05',
    owner: 'DSG',
    pic: 'VRA',
    email: 'vinny.r@jai.co.id'
  },
  {
    nama: 'Pembuatan & Review Berkala Production Process Flow Chart (PPFC)',
    nomorDokumen: 'PQP-W-10',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '06',
    owner: 'DSG',
    pic: 'CHA',
    email: 'catur.h@jai.co.id'
  },
  {
    nama: 'Pembuatan & Pengontrolan Inspection Standard (IS)',
    nomorDokumen: 'PQP-W-11',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '05',
    owner: 'QC STANDARISASI',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pembuatan, Pengontrolan & Review Berkala Dokumen PFMEA',
    nomorDokumen: 'PQP-W-12',
    level: '3',
    tanggal: '4-Oct-24',
    revisi: '14',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pembuatan, Pengontrolan & Review Berkala Dokumen Control Plan & MQC',
    nomorDokumen: 'PQP-W-13',
    level: '3',
    tanggal: '4-Oct-24',
    revisi: '12',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Offline Training & HVPT',
    nomorDokumen: 'PQP-W-14',
    level: '3',
    tanggal: '30-Oct-07',
    revisi: '0',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Initial Mass Production Intensive Quality Control',
    nomorDokumen: 'PQP-W-16',
    level: '3',
    tanggal: '28-Aug-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Production Preparation Cost Control',
    nomorDokumen: 'PQP-W-17',
    level: '3',
    tanggal: '10-Jun-24',
    revisi: '02',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Cross Functional Review',
    nomorDokumen: 'PQP-W-18',
    level: '3',
    tanggal: '31-Jul-19',
    revisi: '0',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Identifikasi & Pengontrolan Proses Penting & Proses Spesial',
    nomorDokumen: 'PQP-W-19',
    level: '3',
    tanggal: '22-Oct-19',
    revisi: '02',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Initial Process Study Pengukuran Dimensi Clip To Protector',
    nomorDokumen: 'PQP-W-20',
    level: '3',
    tanggal: '2-Dec-23',
    revisi: '0',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Hinkaku Production Approval',
    nomorDokumen: 'PQP-W-21',
    level: '3',
    tanggal: '19-Jul-24',
    revisi: '0',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Design Change',
    nomorDokumen: 'CDC-P-01',
    level: '2',
    tanggal: '12-Aug-25',
    revisi: '16',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pembuatan Dokumen Engineering Design and Standard',
    nomorDokumen: 'CDC-W-01',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '05',
    owner: 'DSG',
    pic: 'CHA',
    email: 'catur.h@jai.co.id'
  },
  {
    nama: 'Proses Input Part List di AS 400',
    nomorDokumen: 'CDC-W-02',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '03',
    owner: 'DSG',
    pic: 'CHA',
    email: 'catur.h@jai.co.id'
  },
  {
    nama: 'Pembuatan Engineering Package',
    nomorDokumen: 'CDC-W-03',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '08',
    owner: 'DSG',
    pic: 'CHA',
    email: 'catur.h@jai.co.id'
  },
  {
    nama: 'Cross Section Terminal & Pengecekan Circuit Size Besar',
    nomorDokumen: 'CDC-W-05',
    level: '3',
    tanggal: '8-Aug-25',
    revisi: '05',
    owner: 'QC LAB',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Print Clarification Dan Design Request',
    nomorDokumen: 'CDC-W-07',
    level: '3',
    tanggal: '28-Oct-08',
    revisi: '04',
    owner: 'DSG',
    pic: 'CHA',
    email: 'catur.h@jai.co.id'
  },
  {
    nama: 'Initial Process Study crimping',
    nomorDokumen: 'CDC-W-10',
    level: '3',
    tanggal: '26-Sep-25',
    revisi: '11',
    owner: 'QC LAB',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Control of Part Design Change',
    nomorDokumen: 'CDC-W-11',
    level: '3',
    tanggal: '8-Aug-25',
    revisi: '06',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Verifikasi Proses Crimping',
    nomorDokumen: 'CDC-W-12',
    level: '3',
    tanggal: '2-May-25',
    revisi: '05',
    owner: 'DSG',
    pic: 'WSU',
    email: 'widyastuti.s@jai.co.id'
  },
  {
    nama: 'Pembuatan Bonding Standart',
    nomorDokumen: 'CDC-W-13',
    level: '3',
    tanggal: '3-Nov-21',
    revisi: '06',
    owner: 'DSG, QC LAB & MTC',
    pic: 'VRA',
    email: 'vinny.r@jai.co.id'
  },
  {
    nama: 'Temporary Crimping Standard',
    nomorDokumen: 'CDC-W-14',
    level: '3',
    tanggal: '12-Nov-25',
    revisi: '01',
    owner: 'DSG',
    pic: 'WSU',
    email: 'widyastuti.s@jai.co.id'
  },
  {
    nama: 'Pembuatan Dan Perubahan Job Station',
    nomorDokumen: 'CDC-W-15',
    level: '3',
    tanggal: '21-Jul-23',
    revisi: '03',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Control Circuit Dalam Joint Yang Sama',
    nomorDokumen: 'CDC-W-22',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '01',
    owner: 'DSG',
    pic: 'CHA',
    email: 'catur.h@jai.co.id'
  },
  {
    nama: 'Mekanisme Penentuan Point Inspeksi',
    nomorDokumen: 'CDC-W-23',
    level: '3',
    tanggal: '25-Oct-19',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pelaksanaan PPAP, ISIR & TR',
    nomorDokumen: 'PAP-P-01',
    level: '2',
    tanggal: '31-Jul-25',
    revisi: '06',
    owner: 'QC CHECK W/H',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Pengisian Form PPAP Build Concern',
    nomorDokumen: 'PAP-W-08',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '06',
    owner: 'QC CHECK W/H',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Production Plan',
    nomorDokumen: 'PPL-P-01',
    level: '2',
    tanggal: '14-Aug-25',
    revisi: '06',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pembuatan Sample Build Timing',
    nomorDokumen: 'PPL-W-01',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '03',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pembuatan SPP (Six Months Production Plan)',
    nomorDokumen: 'PPL-W-02',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '05',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pembuatan Assy Plan',
    nomorDokumen: 'PPL-W-03',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '04',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Follow Up Delay Produksi',
    nomorDokumen: 'PPL-W-04',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '02',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pengontrolan Polytainer Dan Pallet Rental',
    nomorDokumen: 'PPL-W-05',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '04',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Pembuatan Instruction Kanban',
    nomorDokumen: 'PPL-W-06',
    level: '3',
    tanggal: '10-Nov-25',
    revisi: '04',
    owner: 'NYS',
    pic: 'LSE',
    email: 'lilis.s@jai.co.id'
  },
  {
    nama: 'Production Plan for Part & Service',
    nomorDokumen: 'PPL-W-07',
    level: '3',
    tanggal: '28-Apr-25',
    revisi: '03',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Request Air Freight Finish Goods',
    nomorDokumen: 'PPL-W-08',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '01',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Increase And Decrease Order',
    nomorDokumen: 'PPL-W-11',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '02',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Material Ordering',
    nomorDokumen: 'MOR-P-01',
    level: '2',
    tanggal: '19-Aug-24',
    revisi: '08',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Input Assy Plan Di AS 400',
    nomorDokumen: 'MOR-W-01',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '02',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pengadaan PSW Material',
    nomorDokumen: 'MOR-W-05',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '05',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Line Condition Report',
    nomorDokumen: 'MOR-W-06',
    level: '3',
    tanggal: '1-Aug-25',
    revisi: '03',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Follow Up Over Quantity Shipment',
    nomorDokumen: 'MOR-W-08',
    level: '3',
    tanggal: '12-Aug-25',
    revisi: '04',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Hot Part',
    nomorDokumen: 'MOR-W-09',
    level: '3',
    tanggal: '24-Oct-25',
    revisi: '03',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Follow Up Shipment Delay Part',
    nomorDokumen: 'MOR-W-10',
    level: '3',
    tanggal: '12-Aug-25',
    revisi: '02',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Follow Up Material Order',
    nomorDokumen: 'MOR-W-11',
    level: '3',
    tanggal: '8-Oct-24',
    revisi: '04',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Analisa Material',
    nomorDokumen: 'MOR-W-12',
    level: '3',
    tanggal: '15-Apr-25',
    revisi: '05',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Order Adjustment',
    nomorDokumen: 'MOR-W-14',
    level: '3',
    tanggal: '12-Aug-25',
    revisi: '04',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Air Freight Request',
    nomorDokumen: 'MOR-W-15',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '04',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Mekanisme Approval',
    nomorDokumen: 'MOR-W-17',
    level: '3',
    tanggal: '21-Aug-25',
    revisi: '20',
    owner: 'FA',
    pic: 'YFI',
    email: 'yuli.f@jai.co.id'
  },
  {
    nama: 'Flow Informasi Penggunaan Material Jika Terjadi Kondisi Abnormal',
    nomorDokumen: 'MOR-W-21',
    level: '3',
    tanggal: '13-Nov-25',
    revisi: '01',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Standard Agreement Purchase Untuk Non Material W/H',
    nomorDokumen: 'MOR-W-25',
    level: '3',
    tanggal: '7-Nov-25',
    revisi: '09',
    owner: 'PURCHASE',
    pic: 'RKO',
    email: 'riska.o@jai.co.id'
  },
  {
    nama: 'Interruption From Externally Provided',
    nomorDokumen: 'MOR-W-26',
    level: '3',
    tanggal: '1-Aug-25',
    revisi: '01',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Purchasing',
    nomorDokumen: 'MOR-P-02',
    level: '2',
    tanggal: '5-Jan-26',
    revisi: '10',
    owner: 'PURCHASE',
    pic: 'RKO',
    email: 'riska.o@jai.co.id'
  },
  {
    nama: 'Pembuatan PR & AF Requisition',
    nomorDokumen: 'MOR-W-20',
    level: '3',
    tanggal: '16-May-23',
    revisi: '10',
    owner: 'PURCHASE',
    pic: 'RKO',
    email: 'riska.o@jai.co.id'
  },
  {
    nama: 'Pembuatan Application For Advance Payment (AFAP)',
    nomorDokumen: 'MOR-W-27',
    level: '3',
    tanggal: '4-Sep-25',
    revisi: '01',
    owner: 'PGA,QA,MPC,FA',
    pic: 'HPU,TWI,DAS,YFI',
    email: 'yuli.f@jai.co.id'
  },
  {
    nama: 'Material Receiving And Storage',
    nomorDokumen: 'MRS-P-01',
    level: '2',
    tanggal: '20-May-25',
    revisi: '08',
    owner: 'QC REC, WHS',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Quality Receiving Inspection',
    nomorDokumen: 'MRS-W-02',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '08',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Rec. Insp. For Abnormal Condition',
    nomorDokumen: 'MRS-W-03',
    level: '3',
    tanggal: '14-Nov-25',
    revisi: '02',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pembuatan Receiving Inspection Standard',
    nomorDokumen: 'MRS-W-05',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '02',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS Pemeriksaan Ulang Part / Material',
    nomorDokumen: 'MRS-W-10',
    level: '3',
    tanggal: '7-Nov-25',
    revisi: '04',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Material Alert',
    nomorDokumen: 'MRS-W-11',
    level: '3',
    tanggal: '7-Nov-25',
    revisi: '04',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Kontrol Material Slow Moving',
    nomorDokumen: 'MRS-W-13',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '05',
    owner: 'WHS',
    pic: 'FIR',
    email: 'ferry.i@jai.co.id'
  },
  {
    nama: 'Mekanisme Pengontrolan Dan Pengecekan SOC Untuk Direct Material & In Direct Material',
    nomorDokumen: 'MRS-W-16',
    level: '3',
    tanggal: '26-Sep-24',
    revisi: '08',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Claim Dead Stock Material ke Customer',
    nomorDokumen: 'MRS-W-18',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '04',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Control New Part & Similar Part',
    nomorDokumen: 'MRS-W-23',
    level: '3',
    tanggal: '4-Jun-21',
    revisi: '02',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pembuatan Cutting Kanban Dan Shikake Kanban',
    nomorDokumen: 'MRS-W-25',
    level: '3',
    tanggal: '10-Nov-25',
    revisi: '05',
    owner: 'NYS',
    pic: 'LSE',
    email: 'lilis.s@jai.co.id'
  },
  {
    nama: 'Part Requisition',
    nomorDokumen: 'MRS-W-28',
    level: '3',
    tanggal: '24-Apr-20',
    revisi: '03',
    owner: 'WHS',
    pic: 'FIR',
    email: 'ferry.i@jai.co.id'
  },
  {
    nama: 'New Part',
    nomorDokumen: 'MRS-W-29',
    level: '3',
    tanggal: '22-Oct-24',
    revisi: '02',
    owner: 'MPC',
    pic: 'MMR',
    email: 'm.rafi@jai.co.id'
  },
  {
    nama: 'Pengembalian Sisa Material Prototype',
    nomorDokumen: 'MRS-W-31',
    level: '3',
    tanggal: '12-Dec-22',
    revisi: '0',
    owner: 'PP',
    pic: 'LDA',
    email: 'lita.d@jai.co.id'
  },
  {
    nama: 'Pembuatan dan Penyimpanan Name Plate',
    nomorDokumen: 'MRS-W-33',
    level: '3',
    tanggal: '12-Nov-24',
    revisi: '08',
    owner: 'WHS',
    pic: 'FIR',
    email: 'ferry.i@jai.co.id'
  },
  {
    nama: 'Material Supply',
    nomorDokumen: 'MRS-P-02 : Before : MSU-P-01',
    level: '2',
    tanggal: '29-Jul-25',
    revisi: '05',
    owner: 'WHS',
    pic: 'FIR',
    email: 'ferry.i@jai.co.id'
  },
  {
    nama: 'Pembuatan Kanban Wire Dan Terminal',
    nomorDokumen: 'MRS-W-26 : Before : MSU-W-07',
    level: '3',
    tanggal: '10-Nov-25',
    revisi: '03',
    owner: 'NYS',
    pic: 'LSE',
    email: 'lilis.s@jai.co.id'
  },
  {
    nama: 'Penyediaan Tube Untuk Produksi',
    nomorDokumen: 'MRS-W-35 : Before : MSU-W-14',
    level: '3',
    tanggal: '23-Oct-25',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Stock Opname',
    nomorDokumen: 'MRS-W-34 : BEFORE MSU-W-15',
    level: '3',
    tanggal: '11-Aug-25',
    revisi: '03',
    owner: 'WHS',
    pic: 'FIR',
    email: 'ferry.i@jai.co.id'
  },
  {
    nama: 'Persiapan SoC Sample Untuk Pengecekan Phthlate Esther Ke YIC-AP',
    nomorDokumen: 'MRS-W-36',
    level: '3',
    tanggal: '12-Dec-25',
    revisi: '0',
    owner: 'MPC',
    pic: 'DAS',
    email: 'dwi.as@jai.co.id'
  },
  {
    nama: 'Pre Assembly Process & Inspection',
    nomorDokumen: 'PAM-P-01',
    level: '2',
    tanggal: '1-Aug-25',
    revisi: '03',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Lot Management Bonding',
    nomorDokumen: 'PAM-W-01',
    level: '3',
    tanggal: '15-Jan-26',
    revisi: '06',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisihan CS LK Operator & Inspector Heat Shrink (Raychem)',
    nomorDokumen: 'PAM-W-02',
    level: '3',
    tanggal: '2-Dec-23',
    revisi: '03',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Set Up Verification',
    nomorDokumen: 'PAM-W-03',
    level: '3',
    tanggal: '26-Sep-25',
    revisi: '14',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian Form Rework Pre Assy',
    nomorDokumen: 'PAM-W-04',
    level: '3',
    tanggal: '15-Jan-26',
    revisi: '03',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator & Inspector Gun / Dip Solder',
    nomorDokumen: 'PAM-W-06',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Dan Inspektor Cutting',
    nomorDokumen: 'PAM-W-07',
    level: '3',
    tanggal: '10-Nov-25',
    revisi: '16',
    owner: 'PROD, QA, NYS',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Dan Inspektor Man. Crimping',
    nomorDokumen: 'PAM-W-08',
    level: '3',
    tanggal: '3-Nov-22',
    revisi: '14',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Middle Stripping',
    nomorDokumen: 'PAM-W-09',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Wire Twisting',
    nomorDokumen: 'PAM-W-10',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '09',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Pemasangan Tube / Accessories',
    nomorDokumen: 'PAM-W-11',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '05',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Joint Taping',
    nomorDokumen: 'PAM-W-12',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Manual Taping',
    nomorDokumen: 'PAM-W-13',
    level: '3',
    tanggal: '3-Nov-22',
    revisi: '05',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator & Inspektor Joint Crimping',
    nomorDokumen: 'PAM-W-14',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '08',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS L/K Operator & Inspektor Joint Welding / Bonder',
    nomorDokumen: 'PAM-W-15',
    level: '3',
    tanggal: '22-Aug-25',
    revisi: '10',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator & Inspector Manual Crimping Shield Wire',
    nomorDokumen: 'PAM-W-16',
    level: '3',
    tanggal: '22-Oct-19',
    revisi: '0',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Accessories Insertion Shield Wire',
    nomorDokumen: 'PAM-W-17',
    level: '3',
    tanggal: '11-Oct-19',
    revisi: '0',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS LK Operator Cutting Doren Shield Wire',
    nomorDokumen: 'PAM-W-18',
    level: '3',
    tanggal: '11-Oct-19',
    revisi: '0',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Voltage Test Dan Pengecheckan Scratch Core',
    nomorDokumen: 'PAM-W-19',
    level: '3',
    tanggal: '26-Sep-25',
    revisi: '08',
    owner: 'QC LAB',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Pengisian CS L/K Operator & Inspektor Manual Crimping Air Bag',
    nomorDokumen: 'PAM-W-29',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '04',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian LKO Pemasangan Tube / Accesories Airbag',
    nomorDokumen: 'PAM-W-35',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Quality Tube',
    nomorDokumen: 'PAM-W-37',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian LKO Rolling Machine Wire /Tube',
    nomorDokumen: 'PAM-W-38',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Rule 4M Transition Pre Assy',
    nomorDokumen: 'PAM-W-39',
    level: '3',
    tanggal: '8-Aug-19',
    revisi: '02',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS Daily Report Prosess Cutting',
    nomorDokumen: 'PAM-W-41',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '06',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian C/S LKO Operator End Stripping',
    nomorDokumen: 'PAM-W-42',
    level: '3',
    tanggal: '23-Oct-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Statistical Process Control (SPC)',
    nomorDokumen: 'PAM-W-44',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '02',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian C/S Lembar Kerja Operator & Inspector Joint Ultrasonic',
    nomorDokumen: 'PAM-W-45',
    level: '3',
    tanggal: '13-Oct-25',
    revisi: '01',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian C/S Lembar Kerja Operator Proses Anti Korosi Aluminium Wire (Ultraviolet)',
    nomorDokumen: 'PAM-W-46',
    level: '3',
    tanggal: '1-Dec-23',
    revisi: '00',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian Checksheet Proses Anti Korosi (Ultraviolet)',
    nomorDokumen: 'PAM-W-47',
    level: '3',
    tanggal: '2-Dec-23',
    revisi: '00',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian C/S Laporan Kerja Operator Hodoki',
    nomorDokumen: 'PAM-W-48',
    level: '3',
    tanggal: '1-Dec-23',
    revisi: '00',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian Checksheet Pengecheckan Kekentalan Aron Alpha',
    nomorDokumen: 'PAM-W-49',
    level: '3',
    tanggal: '11-Dec-24',
    revisi: '01',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian Checksheet LKO Cutting Jam Twist',
    nomorDokumen: 'PAM-W-51',
    level: '3',
    tanggal: '19-Nov-25',
    revisi: '00',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Final Assembly Process & Inspection',
    nomorDokumen: 'FAM-P-01',
    level: '2',
    tanggal: '1-Aug-25',
    revisi: '03',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Proses Inspeksi di Final Assy',
    nomorDokumen: 'FAM-P-02',
    level: '2',
    tanggal: '15-Jan-26',
    revisi: '03',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Kontrol Harian Produksi',
    nomorDokumen: 'FAM-W-06',
    level: '3',
    tanggal: '19-Aug-25',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS Laporan Kerja Inspektor F/A',
    nomorDokumen: 'FAM-W-07',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '12',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian CS Laporan Kerja Operator F/A',
    nomorDokumen: 'FAM-W-08',
    level: '3',
    tanggal: '14-Dec-17',
    revisi: '02',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS Pengisian Material Mesin Water Proof Injection',
    nomorDokumen: 'FAM-W-09',
    level: '3',
    tanggal: '19-Oct-20',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian C/S Sample Test Mesin Water Proof Injection',
    nomorDokumen: 'FAM-W-12',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '02',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Standard Setting Torque Driver & Torque Checker',
    nomorDokumen: 'FAM-W-13',
    level: '3',
    tanggal: '13-Nov-25',
    revisi: '04',
    owner: 'PD, PE, QC MSA',
    pic: 'DAF,YHE,TWI',
    email: 'david.a@jai.co.id'
  },
  {
    nama: 'Pengisian CS Laporan Kerja Operator FA Airbag',
    nomorDokumen: 'FAM-W-16',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian CS Housing Airbag',
    nomorDokumen: 'FAM-W-17',
    level: '3',
    tanggal: '18-Oct-11',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian My QA',
    nomorDokumen: 'FAM-W-19',
    level: '3',
    tanggal: '13-Oct-25',
    revisi: '02',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Pengisian Defect Tracking Checksheet Removal Terminal',
    nomorDokumen: 'FAM-W-21',
    level: '3',
    tanggal: '15-Aug-25',
    revisi: '05',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Rule 4M Transition Final Assy',
    nomorDokumen: 'FAM-W-23',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '10',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Proses Torque',
    nomorDokumen: 'FAM-W-27',
    level: '3',
    tanggal: '14-Nov-25',
    revisi: '03',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Kontrol Pemakaian Name Plate',
    nomorDokumen: 'FAM-W-28',
    level: '3',
    tanggal: '13-Oct-25',
    revisi: '04',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Control of Nonconforming Product',
    nomorDokumen: 'CNP-P-01',
    level: '2',
    tanggal: '31-Jul-25',
    revisi: '09',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pembuatan dan Pengisian Quality Alert',
    nomorDokumen: 'CNP-W-04',
    level: '3',
    tanggal: '19-Nov-25',
    revisi: '10',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Cara Pengisian Form Defective Tag',
    nomorDokumen: 'CNP-W-05',
    level: '3',
    tanggal: '7-Aug-25',
    revisi: '07',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Product Sorting / Rework Instruction',
    nomorDokumen: 'CNP-W-06',
    level: '3',
    tanggal: '15-Jan-26',
    revisi: '06',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Traceability Process',
    nomorDokumen: 'CNP-W-07',
    level: '3',
    tanggal: '19-Nov-25',
    revisi: '02',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Perhitungan Quality Cost',
    nomorDokumen: 'CNP-W-09',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '03',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Penanganan Product di Quarantine Area',
    nomorDokumen: 'CNP-W-11',
    level: '3',
    tanggal: '19-Jun-07',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian Form Countermeasure Defect',
    nomorDokumen: 'CNP-W-12',
    level: '3',
    tanggal: '1-Aug-25',
    revisi: '02',
    owner: 'PRODUKSI, QA',
    pic: 'ENS, TWI',
    email: 'endang.s@jai.co.id, toni.w@jai.co.id'
  },
  {
    nama: 'Customer Complaint',
    nomorDokumen: 'CNP-W-13',
    level: '3',
    tanggal: '15-Jan-26',
    revisi: '16',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Quality Notification / Business Memo',
    nomorDokumen: 'CNP-W-14',
    level: '3',
    tanggal: '22-Aug-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Control Nonconforming Part / Material',
    nomorDokumen: 'CNP-P-02',
    level: '2',
    tanggal: '4-Jun-24',
    revisi: '09',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pembuatan dan Follow Up Defective Report',
    nomorDokumen: 'CNP-W-01',
    level: '3',
    tanggal: '5-Aug-25',
    revisi: '07',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pembuatan Summary Report "Sorting Cost of Defective Parts" And Follow Up',
    nomorDokumen: 'CNP-W-02',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '06',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Pemeriksaan Part Material 100%',
    nomorDokumen: 'CNP-W-03',
    level: '3',
    tanggal: '14-Nov-25',
    revisi: '04',
    owner: 'QC REC',
    pic: 'ASW',
    email: 'atiek.s@jai.co.id'
  },
  {
    nama: 'Finished Goods Storage & Delivery',
    nomorDokumen: 'FSD-P-01',
    level: '2',
    tanggal: '13-Aug-25',
    revisi: '10',
    owner: 'EXIM',
    pic: 'ASE',
    email: 'arianto.s@jai.co.id'
  },
  {
    nama: 'Loading to Container',
    nomorDokumen: 'FSD-W-01',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '04',
    owner: 'EXIM',
    pic: 'ASE',
    email: 'arianto.s@jai.co.id'
  },
  {
    nama: 'Penarikan dan Penyusunan F/G di area Loading Dock',
    nomorDokumen: 'FSD-W-02',
    level: '3',
    tanggal: '12-Aug-25',
    revisi: '04',
    owner: 'EXIM',
    pic: 'ASE',
    email: 'arianto.s@jai.co.id'
  },
  {
    nama: 'Shipping Release Review',
    nomorDokumen: 'FSD-W-09',
    level: '3',
    tanggal: '12-Aug-25',
    revisi: '03',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Repacking Process',
    nomorDokumen: 'FSD-W-10',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '01',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Pembuatan Invoice Finish Good',
    nomorDokumen: 'FSD-W-11',
    level: '3',
    tanggal: '14-Aug-25',
    revisi: '03',
    owner: 'PPC',
    pic: 'EMU',
    email: 'evaningsih@jai.co.id'
  },
  {
    nama: 'Plant and Facility Planning',
    nomorDokumen: 'PFP-P-01',
    level: '2',
    tanggal: '21-Jul-20',
    revisi: '04',
    owner: 'MTC, PROD ENG',
    pic: 'MCB, DHS',
    email: 'm.chasan@jai.co.id, dany.h@jai.co.id'
  },
  {
    nama: 'Perhitungan Dan Order Kebutuhan Mesin Produksi',
    nomorDokumen: 'PFP-W-01',
    level: '3',
    tanggal: '19-Oct-23',
    revisi: '03',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Pembuatan Production Layout',
    nomorDokumen: 'PFP-W-02',
    level: '3',
    tanggal: '6-Aug-25',
    revisi: '06',
    owner: 'NYS',
    pic: 'HSW',
    email: 'hary.sw@jai.co.id'
  },
  {
    nama: 'Pembuatan Jig Board Drawing',
    nomorDokumen: 'PFP-W-03',
    level: '3',
    tanggal: '14-Apr-14',
    revisi: '01',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Pembuatan Cheker Program',
    nomorDokumen: 'PFP-W-05',
    level: '3',
    tanggal: '1-Jul-04',
    revisi: '0',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Pembuatan Jig Board',
    nomorDokumen: 'PFP-W-06',
    level: '3',
    tanggal: '28-Sep-04',
    revisi: '0',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Form Permintaan Pekerjaan',
    nomorDokumen: 'PFP-W-08',
    level: '3',
    tanggal: '13-Oct-25',
    revisi: '05',
    owner: 'PRODUKSI',
    pic: 'ENS',
    email: 'endang.s@jai.co.id'
  },
  {
    nama: 'Approval dan Verifikasi Jig Board',
    nomorDokumen: 'PFP-W-10',
    level: '3',
    tanggal: '18-Oct-07',
    revisi: '05',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Checker Progran Validation',
    nomorDokumen: 'PFP-W-13',
    level: '3',
    tanggal: '29-Jun-04',
    revisi: '0',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Kebutuhan Special Equipment',
    nomorDokumen: 'PFP-W-14',
    level: '3',
    tanggal: '20-Aug-25',
    revisi: '01',
    owner: 'PE, PD',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Approval Fuse Insertion Dan Fuse Verification Plate',
    nomorDokumen: 'PFP-W-17',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengisian Daily Check Inspector Dan GL Inspect',
    nomorDokumen: 'PFP-W-21',
    level: '3',
    tanggal: '26-Sep-25',
    revisi: '09',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Power Failure (Black Out)',
    nomorDokumen: 'PFP-W-22',
    level: '3',
    tanggal: '25-Jun-25',
    revisi: '01',
    owner: 'PGA',
    pic: 'ACA',
    email: 'aris.c@jai.co.id'
  },
  {
    nama: 'Air Compression Failure',
    nomorDokumen: 'PFP-W-23',
    level: '3',
    tanggal: '25-Jun-25',
    revisi: '01',
    owner: 'PGA',
    pic: 'ACA',
    email: 'aris.c@jai.co.id'
  },
  {
    nama: 'Water Supply Interuption',
    nomorDokumen: 'PFP-W-24',
    level: '3',
    tanggal: '21-Sep-22',
    revisi: '0',
    owner: 'PGA',
    pic: 'ACA',
    email: 'aris.c@jai.co.id'
  },
  {
    nama: 'Chemical Spills (Tumpahan B3 Cair)',
    nomorDokumen: 'PFP-W-25',
    level: '3',
    tanggal: '24-Nov-22',
    revisi: '0',
    owner: 'PGA',
    pic: 'AIN',
    email: 'agung.i@jai.co.id'
  },
  {
    nama: 'Telecomunication Failure (Telephone)',
    nomorDokumen: 'PFP-W-26',
    level: '3',
    tanggal: '24-Nov-22',
    revisi: '0',
    owner: 'PGA',
    pic: 'HPU',
    email: 'hayu.p@jai.co.id'
  },
  {
    nama: 'Fire Minor',
    nomorDokumen: 'PFP-W-28',
    level: '3',
    tanggal: '5-Aug-25',
    revisi: '01',
    owner: 'PGA',
    pic: 'AIN',
    email: 'agung.i@jai.co.id'
  },
  {
    nama: 'Penambahan Daya Listrik',
    nomorDokumen: 'PFP-W-29',
    level: '3',
    tanggal: '25-Aug-25',
    revisi: '0',
    owner: 'PGA',
    pic: 'ACA',
    email: 'aris.c@jai.co.id'
  },
  {
    nama: 'Pembuatan Contigency Plan',
    nomorDokumen: 'PFP-P-02',
    level: '2',
    tanggal: '24-Oct-12',
    revisi: '02',
    owner: 'PGA',
    pic: 'HPU',
    email: 'hayu.p@jai.co.id'
  },
  {
    nama: 'Equipment, Tooling & Spare Part Management',
    nomorDokumen: 'ETM-P-01',
    level: '2',
    tanggal: '24-Jun-20',
    revisi: '11',
    owner: 'MTC, PROD ENG',
    pic: 'MCB, DHS',
    email: 'm.chasan@jai.co.id, dany.h@jai.co.id'
  },
  {
    nama: 'Penyediaan Dan Pengadaan Part / Equipment',
    nomorDokumen: 'ETM-W-02',
    level: '3',
    tanggal: '20-Aug-25',
    revisi: '02',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Set up Tooling Applikator',
    nomorDokumen: 'ETM-W-04',
    level: '3',
    tanggal: '22-Jul-25',
    revisi: '04',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Modifikasi Applicator',
    nomorDokumen: 'ETM-W-05',
    level: '3',
    tanggal: '22-Jul-25',
    revisi: '05',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Penyediaan dan Pengelolaan Spare Part',
    nomorDokumen: 'ETM-W-07',
    level: '3',
    tanggal: '10-Jul-25',
    revisi: '09',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Mapping Applikator',
    nomorDokumen: 'ETM-W-10',
    level: '3',
    tanggal: '27-Oct-25',
    revisi: '04',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Tooling Control Maintenance',
    nomorDokumen: 'ETM-W-13',
    level: '3',
    tanggal: '10-Nov-25',
    revisi: '07',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Sistem Informasi Perubahan Posisi Applicator',
    nomorDokumen: 'ETM-W-15',
    level: '3',
    tanggal: '24-Jul-25',
    revisi: '03',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Production Equipment Breakdown',
    nomorDokumen: 'ETM-W-19',
    level: '3',
    tanggal: '20-Aug-25',
    revisi: '01',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Review Equipment',
    nomorDokumen: 'ETM-W-20',
    level: '3',
    tanggal: '31-Jul-25',
    revisi: '02',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengontrolan Inspection Jig',
    nomorDokumen: 'ETM-W-21',
    level: '3',
    tanggal: '14-Oct-25',
    revisi: '05',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Pengontrolan Alat Potong',
    nomorDokumen: 'ETM-W-22',
    level: '3',
    tanggal: '14-Nov-25',
    revisi: '01',
    owner: 'QA',
    pic: 'TWI',
    email: 'toni.w@jai.co.id'
  },
  {
    nama: 'Stock Opname Sparepart',
    nomorDokumen: 'ETM-W-23',
    level: '3',
    tanggal: '12-Jun-25',
    revisi: '0',
    owner: 'MTC SC',
    pic: 'DKR',
    email: 'david.k@jai.co.id'
  },
  {
    nama: 'Preventive and Predictive Maintenance',
    nomorDokumen: 'PPM-P-01',
    level: '2',
    tanggal: '24-Jun-20',
    revisi: '03',
    owner: 'MTC, PROD ENG',
    pic: 'MCB, DHS',
    email: 'm.chasan@jai.co.id, dany.h@jai.co.id'
  },
  {
    nama: 'Preventive and Predictive Maintenance Mesin Produksi & Applicator',
    nomorDokumen: 'PPM-W-01',
    level: '3',
    tanggal: '1-Aug-24',
    revisi: '07',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Penanganan Kerusakan Pada Mesin Produksi',
    nomorDokumen: 'PPM-W-03',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '03',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Pelaksanaan Evaluasi Preventive Maintenance Mesin Produksi',
    nomorDokumen: 'PPM-W-05',
    level: '3',
    tanggal: '22-Jul-25',
    revisi: '05',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Preventive Maintenance Equipment Final Assy',
    nomorDokumen: 'PPM-W-06',
    level: '3',
    tanggal: '20-Aug-25',
    revisi: '07',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Pengisian CS Patroli Harian Equipment Final Assy',
    nomorDokumen: 'PPM-W-08',
    level: '3',
    tanggal: '20-May-25',
    revisi: '03',
    owner: 'PE',
    pic: 'DHS',
    email: 'danny.h@jai.co.id'
  },
  {
    nama: 'Pengisian Checksheet Patroli Harian Mesin',
    nomorDokumen: 'PPM-W-10',
    level: '3',
    tanggal: '27-Oct-25',
    revisi: '01',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Review Dokumen (Checksheet) Mesin & Equipment Produksi',
    nomorDokumen: 'PPM-W-11',
    level: '3',
    tanggal: '13-Aug-25',
    revisi: '01',
    owner: 'MTC',
    pic: 'MCB',
    email: 'm.chasan@jai.co.id'
  },
  {
    nama: 'Review Dokumen (Checksheet) Mesin & Equipment Final Assy',
    nomorDokumen: 'PPM-W-12',
    level: '3',
    tanggal: '22-Dec-25',
    revisi: '0',
    owner: 'PROD ENG',
    pic: 'YHE',
    email: 'yachrul.h@jai.co.id'
  },
  {
    nama: 'Pengendalian Alat Ukur',
    nomorDokumen: 'CMD-P-01',
    level: '2',
    tanggal: '22-Dec-21',
    revisi: '08',
    owner: 'QC MSA',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Measurement System Analysis (MSA)',
    nomorDokumen: 'CMD-P-02',
    level: '2',
    tanggal: '9-Dec-22',
    revisi: '03',
    owner: 'QC MSA',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Pembuatan MSA Plan & Evaluation',
    nomorDokumen: 'CMD-W-01',
    level: '3',
    tanggal: '10-Jul-13',
    revisi: '02',
    owner: 'QC MSA',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Analisa Hasil Kalibrasi',
    nomorDokumen: 'CMD-W-02',
    level: '3',
    tanggal: '7-Nov-25',
    revisi: '06',
    owner: 'QC MSA',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  },
  {
    nama: 'Verifikasi Torque',
    nomorDokumen: 'CMD-W-03',
    level: '3',
    tanggal: '11-Aug-25',
    revisi: '02',
    owner: 'PD, PE, QC MSA',
    pic: 'DAF,YHE,TWI',
    email: 'david.a@jai.co.id'
  },
  {
    nama: 'Penaganan Kerusakan Atau Kehilangan Alat Ukur',
    nomorDokumen: 'CMD-W-04',
    level: '3',
    tanggal: '1-Nov-24',
    revisi: '02',
    owner: 'QC MSA',
    pic: 'SFE',
    email: 'shinta.f@jai.co.id'
  }
];