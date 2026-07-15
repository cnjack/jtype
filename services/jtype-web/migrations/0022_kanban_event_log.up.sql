-- Durable, board-scoped event log for resumable Kanban consumers. The sequence
-- is the document's workspace-monotonic updated_clock, so callers can persist
-- one cursor and request events strictly after it without a second allocator.
CREATE TABLE kanban_events (
  workspace_id CHAR(36) NOT NULL,
  sequence BIGINT NOT NULL,
  board_ref VARCHAR(255) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (workspace_id, sequence),
  KEY idx_kanban_events_board_sequence (workspace_id, board_ref, sequence),
  CONSTRAINT kanban_events_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
