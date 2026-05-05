ALTER TABLE document_trash
  ADD COLUMN source_device_id VARCHAR(128) NULL AFTER deleted_by_device_id,
  ADD COLUMN restored_by_device_id VARCHAR(128) NULL AFTER restored_at,
  ADD COLUMN restored_by_user_id CHAR(36) NULL AFTER restored_by_device_id,
  ADD COLUMN restored_clock BIGINT NULL AFTER restored_by_user_id;

CREATE INDEX idx_document_trash_restored
  ON document_trash (workspace_id, restored_at, restored_clock);

CREATE TABLE IF NOT EXISTS trash_events (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  event_type ENUM('empty_trash', 'permanent_delete_all', 'permanent_delete_item') NOT NULL,
  event_data JSON NOT NULL,
  event_clock BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT trash_events_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_trash_events_clock (workspace_id, event_clock)
);

CREATE TABLE IF NOT EXISTS device_trash_cursors (
  device_id VARCHAR(128) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  last_trash_event_clock BIGINT DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (device_id, workspace_id),
  CONSTRAINT device_trash_cursors_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
