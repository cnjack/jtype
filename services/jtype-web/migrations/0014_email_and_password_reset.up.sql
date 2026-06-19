-- Email verification + password reset via email.
--
-- `users.email` already exists (nullable, unconstrained since 0001). This adds:
--   * `email_verified_at` — NULL until the user confirms the address via email
--   * a UNIQUE index on `email` — password reset depends on email uniqueness.
--     InnoDB allows multiple NULLs, so users without an email never collide.
--   * `password_reset_tokens` — single-use, SHA-256-hashed, 10-min expiry,
--     mirroring the oauth_device_codes pattern (atomic claim in the handler).

ALTER TABLE `users` ADD COLUMN `email_verified_at` timestamp NULL DEFAULT NULL;

-- Unique on a nullable column: multiple NULLs are allowed by InnoDB, so this
-- only constrains users who actually set an email.
ALTER TABLE `users` ADD UNIQUE INDEX `users_email_unique` (`email`);

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `token_hash` char(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  -- Expiry is set explicitly at INSERT time (DATE_ADD in the handler), not via
  -- a DEFAULT expression: TiDB rejects `DEFAULT (CURRENT_TIMESTAMP + INTERVAL ...)`
  -- (ER_PARSE_ERROR 1064), and MySQL 5.7 doesn't support expression defaults
  -- either. Mirrors the oauth_device_codes pattern.
  `expires_at` timestamp NULL DEFAULT NULL,
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
  `expires_at` timestamp NULL DEFAULT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_hash`),
  KEY `email_verification_tokens_user_fk` (`user_id`),
  CONSTRAINT `email_verification_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
