DELETE FROM sync_push_requests WHERE response_json IS NULL;

ALTER TABLE sync_push_requests
  MODIFY COLUMN response_json longtext NOT NULL;
