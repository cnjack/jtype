CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  site_title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  CONSTRAINT sessions_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  root_hint VARCHAR(1024) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY workspaces_user_name_unique (user_id, name),
  CONSTRAINT workspaces_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  relative_path VARCHAR(512) NOT NULL,
  title VARCHAR(512) NOT NULL,
  status ENUM('draft', 'ready', 'published', 'archived') NOT NULL DEFAULT 'draft',
  content_hash CHAR(64) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY documents_workspace_path_unique (workspace_id, relative_path),
  CONSTRAINT documents_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publish_targets (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  target_type ENUM('static_export', 'rustfs', 'github_pages', 'cloud') NOT NULL,
  config_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT publish_targets_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publish_revisions (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  target_id CHAR(36) NULL,
  object_prefix VARCHAR(1024) NOT NULL,
  page_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT publish_revisions_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE,
  CONSTRAINT publish_revisions_target_id_fk
    FOREIGN KEY (target_id) REFERENCES publish_targets(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_chunks (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  heading_path JSON NOT NULL,
  start_line INT NOT NULL,
  end_line INT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  text MEDIUMTEXT NOT NULL,
  embedding_object_key VARCHAR(1024) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ai_chunks_document_id_fk
    FOREIGN KEY (document_id) REFERENCES documents(id)
    ON DELETE CASCADE
);
