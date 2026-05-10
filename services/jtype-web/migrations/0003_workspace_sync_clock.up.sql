ALTER TABLE `workspaces`
  ADD COLUMN `sync_clock` bigint NOT NULL DEFAULT '0' AFTER `storage_budget_bytes`;

UPDATE `workspaces` w
LEFT JOIN (
  SELECT workspace_id, MAX(clock_value) AS max_clock
  FROM (
    SELECT workspace_id, MAX(updated_clock) AS clock_value FROM documents GROUP BY workspace_id
    UNION ALL
    SELECT workspace_id, MAX(deleted_clock) AS clock_value FROM document_trash GROUP BY workspace_id
    UNION ALL
    SELECT workspace_id, MAX(updated_clock) AS clock_value FROM workspace_folders GROUP BY workspace_id
    UNION ALL
    SELECT workspace_id, MAX(deleted_clock) AS clock_value FROM workspace_folder_deletions GROUP BY workspace_id
    UNION ALL
    SELECT workspace_id, MAX(event_clock) AS clock_value FROM trash_events GROUP BY workspace_id
  ) clocks
  GROUP BY workspace_id
) existing_clocks ON existing_clocks.workspace_id = w.id
SET w.sync_clock = GREATEST(w.sync_clock, COALESCE(existing_clocks.max_clock, 0)),
    w.updated_at = w.updated_at;
