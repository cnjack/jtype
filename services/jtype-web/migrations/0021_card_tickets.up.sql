-- Jira-style ticket links (unification v2 / ticket-links.md). The per-card number
-- is CLOUD-INDEX-ONLY (not in frontmatter): board_sequences is the sole allocator,
-- card_tickets the immutable index keyed by documents.id. ticket_key + number are
-- snapshotted so the id (e.g. OCCSV-3371) is stable through board-key renames.
CREATE TABLE board_sequences (
  workspace_id CHAR(36) NOT NULL,
  ticket_key VARCHAR(16) NOT NULL,
  last_number BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, ticket_key),
  CONSTRAINT board_sequences_ws_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE card_tickets (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  ticket_key VARCHAR(16) NOT NULL,
  number BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_card_tickets_doc (document_id),
  UNIQUE KEY uq_card_tickets_ref (workspace_id, ticket_key, number),
  CONSTRAINT card_tickets_ws_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT card_tickets_doc_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
