ALTER TABLE document_versions
  MODIFY COLUMN source ENUM('desktop', 'mobile', 'web', 'system') NOT NULL;
