ALTER TABLE workspaces ADD COLUMN publish_title VARCHAR(255) NULL AFTER slug;
UPDATE workspaces SET publish_title = name WHERE publish_title IS NULL;
ALTER TABLE custom_domains ADD COLUMN workspace_id CHAR(36) NULL AFTER user_id;
ALTER TABLE custom_domains ADD CONSTRAINT custom_domains_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
