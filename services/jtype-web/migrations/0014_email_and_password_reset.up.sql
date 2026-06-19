-- Email verification + password reset via email.
--
-- `users.email` already exists (nullable, unconstrained since 0001). This adds:
--   * `email_verified_at` — NULL until the user confirms the address via email
--   * a UNIQUE index on `email` — password reset depends on email uniqueness.
--     InnoDB allows multiple NULLs, so users without an email never collide.
--   * `password_reset_tokens` — single-use, SHA-256-hashed, 10-min expiry,
--     mirroring the oauth_device_codes pattern (atomic claim in the handler).
--
-- Idempotent: every DDL is guarded so a partially-applied database (e.g. one
-- where `email_verified_at` was added manually before the migration was
-- recorded) can re-run without a "Duplicate column / key" failure. This matters
-- because the migration runner records the version only after the whole file
-- succeeds, so a mid-file crash or manual partial apply leaves the schema ahead
-- of `_schema_migrations` and the next run replays the whole file.

-- email_verified_at column (skip if already present).
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
                     AND COLUMN_NAME = 'email_verified_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `email_verified_at` timestamp NULL DEFAULT NULL',
  'SELECT "email_verified_at already exists" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Unique index on email (skip if already present). InnoDB allows multiple
-- NULLs, so this only constrains users who actually set an email.
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
                     AND INDEX_NAME = 'users_email_unique');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `users` ADD UNIQUE INDEX `users_email_unique` (`email`)',
  'SELECT "users_email_unique already exists" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `token_hash` char(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE),
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_hash`),
  KEY `password_reset_tokens_user_fk` (`user_id`),
  CONSTRAINT `password_reset_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Email verification uses the same single-use token shape. Sharing one table
-- would couple two lifecycles, so this is a parallel table.
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `token_hash` char(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 DAY),
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_hash`),
  KEY `email_verification_tokens_user_fk` (`user_id`),
  CONSTRAINT `email_verification_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
