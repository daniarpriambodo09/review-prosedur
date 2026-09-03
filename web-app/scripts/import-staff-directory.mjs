// scripts/import-staff-directory.mjs
//
// Import data staff (PIC + Manager) dari sheet "list PIC" pada file
// Matrik_Approval_Review_Prosedur_-_V2.xlsx ke skema:
//   departments -> sections -> staff_directory -> department_managers
//
// Cara pakai:
//   node scripts/import-staff-directory.mjs "path/ke/Matrik_Approval_Review_Prosedur_-_V2.xlsx"
//
// PRASYARAT: migration 002_manager_escalation.sql DAN
//            003_departments_sections.sql sudah dijalankan lebih dulu.
//
// Koneksi database otomatis dibaca dari .env.local (DB_USER, DB_HOST, DB_NAME,
// DB_PASSWORD, DB_PORT) — sama seperti scripts/import-approver-names.mjs.
//
// ── Cara kerja heuristik (2 tahap / 2-pass) ─────────────────────────────────
// TAHAP 1: baca SEMUA baris, kumpulkan token unit dari baris yang levelnya
//          MGR/SMGR/JMGR (level manager SELALU level departemen, bukan
//          section). Token dgn tanda hubung (mis. 'FATP-EXIM') dianggap SATU
//          nama departemen utuh (BUKAN dipecah) — 'FATP-EXIM' sendiri adalah
//          nama resmi departemennya.
// TAHAP 2: baca ulang semua baris. Untuk tiap baris:
//          - kalau token unit-nya PERSIS SAMA dengan salah satu departemen
//            hasil TAHAP 1 -> unit_type = 'department'.
//          - kalau tidak -> unit_type = 'section', lalu cari departemen
//            induknya lewat KNOWN_SECTION_PARENTS (daftar manual di bawah).
//            Kalau tidak ada di daftar itu juga -> section masuk ke
//            departemen placeholder 'BELUM DIKELOMPOKKAN', supaya nanti bisa
//            diperbaiki manual lewat halaman admin "Kelola Departemen".
//
// Heuristik ini TIDAK dijamin 100% benar — makanya hasilnya WAJIB dicek lagi
// via halaman admin setelah import selesai (ringkasan warning dicetak di
// akhir run).
//
// ── Override manual utk kasus yang levelnya tidak standar ──────────────────
// Contoh: "Teguh Sunjoyo" jabatannya cuma "DFM" (tidak ada kata SPV/MGR sama
// sekali). Kasus begini WAJIB didaftarkan di sini SEBELUM dijalankan.
const MANUAL_OVERRIDES = {
  // kode: { unitName: '...', isManager: true/false, isDepartment: true/false }
  TSU: { unitName: 'DFM', isManager: true, isDepartment: true }, // Teguh Sunjoyo
};

// Section yang parent departemen-nya SUDAH DIKETAHUI dari luar data Excel
// (dikonfirmasi manual). Tambahkan entry baru di sini kalau nemu section
// lain yang parent-nya kamu tahu tapi tidak bisa ditebak otomatis.
// CATATAN: FATP & EXIM adalah section di bawah departemen gabungan
// 'FATP-EXIM' (bukan departemen sendiri-sendiri); sama untuk MPC & WHS di
// bawah 'MPC-WHS'.
const KNOWN_SECTION_PARENTS = {
  IT:    'PGA',
  QSA:   'PGA',
  IR:    'PGA',
  PURCH: 'PGA',
  UTILITY: 'PGA',
  'HR-IR': 'PGA',
  DSG: 'MTC',
  PSP: 'PROD',
  'QC CHECK WH': 'QA',
  'QC REC & MSA': 'QA',
  TRN : 'PROD',
  FATP:  'FATP-EXIM',
  EXIM:  'FATP-EXIM',
  MPC:   'MPC-WHS', 
  WHS:   'MPC-WHS',
};

const FALLBACK_DEPARTMENT = 'BELUM DIKELOMPOKKAN';

import XLSX from 'xlsx';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// ── Load .env.local (kalau ada) ─────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({
      user:     process.env.DB_USER,
      host:     process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port:     Number(process.env.DB_PORT) || 5432,
    });

const DEFAULT_FILE_PATH = 'Matrik_Approval_Review_Prosedur_-_V2.xlsx';
const FILE_PATH  = process.argv[2] || DEFAULT_FILE_PATH;
const SHEET_NAME = 'list PIC';

const MANAGER_LEVELS     = ['SMGR', 'JMGR', 'MGR'];
const NON_MANAGER_LEVELS = ['SSPV', 'JSPV', 'SPV'];
const ALL_LEVELS = [...MANAGER_LEVELS, ...NON_MANAGER_LEVELS];

