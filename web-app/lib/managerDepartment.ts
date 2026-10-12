// lib/managerDepartment.ts

import { PoolClient } from 'pg';

export interface ManagerDepartmentResult {
  isManager: boolean;
  departments: Array<{ id: number; nama: string }>;
  jabatan: string | null;
  staffCodes: string[];
}

/**
 * Resolve apakah user PIC terhubung ke data staff_directory dengan jabatan Manager,
 * dan dapatkan daftar departemen yang dipimpin / dinaunginya.
 */
export async function resolveManagerDepartments(
  client: PoolClient,
  picEmail: string,
  picFullName: string = '',
  picCodes: string[] = []
): Promise<ManagerDepartmentResult> {
  // 1. Cari data staf yang cocok di staff_directory berdasarkan email, kode, atau nama
  const staffQuery = `
    SELECT s.kode, s.email, s.nama, s.jabatan, s.jabatan_raw, s.is_manager, s.unit_type, s.unit_id
    FROM staff_directory s
    WHERE LOWER(s.email) = LOWER($1)
       OR s.kode = ANY($2)
       OR (NULLIF($3, '') IS NOT NULL AND LOWER(s.nama) = LOWER($3))
  `;
  const staffRes = await client.query(staffQuery, [picEmail, picCodes, picFullName || '']);
  const staffRows = staffRes.rows;

  if (staffRows.length === 0) {
    return { isManager: false, departments: [], jabatan: null, staffCodes: [] };
  }

  const codes = staffRows.map(s => s.kode);

  // 2. Cek apakah ada penugasan di tabel department_managers
  const dmRes = await client.query(
    `SELECT dm.department_id, d.nama
     FROM department_managers dm
     JOIN departments d ON d.id = dm.department_id
     WHERE dm.manager_kode = ANY($1)`,
    [codes]
  );

  // 3. Evaluasi apakah staff ini adalah Manager:
  //    - is_manager = true
  //    - jabatan / jabatan_raw mengandung MGR / Manager / SMGR / JMGR / DFM
  //    - atau terdaftar di department_managers
  const isExplicitManager =
    staffRows.some(s =>
      s.is_manager === true ||
      /mgr|manager|smgr|jmgr|dfm/i.test(s.jabatan || '') ||
      /mgr|manager|smgr|jmgr|dfm/i.test(s.jabatan_raw || '')
    ) || dmRes.rows.length > 0;

  if (!isExplicitManager) {
    return { isManager: false, departments: [], jabatan: null, staffCodes: codes };
  }

  // 4. Resolve seluruh departemen yang dipimpin / dinaungi oleh manager ini
  const deptMap = new Map<number, string>();

  // A. Dari department_managers
  for (const r of dmRes.rows) {
    deptMap.set(r.department_id, r.nama);
  }

  // B. Dari unit_type = 'department' langsung pada staff_directory
  const deptUnitIds = staffRows
    .filter(s => s.unit_type === 'department' && s.unit_id)
    .map(s => Number(s.unit_id));
  if (deptUnitIds.length > 0) {
    const dRes = await client.query(
      `SELECT id, nama FROM departments WHERE id = ANY($1)`,
      [deptUnitIds]
    );
    for (const r of dRes.rows) deptMap.set(r.id, r.nama);
  }

  // C. Dari staff_sections -> section yang memiliki department_id
  const secStaffRes = await client.query(
    `SELECT d.id, d.nama
     FROM staff_sections ss
     JOIN sections sc ON sc.id = ss.section_id
     JOIN departments d ON d.id = sc.department_id
     WHERE ss.staff_kode = ANY($1)`,
    [codes]
  );
  for (const r of secStaffRes.rows) deptMap.set(r.id, r.nama);

  // D. Dari unit_type = 'section' pada staff_directory -> departemen section tersebut
  const secUnitIds = staffRows
    .filter(s => s.unit_type === 'section' && s.unit_id)
    .map(s => Number(s.unit_id));
  if (secUnitIds.length > 0) {
    const dSecRes = await client.query(
      `SELECT d.id, d.nama
       FROM sections sc
       JOIN departments d ON d.id = sc.department_id
       WHERE sc.id = ANY($1)`,
      [secUnitIds]
    );
    for (const r of dSecRes.rows) deptMap.set(r.id, r.nama);
  }

  // E. Jika belum ter-resolve ke departemen manapun, cocokkan nama departemen dari jabatan_raw / nama
  if (deptMap.size === 0) {
    const dAll = await client.query(`SELECT id, nama FROM departments`);
    for (const s of staffRows) {
      const combinedText = `${s.jabatan_raw || ''} ${s.nama || ''} ${s.jabatan || ''}`.toLowerCase();
      for (const d of dAll.rows) {
        if (combinedText.includes(d.nama.toLowerCase())) {
          deptMap.set(d.id, d.nama);
        }
      }
    }
  }

  const jabatan =
    staffRows.find(s => s.jabatan)?.jabatan ||
    staffRows.find(s => s.jabatan_raw)?.jabatan_raw ||
    'Manager';

  return {
    isManager: true,
    departments: Array.from(deptMap.entries()).map(([id, nama]) => ({ id, nama })),
    jabatan,
    staffCodes: codes,
  };
}
