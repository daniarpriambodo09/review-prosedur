-- migration/patches/007_restore_missing_rejections_from_activity_logs.sql
-- Memulihkan catatan penolakan yang sempat terhapus akibat cascade delete di masa lalu
-- dengan membaca kembali dari activity_logs.

DO $$
DECLARE
  r RECORD;
  v_role VARCHAR(20);
  v_email VARCHAR(255);
  v_reason TEXT;
  v_nomor_dokumen VARCHAR(255);
  v_cycle_id INT;
  v_match TEXT[];
BEGIN
  FOR r IN
    SELECT id, username, activity_description, target_id, created_at
    FROM activity_logs
    WHERE activity_description ILIKE '%MENOLAK dokumen%'
    ORDER BY id ASC
  LOOP
    -- Regex parse: "(Prepared|Checked|Approved) (email) MENOLAK dokumen nama — alasan: alasan"
    v_match := regexp_matches(
      r.activity_description,
      '^(Prepared|Checked|Approved)\s+\(([^)]+)\)\s+MENOLAK dokumen\s+(.*?)\s+—\s+alasan:\s+(.*)$',
      'i'
    );

    IF v_match IS NOT NULL AND array_length(v_match, 1) = 4 THEN
      v_role := lower(v_match[1]);
      v_email := trim(v_match[2]);
      v_reason := trim(v_match[4]);
      v_nomor_dokumen := r.target_id;

      -- Cari cycle_id terdekat untuk dokumen ini
      SELECT id INTO v_cycle_id
      FROM procedure_approval_cycles
      WHERE nomor_dokumen = v_nomor_dokumen AND created_at <= r.created_at
      ORDER BY id DESC
      LIMIT 1;

      -- Jika tidak ada, ambil cycle terakhir dokumen ini
      IF v_cycle_id IS NULL THEN
        SELECT id INTO v_cycle_id
        FROM procedure_approval_cycles
        WHERE nomor_dokumen = v_nomor_dokumen
        ORDER BY id DESC
        LIMIT 1;
      END IF;

      -- Jika cycle ditemukan, cek apakah action penolakan sudah ada
      IF v_cycle_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM procedure_approval_actions
          WHERE cycle_id = v_cycle_id AND role = v_role AND acc_status = 'rejected' AND email = v_email
        ) THEN
          INSERT INTO procedure_approval_actions
            (cycle_id, approver_id, role, nama, email, token, verification_code, acc_status, acc_at, reject_reason)
          VALUES (
            v_cycle_id,
            NULL,
            v_role,
            split_part(v_email, '@', 1),
            v_email,
            'restored_' || r.id || '_' || substr(md5(random()::text), 1, 8),
            'R' || r.id,
            'rejected',
            r.created_at,
            v_reason
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END $$;
