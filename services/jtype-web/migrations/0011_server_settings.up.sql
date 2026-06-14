-- Migration 0011: server-wide settings (generic key/value).
-- Operator-editable configuration that overrides environment variables at
-- runtime. Today this holds the object-storage config (`storage.*` keys);
-- the table is intentionally generic so future overridable settings need no
-- new migration. The database URL itself is never stored here (the server
-- must connect before it can read this table).
CREATE TABLE IF NOT EXISTS `server_settings` (
  `key` varchar(191) NOT NULL,
  `value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
