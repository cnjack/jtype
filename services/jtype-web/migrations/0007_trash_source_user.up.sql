ALTER TABLE document_trash
  ADD COLUMN source_user_id CHAR(36) NULL AFTER source_device_id;
