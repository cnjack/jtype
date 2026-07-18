CREATE TABLE IF NOT EXISTS `sync_push_requests` (
  `workspace_id` char(36) NOT NULL,
  `device_id` varchar(128) NOT NULL,
  `request_id` varchar(128) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `response_json` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`workspace_id`,`device_id`,`request_id`),
  KEY `idx_sync_push_requests_created_at` (`created_at`),
  CONSTRAINT `sync_push_requests_workspace_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
