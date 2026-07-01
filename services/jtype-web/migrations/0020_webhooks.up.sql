-- Webhooks rebuilt on the document model (unification v2). Re-homed off the
-- retired kanban_* tables: board scope is now the board's LOGICAL id (a card's
-- `board:` frontmatter value), not a kanban_boards row. Triggered from document
-- saves (handlers/document.rs), delivered by tasks::webhook_delivery.
CREATE TABLE webhooks (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  board_ref VARCHAR(255) NULL,
  name VARCHAR(160) NOT NULL,
  target_url VARCHAR(2048) NOT NULL,
  secret CHAR(64) NOT NULL,
  event_types JSON NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id CHAR(36) NOT NULL,
  last_delivery_at TIMESTAMP NULL,
  last_status VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_webhooks_workspace (workspace_id),
  KEY idx_webhooks_enabled (workspace_id, enabled),
  CONSTRAINT webhooks_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT webhooks_creator_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE webhook_deliveries (
  id CHAR(36) NOT NULL,
  webhook_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','succeeded','failed','dead') NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 6,
  last_status_code INT NULL,
  last_error VARCHAR(512) NULL,
  next_retry_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_deliveries_webhook (webhook_id),
  KEY idx_deliveries_due (status, next_retry_at),
  CONSTRAINT deliveries_webhook_fk FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
  CONSTRAINT deliveries_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
