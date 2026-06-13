-- Kanban module: boards, columns, cards, labels, card↔label join, archive trash.
-- Cloud-only storage. No local files. No Tauri commands.
-- Lifecycle:
--   - card: soft delete via kanban_card_trash, 30-day retention, auto-purge by tokio cron
--   - column: hard delete not allowed (cascades from board only)
--   - board: hard delete cascades to all columns, cards, labels, card_labels, AND archived card_trash rows

CREATE TABLE kanban_boards (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_by_user_id CHAR(36) NOT NULL,
  updated_clock BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_board_per_workspace (workspace_id, name),
  KEY idx_boards_workspace_position (workspace_id, position),
  CONSTRAINT kanban_boards_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT kanban_boards_created_by_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kanban_columns (
  id CHAR(36) NOT NULL,
  board_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  wip_limit INT NULL,
  color CHAR(7) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_column_per_board (board_id, name),
  KEY idx_columns_board_position (board_id, position),
  CONSTRAINT kanban_columns_board_fk FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kanban_labels (
  id CHAR(36) NOT NULL,
  board_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  color CHAR(7) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_label_per_board (board_id, name),
  KEY idx_labels_board (board_id),
  CONSTRAINT kanban_labels_board_fk FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kanban_cards (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  board_id CHAR(36) NOT NULL,
  column_id CHAR(36) NOT NULL,
  title VARCHAR(512) NOT NULL,
  description MEDIUMTEXT,
  position INT NOT NULL DEFAULT 0,
  priority ENUM('none','low','medium','high','urgent') NOT NULL DEFAULT 'none',
  due_at TIMESTAMP NULL,
  assignee_user_id CHAR(36) NULL,
  properties_extra JSON NULL,
  created_by_user_id CHAR(36) NOT NULL,
  updated_clock BIGINT NOT NULL DEFAULT 0,
  version_id CHAR(36) NOT NULL,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cards_column_position (column_id, position),
  KEY idx_cards_board (board_id),
  KEY idx_cards_workspace (workspace_id),
  KEY idx_cards_assignee (assignee_user_id),
  KEY idx_cards_archived (board_id, archived_at),
  CONSTRAINT kanban_cards_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT kanban_cards_board_fk FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
  CONSTRAINT kanban_cards_column_fk FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
  CONSTRAINT kanban_cards_assignee_fk FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT kanban_cards_created_by_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kanban_card_labels (
  card_id CHAR(36) NOT NULL,
  label_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, label_id),
  KEY idx_card_labels_label (label_id),
  CONSTRAINT kanban_card_labels_card_fk FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
  CONSTRAINT kanban_card_labels_label_fk FOREIGN KEY (label_id) REFERENCES kanban_labels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kanban_card_trash (
  id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  card_id CHAR(36) NOT NULL,
  board_id CHAR(36) NOT NULL,
  column_id CHAR(36) NOT NULL,
  title VARCHAR(512) NOT NULL,
  description MEDIUMTEXT,
  priority ENUM('none','low','medium','high','urgent') NOT NULL DEFAULT 'none',
  position INT NOT NULL DEFAULT 0,
  due_at TIMESTAMP NULL,
  assignee_user_id CHAR(36) NULL,
  properties_extra JSON NULL,
  label_ids JSON NOT NULL,
  created_by_user_id CHAR(36) NOT NULL,
  archived_by_user_id CHAR(36) NOT NULL,
  archived_by_device_id VARCHAR(128) NULL,
  source_device_id VARCHAR(128) NULL,
  source_user_id CHAR(36) NULL,
  archived_clock BIGINT NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  restored_at TIMESTAMP NULL,
  restored_by_user_id CHAR(36) NULL,
  restored_by_device_id VARCHAR(128) NULL,
  restored_clock BIGINT NULL,
  PRIMARY KEY (id),
  KEY idx_card_trash_workspace (workspace_id),
  KEY idx_card_trash_expires (expires_at),
  KEY idx_card_trash_restored (workspace_id, restored_at, restored_clock),
  CONSTRAINT kanban_card_trash_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
