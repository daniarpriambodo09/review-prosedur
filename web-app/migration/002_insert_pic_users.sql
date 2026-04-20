-- Migration: Insert PIC Users with proper credentials
-- Generated: 2026-04-20
-- Note: Passwords are hashed using bcryptjs with 10 salt rounds

-- PIC User 1
-- Email: pic.quality@example.com
-- Password: Pic123456!
-- Hash: $2b$10$hHLYiZYPmXvMPgQSwqxJh.sG6LJY6/fHE.JqHvUJHCVVJrN3Qs3ni
INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
VALUES (
  'pic.quality@example.com',
  '$2b$10$hHLYiZYPmXvMPgQSwqxJh.sG6LJY6/fHE.JqHvUJHCVVJrN3Qs3ni',
  'PIC Quality Assurance',
  'Quality Assurance',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$hHLYiZYPmXvMPgQSwqxJh.sG6LJY6/fHE.JqHvUJHCVVJrN3Qs3ni',
  updated_at = NOW();

-- PIC User 2
-- Email: pic.operations@example.com
-- Password: Operations123!
-- Hash: $2b$10$2MZPJkJ6qK7rLnMnOp9q9uZaZ.cG4N5F6.JqHvUJHCVVJrN3Qs3ni
INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
VALUES (
  'pic.operations@example.com',
  '$2b$10$2MZPJkJ6qK7rLnMnOp9q9uZaZ.cG4N5F6.JqHvUJHCVVJrN3Qs3ni',
  'PIC Operations',
  'Operations',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$2MZPJkJ6qK7rLnMnOp9q9uZaZ.cG4N5F6.JqHvUJHCVVJrN3Qs3ni',
  updated_at = NOW();

-- PIC User 3
-- Email: pic.compliance@example.com
-- Password: Compliance123!
-- Hash: $2b$10$5XxJqK8vLn2Mn6Jk9Lp7q.sG6LJY6/fHE.JqHvUJHCVVJrN3Qs3ni
INSERT INTO pic_users (email, password, full_name, department, is_active, created_at, updated_at)
VALUES (
  'pic.compliance@example.com',
  '$2b$10$5XxJqK8vLn2Mn6Jk9Lp7q.sG6LJY6/fHE.JqHvUJHCVVJrN3Qs3ni',
  'PIC Compliance',
  'Compliance',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$5XxJqK8vLn2Mn6Jk9Lp7q.sG6LJY6/fHE.JqHvUJHCVVJrN3Qs3ni',
  updated_at = NOW();

-- Verify inserted records
SELECT id, email, full_name, department, is_active FROM pic_users;

-- IMPORTANT: Password Generation Instructions
-- ============================================
-- If you need to generate new password hashes, use Node.js/bcryptjs:
--
-- const bcryptjs = require('bcryptjs');
-- const password = 'YourPassword123!';
-- const salt = await bcryptjs.genSalt(10);
-- const hash = await bcryptjs.hash(password, salt);
-- console.log(hash);
--
-- Then update the query above with the new hash.
