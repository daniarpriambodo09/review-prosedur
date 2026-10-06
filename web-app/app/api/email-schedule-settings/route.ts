// app/api/email-schedule-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface EmailScheduleConfig {
  id?: number;
  picReminderMonthsBefore: number;
  picSendDayOfMonth: number;
  picSendHour: number;
  picSendMinute: number;
  managerReminderMonthsBefore: number;
  managerSendDayOfMonth: number;
  managerSendHour: number;
  managerSendMinute: number;
  autoRescheduleActive: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export async function GET() {
  const client = await pool.connect();
  try {
    // 1. Ambil pengaturan jadwal saat ini
    const settingsRes = await client.query(`
      SELECT 
        id,
        pic_reminder_months_before,
        pic_send_day_of_month,
        pic_send_hour,
        pic_send_minute,
        manager_reminder_months_before,
        manager_send_day_of_month,
        manager_send_hour,
        manager_send_minute,
        auto_reschedule_active,
        updated_by,
        updated_at
      FROM email_schedule_settings
      ORDER BY id ASC
      LIMIT 1;
    `);

    let settings: EmailScheduleConfig = {
      picReminderMonthsBefore: 2,
      picSendDayOfMonth: 1,
      picSendHour: 8,
      picSendMinute: 0,
      managerReminderMonthsBefore: 1,
      managerSendDayOfMonth: 1,
      managerSendHour: 8,
      managerSendMinute: 0,
      autoRescheduleActive: true,
      updatedBy: 'System',
    };

    if (settingsRes.rows.length > 0) {
      const row = settingsRes.rows[0];
      settings = {
        id: row.id,
        picReminderMonthsBefore: row.pic_reminder_months_before ?? 2,
        picSendDayOfMonth: row.pic_send_day_of_month ?? 1,
        picSendHour: row.pic_send_hour ?? 8,
        picSendMinute: row.pic_send_minute ?? 0,
        managerReminderMonthsBefore: row.manager_reminder_months_before ?? 1,
        managerSendDayOfMonth: row.manager_send_day_of_month ?? 1,
        managerSendHour: row.manager_send_hour ?? 8,
        managerSendMinute: row.manager_send_minute ?? 0,
        autoRescheduleActive: row.auto_reschedule_active ?? true,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      };
    }

    // 2. Ambil statistik jadwal email pending saat ini
    const statsRes = await client.query(`
      SELECT 
        COUNT(*) as total_pending,
        MIN(scheduled_email_at) as earliest_scheduled,
        COUNT(CASE WHEN is_manual = TRUE THEN 1 END) as manual_pending_count,
        COUNT(CASE WHEN is_manual = FALSE OR is_manual IS NULL THEN 1 END) as auto_pending_count
      FROM email_schedules
      WHERE email_status = 'pending';
    `);

    const stats = statsRes.rows[0] || {};

    return NextResponse.json({
      success: true,
      settings,
      stats: {
        totalPending: parseInt(stats.total_pending || '0'),
        earliestScheduled: stats.earliest_scheduled ? new Date(stats.earliest_scheduled).toISOString() : null,
        manualPendingCount: parseInt(stats.manual_pending_count || '0'),
        autoPendingCount: parseInt(stats.auto_pending_count || '0'),
      },
    });
  } catch (error: any) {
    console.error('Error fetching email schedule settings:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat pengaturan jadwal' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      picReminderMonthsBefore = 2,
      picSendDayOfMonth = 1,
      picSendHour = 8,
      picSendMinute = 0,
      managerReminderMonthsBefore = 1,
      managerSendDayOfMonth = 1,
      managerSendHour = 8,
      managerSendMinute = 0,
      autoRescheduleActive = true,
      syncPendingSchedules = false,
      updatedBy = 'Admin',
    } = body;

    // Validasi parameter
    const dayPIC = Math.max(1, Math.min(28, parseInt(picSendDayOfMonth) || 1));
    const hourPIC = Math.max(0, Math.min(23, parseInt(picSendHour) || 0));
    const minPIC = Math.max(0, Math.min(59, parseInt(picSendMinute) || 0));
    const monthsPIC = Math.max(1, Math.min(6, parseInt(picReminderMonthsBefore) || 2));

    const dayMgr = Math.max(1, Math.min(28, parseInt(managerSendDayOfMonth) || 1));
    const hourMgr = Math.max(0, Math.min(23, parseInt(managerSendHour) || 0));
    const minMgr = Math.max(0, Math.min(59, parseInt(managerSendMinute) || 0));
    const monthsMgr = Math.max(1, Math.min(6, parseInt(managerReminderMonthsBefore) || 1));

    // Update atau Insert ke tabel
    const upsertRes = await client.query(
      `
      INSERT INTO email_schedule_settings (
        id, pic_reminder_months_before, pic_send_day_of_month, pic_send_hour, pic_send_minute,
        manager_reminder_months_before, manager_send_day_of_month, manager_send_hour, manager_send_minute,
        auto_reschedule_active, updated_by, updated_at
      ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (id)
      DO UPDATE SET
        pic_reminder_months_before     = EXCLUDED.pic_reminder_months_before,
        pic_send_day_of_month          = EXCLUDED.pic_send_day_of_month,
        pic_send_hour                  = EXCLUDED.pic_send_hour,
        pic_send_minute                = EXCLUDED.pic_send_minute,
        manager_reminder_months_before = EXCLUDED.manager_reminder_months_before,
        manager_send_day_of_month      = EXCLUDED.manager_send_day_of_month,
        manager_send_hour              = EXCLUDED.manager_send_hour,
        manager_send_minute            = EXCLUDED.manager_send_minute,
        auto_reschedule_active         = EXCLUDED.auto_reschedule_active,
        updated_by                     = EXCLUDED.updated_by,
        updated_at                     = CURRENT_TIMESTAMP
      RETURNING *;
      `,
      [
        monthsPIC, dayPIC, hourPIC, minPIC,
        monthsMgr, dayMgr, hourMgr, minMgr,
        autoRescheduleActive, updatedBy,
      ]
    );

    let updatedPendingCount = 0;

    // ── Jika opsi syncPendingSchedules dicentang: perbarui seluruh jadwal otomatis yang pending
    if (syncPendingSchedules) {
      // Ambil seluruh jadwal pending yang bukan manual
      const pendingRows = await client.query(`
        SELECT 
          es.id,
          es.nomor_dokumen,
          es.cycle_deadline_at,
          pd.tanggal_selesai_approval
        FROM email_schedules es
        JOIN procedure_documents pd ON es.nomor_dokumen = pd.nomor_dokumen
        WHERE es.email_status = 'pending'
          AND (es.is_manual = FALSE OR es.is_manual IS NULL);
      `);

      for (const row of pendingRows.rows) {
        // Tentukan deadline basis
        let deadline = row.cycle_deadline_at ? new Date(row.cycle_deadline_at) : null;
        if (!deadline || isNaN(deadline.getTime())) {
          const docDate = new Date(row.tanggal_selesai_approval);
          if (!isNaN(docDate.getTime())) {
            const now = new Date();
            let dYear = now.getFullYear();
            if (new Date(dYear, docDate.getMonth(), docDate.getDate()) < now) {
              dYear += 1;
            }
            deadline = new Date(dYear, docDate.getMonth(), docDate.getDate());
          }
        }

        if (deadline && !isNaN(deadline.getTime())) {
          // Hitung tanggal PIC baru
          const newPicDate = new Date(
            deadline.getFullYear(),
            deadline.getMonth() - monthsPIC,
            dayPIC,
            hourPIC,
            minPIC,
            0
          );

          // Hitung tanggal Manager baru
          const newMgrDate = new Date(
            deadline.getFullYear(),
            deadline.getMonth() - monthsMgr,
            dayMgr,
            hourMgr,
            minMgr,
            0
          );

          await client.query(
            `
            UPDATE email_schedules
            SET scheduled_email_at = $1,
                manager_email_scheduled_at = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3;
            `,
            [newPicDate.toISOString(), newMgrDate.toISOString(), row.id]
          );
          updatedPendingCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: syncPendingSchedules
        ? `Pengaturan jadwal berhasil disimpan dan ${updatedPendingCount} jadwal pending berhasil diperbarui.`
        : 'Pengaturan jadwal berhasil disimpan.',
      updatedPendingCount,
      settings: upsertRes.rows[0],
    });
  } catch (error: any) {
    console.error('Error saving email schedule settings:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pengaturan jadwal' }, { status: 500 });
  } finally {
    client.release();
  }
}
