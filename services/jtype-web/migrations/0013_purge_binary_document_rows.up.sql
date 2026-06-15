-- Purge rows wrongly stored as TEXT documents. Binary files (PDF/images) belong
-- in `document_blobs`, not `documents`. An old upload bug inserted them here,
-- where the web tree shows them but the desktop correctly drops them on apply.
-- Their `content` is unusable binary garbage, so this is a hard delete;
-- `document_versions` and `sync_conflicts` cascade via ON DELETE CASCADE.
-- Idempotent: re-running matches no rows. The current push/save gates
-- (collect_sync_documents / normalize_relative_markdown_path) prevent recurrence;
-- binary documents now sync via the blob channel.
DELETE FROM `documents` WHERE
  LOWER(`relative_path`) LIKE '%.pdf'
  OR LOWER(`relative_path`) LIKE '%.png'
  OR LOWER(`relative_path`) LIKE '%.jpg'
  OR LOWER(`relative_path`) LIKE '%.jpeg'
  OR LOWER(`relative_path`) LIKE '%.gif'
  OR LOWER(`relative_path`) LIKE '%.webp'
  OR LOWER(`relative_path`) LIKE '%.avif'
  OR LOWER(`relative_path`) LIKE '%.bmp'
  OR LOWER(`relative_path`) LIKE '%.ico'
  OR LOWER(`relative_path`) LIKE '%.svg';
