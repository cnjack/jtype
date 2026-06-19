-- Email OTP login codes.
--
-- A user requests a 6-digit code via /api/auth/otp/send; the code (SHA-256
-- hashed) is stored here with a 10-minute expiry and an attempt counter. The
-- verify endpoint does an atomic claim: it consumes the code on success, or
-- increments `attempts` on failure, locking the code after 5 wrong tries to
-- blunt brute force (1e6 possible 6-digit codes). Single-use: a consumed code
-- can't be replayed. Mirrors the password_reset_tokens / oauth_device_codes
-- SHA-256-hash + consumed_at pattern.

CREATE TABLE IF NOT EXISTS `login_otp_tokens` (
  `token_hash` char(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  -- Expiry set at INSERT time (DATE_ADD in the handler); see 0014 for why the
  -- DEFAULT is NULL rather than an expression (TiDB compatibility).
  `expires_at` timestamp NULL DEFAULT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_hash`),
  KEY `login_otp_tokens_user_fk` (`user_id`),
  CONSTRAINT `login_otp_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
