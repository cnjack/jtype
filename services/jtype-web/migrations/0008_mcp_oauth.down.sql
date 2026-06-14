DROP TABLE IF EXISTS `oauth_auth_codes`;
DROP TABLE IF EXISTS `oauth_clients`;
ALTER TABLE `sessions` DROP COLUMN `label`;
ALTER TABLE `sessions` DROP COLUMN `scope`;
