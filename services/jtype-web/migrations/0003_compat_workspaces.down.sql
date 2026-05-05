ALTER TABLE workspaces DROP COLUMN IF EXISTS storage_budget_bytes;
ALTER TABLE workspaces DROP COLUMN IF EXISTS slug;
ALTER TABLE workspaces DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE workspaces DROP COLUMN IF EXISTS user_id;
