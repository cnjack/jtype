-- Token scoping + label for revocable, expiring MCP / agent tokens.
-- Existing login sessions keep scope full, MCP tokens get scope mcp.
ALTER TABLE `sessions` ADD COLUMN `scope` varchar(32) NOT NULL DEFAULT 'full';
ALTER TABLE `sessions` ADD COLUMN `label` varchar(120) NULL DEFAULT NULL;

-- OAuth 2.1 Dynamic Client Registration (RFC 7591). Public clients (PKCE), no secret.
CREATE TABLE IF NOT EXISTS `oauth_clients` (
  `client_id` char(36) NOT NULL,
  `client_name` varchar(255) NOT NULL,
  `redirect_uris` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Authorization codes for the authorization_code + PKCE grant.
CREATE TABLE IF NOT EXISTS `oauth_auth_codes` (
  `code_hash` char(64) NOT NULL,
  `client_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `redirect_uri` varchar(2048) NOT NULL,
  `code_challenge` varchar(128) NOT NULL,
  `code_challenge_method` varchar(8) NOT NULL DEFAULT 'S256',
  `scope` varchar(64) NOT NULL DEFAULT 'mcp',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`code_hash`),
  KEY `oauth_auth_codes_user_fk` (`user_id`),
  CONSTRAINT `oauth_auth_codes_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