function clean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function parseJabatan(jabatanRaw) {
  if (!jabatanRaw) return { unitToken: null, level: null, isManagerLevel: false, matched: false };
  const upper = jabatanRaw.toUpperCase();
  for (const level of ALL_LEVELS) {
    const regex = new RegExp(`\\b${level}\\b`);
    if (regex.test(upper)) {
      const unitToken = upper.replace(regex, '').trim().replace(/\s+/g, ' ');
      return {
        unitToken: unitToken || null,
        level,
        isManagerLevel: MANAGER_LEVELS.includes(level),
        matched: true,
      };
    }
  }
  return { unitToken: null, level: null, isManagerLevel: false, matched: false };
}

async function main() {
  console.log(`Membaca file: ${FILE_PATH}`);
  const wb = XLSX.readFile(FILE_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan di ${FILE_PATH}`);

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 1 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── TAHAP 1: kumpulkan nama departemen dari baris manager ─────────────
    const departmentNames = new Set();
    for (const row of rows) {
      const kode       = clean(row[1]);
      const jabatanRaw = clean(row[4]);
      if (!kode) continue;

      let unitToken, isManagerLevel;
      if (MANUAL_OVERRIDES[kode]?.isDepartment) {
        unitToken = MANUAL_OVERRIDES[kode].unitName;
        isManagerLevel = MANUAL_OVERRIDES[kode].isManager;
      } else {
        const parsed = parseJabatan(jabatanRaw);
        unitToken = parsed.unitToken;
        isManagerLevel = parsed.isManagerLevel;
      }

      if (isManagerLevel && unitToken) {
        // Token gabungan (mis. 'FATP-EXIM') = SATU nama departemen utuh,
        // TIDAK dipecah — itu memang nama resminya.
        departmentNames.add(unitToken);
      }
    }
    // Departemen dari MANUAL_OVERRIDES yang non-manager (isDepartment tapi bukan manager) juga masuk
    for (const kode of Object.keys(MANUAL_OVERRIDES)) {
      const o = MANUAL_OVERRIDES[kode];
      if (o.isDepartment) departmentNames.add(o.unitName);
    }

    console.log(`\nTerdeteksi ${departmentNames.size} departemen dari baris manager:`);
    console.log('  ' + [...departmentNames].sort().join(', '));

    // ── Insert departments (termasuk placeholder & parent dari KNOWN_SECTION_PARENTS) ──
    const allDeptNames = new Set([
      ...departmentNames,
      ...Object.values(KNOWN_SECTION_PARENTS),
      FALLBACK_DEPARTMENT,
    ]);
    const departmentIdByName = {};
    for (const name of allDeptNames) {
      const result = await client.query(
        `INSERT INTO departments (nama) VALUES ($1)
         ON CONFLICT (nama) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [name]
      );
      departmentIdByName[name] = result.rows[0].id;
    }

    // ── TAHAP 2: klasifikasi tiap baris -> department atau section ─────────
    const sectionIdByName = {};       // cache supaya tidak insert dobel
    const unmatchedSections = [];     // section yg parent-nya fallback (perlu dicek manual)
    const unmatchedJabatan  = [];     // jabatan yg parsing-nya gagal total (tanpa override)
    const managerAssignments = [];    // { kode, deptName }
    let staffInserted = 0, staffUpdated = 0, skipped = 0;

    for (const row of rows) {
      const kode       = clean(row[1]);
      const email      = clean(row[2]);
      const nama       = clean(row[3]);
      const jabatanRaw = clean(row[4]);

      if (!kode || !email) { skipped++; continue; }

      let unitToken, isManagerLevel, matched;
      if (MANUAL_OVERRIDES[kode]) {
        unitToken = MANUAL_OVERRIDES[kode].unitName;
        isManagerLevel = MANUAL_OVERRIDES[kode].isManager;
        matched = true;
      } else {
        const parsed = parseJabatan(jabatanRaw);
        unitToken = parsed.unitToken;
        isManagerLevel = parsed.isManagerLevel;
        matched = parsed.matched;
      }

      if (!matched) {
        unmatchedJabatan.push({ kode, nama, jabatanRaw });
        // tetap insert staff-nya, tapi tanpa unit (unit_type/unit_id NULL)
        await upsertStaff(client, kode, email, nama, jabatanRaw, null, null, false);
        skipped === skipped; // no-op, staff tetap dihitung di bawah
        continue;
      }

      let unitType, unitId;

      if (departmentNames.has(unitToken)) {
        // Match persis dengan nama departemen (termasuk yang gabungan
        // dengan hyphen, mis. 'FATP-EXIM' — itu memang satu nama departemen)
        unitType = 'department';
        unitId   = departmentIdByName[unitToken];
      } else {
        // Section
        unitType = 'section';
        const parentDeptName = KNOWN_SECTION_PARENTS[unitToken] || FALLBACK_DEPARTMENT;
        if (!KNOWN_SECTION_PARENTS[unitToken]) {
          unmatchedSections.push({ kode, nama, unitToken, jabatanRaw });
        }
        if (!sectionIdByName[unitToken]) {
          const parentDeptId = departmentIdByName[parentDeptName];
          const result = await client.query(
            `INSERT INTO sections (nama, department_id) VALUES ($1, $2)
             ON CONFLICT (nama) DO UPDATE SET updated_at = NOW()
             RETURNING id`,
            [unitToken, parentDeptId]
          );
          sectionIdByName[unitToken] = result.rows[0].id;
        }
        unitId = sectionIdByName[unitToken];
      }

      const { inserted } = await upsertStaff(client, kode, email, nama, jabatanRaw, unitType, unitId, isManagerLevel);
      if (inserted) staffInserted++; else staffUpdated++;

      // Catat assignment manager -> departemen (1 token = 1 departemen,
      // termasuk yang namanya gabungan spt 'FATP-EXIM')
      if (isManagerLevel && unitToken && departmentIdByName[unitToken]) {
        managerAssignments.push({ kode, deptId: departmentIdByName[unitToken] });
      }
    }

    // ── Insert department_managers ──────────────────────────────────────────
    for (const { kode, deptId } of managerAssignments) {
      await client.query(
        `INSERT INTO department_managers (department_id, manager_kode)
         VALUES ($1, $2)
         ON CONFLICT (department_id, manager_kode) DO NOTHING`,
        [deptId, kode]
      );
    }

    await client.query('COMMIT');

    console.log('\n=== Selesai ===');
    console.log(`Staff insert baru : ${staffInserted}`);
    console.log(`Staff update      : ${staffUpdated}`);
    console.log(`Dilewati (tanpa kode/email): ${skipped}`);
    console.log(`Department manager assignments: ${managerAssignments.length}`);

    if (unmatchedJabatan.length > 0) {
      console.log(`\n⚠ Jabatan tidak terparsing sama sekali (${unmatchedJabatan.length}) — cek MANUAL_OVERRIDES:`);
      unmatchedJabatan.forEach(u => console.log(`  - ${u.kode} (${u.nama}) / "${u.jabatanRaw}"`));
    }

    if (unmatchedSections.length > 0) {
      const uniqueTokens = [...new Set(unmatchedSections.map(u => u.unitToken))];
      console.log(`\n⚠ Section yang di-fallback ke '${FALLBACK_DEPARTMENT}' (perlu dicek/diperbaiki manual lewat halaman admin) — ${uniqueTokens.length} section unik:`);
      uniqueTokens.forEach(tok => {
        const contoh = unmatchedSections.find(u => u.unitToken === tok);
        console.log(`  - "${tok}" (contoh: ${contoh.kode} - ${contoh.nama})`);
      });
      console.log('\nSemua section di atas SUDAH tersimpan di database (di bawah departemen');
      console.log(`"${FALLBACK_DEPARTMENT}") — tinggal buka halaman "Kelola Departemen" untuk`);
      console.log('memindahkan ke departemen yang benar.');
    } else {
      console.log('\nSemua section berhasil dipetakan ke departemen (otomatis / KNOWN_SECTION_PARENTS).');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function upsertStaff(client, kode, email, nama, jabatanRaw, unitType, unitId, isManager) {
  const result = await client.query(
    `INSERT INTO staff_directory (kode, email, nama, jabatan_raw, unit_type, unit_id, is_manager, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (kode) DO UPDATE SET
       email        = EXCLUDED.email,
       nama         = EXCLUDED.nama,
       jabatan_raw  = EXCLUDED.jabatan_raw,
       unit_type    = EXCLUDED.unit_type,
       unit_id      = EXCLUDED.unit_id,
       is_manager   = EXCLUDED.is_manager,
       updated_at   = NOW()
     RETURNING (xmax = 0) AS inserted`,
    [kode, email, nama, jabatanRaw, unitType, unitId, isManager]
  );
  return { inserted: result.rows[0]?.inserted === true };
}

main().catch(err => {
  console.error('Gagal menjalankan script:', err);
  process.exit(1);
});
