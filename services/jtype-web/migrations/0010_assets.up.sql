-- Migration 0010: binary assets (images) for Markdown.
-- Object bytes live in the object store (RustFS/S3/local). This table is the
-- metadata index. Public reads are proxied by the web service.
CREATE TABLE IF NOT EXISTS `assets` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `storage_key` varchar(600) NOT NULL,
  `content_type` varchar(128) NOT NULL,
  `byte_size` bigint NOT NULL,
  `sha256` char(64) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `created_by_user_id` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_ws_sha` (`workspace_id`, `sha256`),
  KEY `idx_assets_workspace` (`workspace_id`),
  CONSTRAINT `assets_workspace_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
