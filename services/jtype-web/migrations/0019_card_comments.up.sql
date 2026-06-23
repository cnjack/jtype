-- Card comments rebuilt on the document model (unification v2). A comment hangs
-- off the card's vault DOCUMENT (documents.id), not the retired kanban_cards row.
CREATE TABLE card_comments (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  author_user_id CHAR(36) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_card_comments_doc (document_id, created_at),
  CONSTRAINT card_comments_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT card_comments_doc_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT card_comments_author_fk FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
