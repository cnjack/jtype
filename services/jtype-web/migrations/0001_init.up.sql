-- JType schema: single init migration
-- All active tables for jtype-web service

CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) NOT NULL,
  `username` varchar(80) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `site_title` varchar(255) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `disabled_at` timestamp NULL DEFAULT NULL,
  `storage_budget_bytes` bigint NOT NULL DEFAULT '1073741824',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `workspaces` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `owner_user_id` char(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `publish_title` varchar(255) DEFAULT NULL,
  `root_hint` varchar(1024) DEFAULT NULL,
  `storage_budget_bytes` bigint NOT NULL DEFAULT '1073741824',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workspaces_user_name_unique` (`user_id`,`name`),
  CONSTRAINT `workspaces_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `workspace_members` (
  `workspace_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `role` enum('owner','admin','editor','viewer') NOT NULL DEFAULT 'viewer',
  `status` enum('active','invited','removed') NOT NULL DEFAULT 'active',
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`workspace_id`,`user_id`),
  KEY `workspace_members_user_id_fk` (`user_id`),
  CONSTRAINT `workspace_members_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workspace_members_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `workspace_invites` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `invited_by_user_id` char(36) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` enum('admin','editor','viewer') NOT NULL DEFAULT 'editor',
  `token_hash` char(64) NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `workspace_invites_workspace_id_fk` (`workspace_id`),
  KEY `workspace_invites_invited_by_fk` (`invited_by_user_id`),
  CONSTRAINT `workspace_invites_invited_by_fk` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workspace_invites_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `documents` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `title` varchar(512) NOT NULL,
  `status` enum('draft','ready','published','archived') NOT NULL DEFAULT 'draft',
  `content_hash` char(64) NOT NULL,
  `content` mediumtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_clock` bigint NOT NULL DEFAULT '0',
  `current_version_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documents_workspace_path_unique` (`workspace_id`,`relative_path`),
  CONSTRAINT `documents_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `document_id` char(36) NOT NULL,
  `parent_version_id` char(36) DEFAULT NULL,
  `base_version_id` char(36) DEFAULT NULL,
  `author_user_id` char(36) NOT NULL,
  `author_device_id` varchar(128) DEFAULT NULL,
  `source` enum('desktop','web','system') NOT NULL,
  `content_hash` char(64) NOT NULL,
  `content` mediumtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `document_versions_workspace_id_fk` (`workspace_id`),
  KEY `document_versions_document_id_fk` (`document_id`),
  KEY `document_versions_author_user_id_fk` (`author_user_id`),
  CONSTRAINT `document_versions_author_user_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_versions_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_versions_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `token_hash` char(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `sessions_user_id_fk` (`user_id`),
  CONSTRAINT `sessions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `oauth_device_codes` (
  `device_code_hash` char(64) NOT NULL,
  `user_code` varchar(16) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`device_code_hash`),
  UNIQUE KEY `user_code` (`user_code`),
  KEY `oauth_device_codes_user_id_fk` (`user_id`),
  CONSTRAINT `oauth_device_codes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `workspace_sync_cursors` (
  `workspace_id` char(36) NOT NULL,
  `device_id` varchar(128) NOT NULL,
  `last_seen_clock` bigint NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`workspace_id`,`device_id`),
  CONSTRAINT `workspace_sync_cursors_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `sync_conflicts` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `document_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `base_content` mediumtext,
  `local_content` mediumtext NOT NULL,
  `cloud_content` mediumtext NOT NULL,
  `conflict_ranges` json DEFAULT NULL,
  `status` enum('open','resolved') NOT NULL DEFAULT 'open',
  `resolution` enum('accept_local','accept_cloud','keep_both','manual_merge') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sync_conflicts_workspace_id_fk` (`workspace_id`),
  KEY `sync_conflicts_document_id_fk` (`document_id`),
  CONSTRAINT `sync_conflicts_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sync_conflicts_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `document_trash` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `document_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `title` varchar(512) NOT NULL,
  `content` mediumtext NOT NULL,
  `content_hash` char(64) NOT NULL,
  `version_id` char(36) DEFAULT NULL,
  `deleted_by_user_id` char(36) NOT NULL,
  `deleted_by_device_id` varchar(128) DEFAULT NULL,
  `source_device_id` varchar(128) DEFAULT NULL,
  `source_user_id` char(36) DEFAULT NULL,
  `deleted_clock` bigint NOT NULL DEFAULT '0',
  `deleted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `restored_at` timestamp NULL DEFAULT NULL,
  `restored_by_device_id` varchar(128) DEFAULT NULL,
  `restored_by_user_id` char(36) DEFAULT NULL,
  `restored_clock` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_document_trash_workspace_id` (`workspace_id`),
  KEY `idx_document_trash_ws_clock` (`workspace_id`,`deleted_clock`),
  KEY `idx_document_trash_expires_at` (`expires_at`),
  KEY `idx_document_trash_restored` (`workspace_id`,`restored_at`,`restored_clock`),
  CONSTRAINT `document_trash_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `trash_events` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `event_type` enum('empty_trash','permanent_delete_all','permanent_delete_item') NOT NULL,
  `event_data` json NOT NULL,
  `event_clock` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trash_events_clock` (`workspace_id`,`event_clock`),
  CONSTRAINT `trash_events_workspace_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `custom_domains` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `workspace_id` char(36) DEFAULT NULL,
  `domain` varchar(255) NOT NULL,
  `verification_token` varchar(128) NOT NULL,
  `status` enum('pending','verified','failed') NOT NULL DEFAULT 'pending',
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`),
  KEY `custom_domains_user_id_fk` (`user_id`),
  KEY `custom_domains_workspace_id_fk` (`workspace_id`),
  CONSTRAINT `custom_domains_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `custom_domains_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ssl_certificates` (
  `id` char(36) NOT NULL,
  `domain_id` char(36) NOT NULL,
  `cert_chain_pem` mediumtext NOT NULL,
  `private_key_hash` char(64) NOT NULL,
  `issuer` varchar(512) DEFAULT NULL,
  `not_before` timestamp NULL DEFAULT NULL,
  `not_after` timestamp NULL DEFAULT NULL,
  `status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ssl_certificates_domain_id_fk` (`domain_id`),
  CONSTRAINT `ssl_certificates_domain_id_fk` FOREIGN KEY (`domain_id`) REFERENCES `custom_domains` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
