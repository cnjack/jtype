UPDATE document_versions SET source = 'desktop' WHERE source = 'mobile';

ALTER TABLE document_versions
  MODIFY COLUMN source ENUM('desktop', 'web', 'system') NOT NULL;
