-- Down: revert migration 0005
ALTER TABLE `custom_domains` DROP FOREIGN KEY `custom_domains_site_id_fk`;
ALTER TABLE `custom_domains` DROP COLUMN `site_id`;
DROP TABLE IF EXISTS `published_pages`;
DROP TABLE IF EXISTS `sites`;
ALTER TABLE `documents` ADD COLUMN `status` enum('draft','ready','published','archived') NOT NULL DEFAULT 'draft';
UPDATE `documents` SET `status` = 'published' WHERE `is_published` = 1;
ALTER TABLE `documents` DROP COLUMN `is_published`;
