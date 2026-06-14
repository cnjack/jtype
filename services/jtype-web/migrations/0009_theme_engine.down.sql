-- Revert migration 0009.
ALTER TABLE `sites` DROP COLUMN `custom_theme`;
