CREATE TABLE IF NOT EXISTS mobile_push_registrations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  platform VARCHAR(16) NOT NULL,
  provider VARCHAR(16) NOT NULL,
  environment VARCHAR(16) NOT NULL,
  identifier_kind VARCHAR(24) NOT NULL,
  identifier_hash CHAR(64) NOT NULL,
  provider_identifier TEXT NOT NULL,
  app_version VARCHAR(64) NULL,
  locale VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mobile_push_user_device_platform (user_id, device_id, platform),
  UNIQUE KEY uq_mobile_push_identifier_hash (identifier_hash),
  KEY idx_mobile_push_user (user_id),
  CONSTRAINT fk_mobile_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
