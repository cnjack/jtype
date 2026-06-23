CREATE TABLE kanban_card_comments (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  card_id CHAR(36) NOT NULL,
  author_user_id CHAR(36) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_card (card_id, created_at),
  CONSTRAINT kanban_comments_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT kanban_comments_card_fk FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
  CONSTRAINT kanban_comments_author_fk FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
