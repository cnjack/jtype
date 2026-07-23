-- A board-settings MCP token is bound to one concrete board document.
-- `logical_board_id` is retained for URL/card-frontmatter matching, while
-- `board_document_id` is the immutable authority anchor.
ALTER TABLE documents
  ADD UNIQUE KEY uq_documents_id_workspace (id, workspace_id);

CREATE TABLE mcp_board_grants (
  token_hash CHAR(64) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  board_document_id CHAR(36) NOT NULL,
  logical_board_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_mcp_board_grants_workspace_board (workspace_id, board_document_id),
  KEY idx_mcp_board_grants_workspace_logical (workspace_id, logical_board_id),
  CONSTRAINT mcp_board_grants_session_fk FOREIGN KEY (token_hash) REFERENCES sessions(token_hash) ON DELETE CASCADE,
  CONSTRAINT mcp_board_grants_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT mcp_board_grants_document_fk
    FOREIGN KEY (board_document_id, workspace_id)
    REFERENCES documents(id, workspace_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
