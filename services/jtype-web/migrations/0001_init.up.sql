CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  site_title VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
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

CREATE TABLE IF NOT EXISTS oauth_device_codes (
  device_code_hash CHAR(64) PRIMARY KEY,
  user_code VARCHAR(16) NOT NULL UNIQUE,
  user_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  consumed_at TIMESTAMP NULL,
  CONSTRAINT oauth_device_codes_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  root_hint VARCHAR(1024) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner', 'admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
  status ENUM('active', 'invited', 'removed') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_members_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE,
  CONSTRAINT workspace_members_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  invited_by_user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NULL,
  role ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'editor',
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NULL,
  accepted_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workspace_invites_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE,
  CONSTRAINT workspace_invites_invited_by_fk
    FOREIGN KEY (invited_by_user_id) REFERENCES users(id)
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
  updated_clock BIGINT NOT NULL DEFAULT 0,
  current_version_id CHAR(36) NULL,
  UNIQUE KEY documents_workspace_path_unique (workspace_id, relative_path),
  CONSTRAINT documents_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_versions (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  parent_version_id CHAR(36) NULL,
  base_version_id CHAR(36) NULL,
  author_user_id CHAR(36) NOT NULL,
  author_device_id VARCHAR(128) NULL,
  source ENUM('desktop', 'web', 'system') NOT NULL,
  content_hash CHAR(64) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT document_versions_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE,
  CONSTRAINT document_versions_document_id_fk
    FOREIGN KEY (document_id) REFERENCES documents(id)
    ON DELETE CASCADE,
  CONSTRAINT document_versions_author_user_id_fk
    FOREIGN KEY (author_user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_sync_cursors (
  workspace_id CHAR(36) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  last_seen_clock BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, device_id),
  CONSTRAINT workspace_sync_cursors_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  relative_path VARCHAR(512) NOT NULL,
  base_content MEDIUMTEXT NULL,
  local_content MEDIUMTEXT NOT NULL,
  cloud_content MEDIUMTEXT NOT NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  resolution ENUM('accept_local', 'accept_cloud', 'keep_both', 'manual_merge') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  CONSTRAINT sync_conflicts_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE,
  CONSTRAINT sync_conflicts_document_id_fk
    FOREIGN KEY (document_id) REFERENCES documents(id)
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

CREATE TABLE IF NOT EXISTS custom_domains (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  verification_token VARCHAR(128) NOT NULL,
  status ENUM('pending', 'verified', 'failed') NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT custom_domains_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ssl_certificates (
  id CHAR(36) PRIMARY KEY,
  domain_id CHAR(36) NOT NULL,
  cert_chain_pem MEDIUMTEXT NOT NULL,
  private_key_hash CHAR(64) NOT NULL,
  issuer VARCHAR(512) NULL,
  not_before TIMESTAMP NULL,
  not_after TIMESTAMP NULL,
  status ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ssl_certificates_domain_id_fk
    FOREIGN KEY (domain_id) REFERENCES custom_domains(id)
    ON DELETE CASCADE
);
