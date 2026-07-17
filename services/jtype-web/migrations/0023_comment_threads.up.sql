-- Comment threads (one-level replies), resolve state, and emoji reactions.
-- parent_id: a reply points at its ROOT comment (the API flattens deeper
-- nesting to one level). resolved_at/resolved_by mark a whole thread resolved.
--
-- One schema change per ALTER statement: some MySQL-compatible engines (TiDB)
-- resolve KEY/CONSTRAINT clauses against the pre-alter schema, so a single
-- ALTER that adds a column and an index/foreign key on it fails with error
-- 1072 ("column does not exist: parent_id").
ALTER TABLE card_comments ADD COLUMN parent_id CHAR(36) NULL;
ALTER TABLE card_comments ADD COLUMN resolved_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE card_comments ADD COLUMN resolved_by CHAR(36) NULL;
ALTER TABLE card_comments ADD KEY idx_card_comments_parent (parent_id);
ALTER TABLE card_comments ADD CONSTRAINT card_comments_parent_fk FOREIGN KEY (parent_id) REFERENCES card_comments(id) ON DELETE CASCADE;

CREATE TABLE comment_reactions (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  comment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  emoji VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_comment_reaction (comment_id, user_id, emoji),
  CONSTRAINT comment_reactions_ws_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT comment_reactions_comment_fk FOREIGN KEY (comment_id) REFERENCES card_comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_reactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
