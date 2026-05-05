ALTER TABLE custom_domains DROP FOREIGN KEY IF EXISTS custom_domains_workspace_id_fk;
ALTER TABLE custom_domains DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE workspaces DROP COLUMN IF EXISTS publish_title;
