CREATE TABLE IF NOT EXISTS mobile_push_deliveries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  registration_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  event_key CHAR(64) NOT NULL,
  path_key CHAR(64) NOT NULL,
  relative_path VARCHAR(1024) NOT NULL,
  document_clock BIGINT NOT NULL,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(512) NOT NULL,
  status ENUM('pending','processing','failed','dead') NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 8,
  last_status_code INT NULL,
  last_reason VARCHAR(128) NULL,
  next_retry_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mobile_push_delivery_event (registration_id, event_key),
  KEY idx_mobile_push_delivery_path (registration_id, path_key),
  KEY idx_mobile_push_delivery_due (status, next_retry_at),
  KEY idx_mobile_push_delivery_workspace (workspace_id),
  CONSTRAINT fk_mobile_push_delivery_registration
    FOREIGN KEY (registration_id) REFERENCES mobile_push_registrations(id) ON DELETE CASCADE,
  CONSTRAINT fk_mobile_push_delivery_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
