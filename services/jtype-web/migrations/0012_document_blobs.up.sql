-- Migration 0012: path-keyed binary blobs (images, PDFs, any vault asset).
-- Unlike `assets` (UUID/sha-keyed, image-only, for the web editor), blobs are
-- keyed by vault relative_path so desktop clients sync binary files the same way
-- they sync markdown documents. Object bytes live in the object store, while this
-- table is the metadata plus sync-clock index. Tombstones (deleted_clock set)
-- propagate deletions to other devices.
CREATE TABLE IF NOT EXISTS `document_blobs` (
  `workspace_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `storage_key` varchar(600) NOT NULL,
  `content_type` varchar(128) NOT NULL,
  `byte_size` bigint NOT NULL,
  `sha256` char(64) NOT NULL,
  `updated_clock` bigint NOT NULL DEFAULT 0,
  `deleted_clock` bigint DEFAULT NULL,
  `created_by_user_id` char(36) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`workspace_id`, `relative_path`),
  KEY `idx_blobs_ws_clock` (`workspace_id`, `updated_clock`),
  CONSTRAINT `blobs_workspace_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
