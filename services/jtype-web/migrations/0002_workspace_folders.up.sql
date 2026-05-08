CREATE TABLE IF NOT EXISTS `workspace_folders` (
  `id` char(36) NOT NULL,
  `workspace_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `updated_clock` bigint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workspace_folders_path_unique` (`workspace_id`,`relative_path`),
  KEY `idx_workspace_folders_clock` (`workspace_id`,`updated_clock`),
  CONSTRAINT `workspace_folders_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `workspace_folder_deletions` (
  `workspace_id` char(36) NOT NULL,
  `relative_path` varchar(512) NOT NULL,
  `deleted_clock` bigint NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`workspace_id`,`relative_path`),
  KEY `idx_workspace_folder_deletions_clock` (`workspace_id`,`deleted_clock`),
  CONSTRAINT `workspace_folder_deletions_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
