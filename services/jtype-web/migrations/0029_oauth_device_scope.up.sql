-- Bind every device code to the flow and scope that created it. This prevents
-- an MCP device code from being exchanged through the desktop poll endpoint
-- for a full session, and carries verified client identity into consent.
ALTER TABLE `oauth_device_codes`
  ADD COLUMN `grant_kind` varchar(32) NOT NULL DEFAULT 'legacy';

ALTER TABLE `oauth_device_codes`
  ADD COLUMN `requested_scope` varchar(32) NOT NULL DEFAULT 'mcp';

ALTER TABLE `oauth_device_codes`
  ADD COLUMN `client_id` varchar(120) NULL DEFAULT NULL;

ALTER TABLE `oauth_device_codes`
  ADD COLUMN `client_name` varchar(255) NULL DEFAULT NULL;
