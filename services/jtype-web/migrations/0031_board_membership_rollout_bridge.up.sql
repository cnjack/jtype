-- Unprivileged rolling-deploy compatibility bridge for the projection
-- introduced by 0030. The migration hook locks each workspace's sync_clock,
-- rebuilds its projection, and records that clock. Legacy service instances
-- already advance the same clock before every accepted document mutation.
-- Board reads can therefore repair documents newer than this watermark with
-- the canonical Rust parser; no trigger, SUPER privilege, SQL YAML parser, or
-- instantaneous fleet restart is required.
CREATE TABLE board_membership_projection_state (
  workspace_id CHAR(36) NOT NULL,
  reconciled_clock BIGINT NOT NULL DEFAULT 0,
  reconciled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id),
  CONSTRAINT board_membership_projection_state_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE documents
  ADD KEY idx_documents_workspace_updated_clock (workspace_id, updated_clock, id);
