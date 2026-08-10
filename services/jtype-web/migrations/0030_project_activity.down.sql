-- Map MCP provenance to the legacy web value before narrowing the enum, or
-- MySQL would coerce it to the empty enum value in permissive SQL modes.
UPDATE document_versions SET source = 'web' WHERE source = 'mcp';
ALTER TABLE document_versions MODIFY COLUMN source ENUM('desktop','web','system') NOT NULL;

DROP TABLE IF EXISTS board_document_memberships;
ALTER TABLE kanban_events DROP INDEX idx_kanban_events_document_sequence;
ALTER TABLE kanban_events DROP COLUMN changes;
ALTER TABLE kanban_events DROP COLUMN actor;
ALTER TABLE kanban_events DROP COLUMN document_id;
ALTER TABLE kanban_events DROP INDEX uq_kanban_events_workspace_id;
ALTER TABLE kanban_events DROP COLUMN id;
