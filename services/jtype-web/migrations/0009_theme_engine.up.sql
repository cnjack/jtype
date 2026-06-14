-- Migration 0009: custom theme support for the theme engine.
-- Stores a per-site custom ThemeSpec (design tokens + layout + custom CSS) as
-- JSON. Only consulted when `sites.theme = 'custom'`.
ALTER TABLE `sites` ADD COLUMN `custom_theme` JSON DEFAULT NULL;
