ALTER TABLE sync_conflicts ADD COLUMN conflict_ranges JSON NULL AFTER cloud_content;

CREATE TABLE IF NOT EXISTS document_trash (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  relative_path VARCHAR(512) NOT NULL,
  title VARCHAR(512) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  version_id CHAR(36) NULL,
  deleted_by_user_id CHAR(36) NOT NULL,
  deleted_by_device_id VARCHAR(128) NULL,
  deleted_clock BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  restored_at TIMESTAMP NULL,
  CONSTRAINT document_trash_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_trash_workspace_id ON document_trash (workspace_id);
CREATE INDEX idx_document_trash_ws_clock ON document_trash (workspace_id, deleted_clock);
CREATE INDEX idx_document_trash_expires_at ON document_trash (expires_at);
