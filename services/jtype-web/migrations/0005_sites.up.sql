-- Migration 0005: sites, published_pages, remove documents.status

-- Step 1: add is_published cache column to documents
ALTER TABLE `documents` ADD COLUMN `is_published` TINYINT(1) NOT NULL DEFAULT 0;

-- Step 2: backfill from the legacy status enum
UPDATE `documents` SET `is_published` = 1 WHERE `status` = 'published';

-- Step 3: drop the status enum column
ALTER TABLE `documents` DROP COLUMN `status`;

-- Step 4: create sites table (one per workspace)
CREATE TABLE IF NOT EXISTS `sites` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT '',
  `footer_html` text DEFAULT NULL,
  `theme` varchar(64) NOT NULL DEFAULT 'default',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sites_workspace_id` (`workspace_id`),
  CONSTRAINT `sites_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Step 5: create published_pages table
CREATE TABLE IF NOT EXISTS `published_pages` (
  `id` char(36) NOT NULL,
  `site_id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `document_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `title` varchar(512) NOT NULL,
  `content` mediumtext NOT NULL,
  `content_hash` char(64) NOT NULL,
  `version_id` char(36) DEFAULT NULL,
  `published_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `published_pages_site_ws_path` (`site_id`,`workspace_id`,`relative_path`),
  KEY `idx_published_pages_document` (`document_id`),
  KEY `idx_published_pages_site` (`site_id`),
  CONSTRAINT `published_pages_site_fk` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `published_pages_workspace_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `published_pages_document_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Step 6: add site_id to custom_domains and link to sites
ALTER TABLE `custom_domains` ADD COLUMN `site_id` char(36) DEFAULT NULL;
ALTER TABLE `custom_domains` ADD CONSTRAINT `custom_domains_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE SET NULL;
