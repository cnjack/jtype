DROP TABLE IF EXISTS device_trash_cursors;
DROP TABLE IF EXISTS trash_events;
DROP INDEX idx_document_trash_restored ON document_trash;
ALTER TABLE document_trash
  DROP COLUMN IF EXISTS restored_clock,
  DROP COLUMN IF EXISTS restored_by_user_id,
  DROP COLUMN IF EXISTS restored_by_device_id,
  DROP COLUMN IF EXISTS source_device_id;
