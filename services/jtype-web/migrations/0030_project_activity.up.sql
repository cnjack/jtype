-- Extend the durable board event log into the Card Activity/audit source while
-- preserving the existing (workspace_id, sequence) cursor contract.
-- Existing rows receive a stable id once during migration; all new rows supply
-- their id explicitly from the service.
ALTER TABLE kanban_events ADD COLUMN id CHAR(36) NULL;
UPDATE kanban_events SET id = UUID() WHERE id IS NULL;
ALTER TABLE kanban_events MODIFY COLUMN id CHAR(36) NOT NULL;
ALTER TABLE kanban_events ADD UNIQUE KEY uq_kanban_events_workspace_id (workspace_id, id);

-- No foreign key on document_id: delete Activity must remain readable after
-- the Markdown document has moved to trash and the documents row is gone.
ALTER TABLE kanban_events ADD COLUMN document_id CHAR(36) NULL;
-- Pre-0030 card events carried the Markdown path but not a document id. Recover
-- the id while the document still exists so Activity retains that history.
UPDATE kanban_events e
JOIN documents d
  ON d.workspace_id = e.workspace_id
 AND d.relative_path = JSON_UNQUOTE(JSON_EXTRACT(e.payload, '$.card.path'))
SET e.document_id = d.id
WHERE e.document_id IS NULL;
ALTER TABLE kanban_events ADD COLUMN actor JSON NULL;
ALTER TABLE kanban_events ADD COLUMN changes JSON NULL;
ALTER TABLE kanban_events ADD KEY idx_kanban_events_document_sequence (workspace_id, document_id, sequence);

-- Materialized projection from Markdown Card frontmatter. `board_ref` uses a
-- binary collation because board identity is an exact, case-sensitive string;
-- folder paths deliberately do not participate in membership. Migration 0031
-- performs a rollout-safe backfill with jtype_core::parse_frontmatter after
-- installing its workspace-clock watermark, avoiding a SQL-only YAML parser.
CREATE TABLE board_document_memberships (
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  board_ref VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, document_id),
  KEY idx_board_document_memberships_board (workspace_id, board_ref, document_id),
  CONSTRAINT board_document_memberships_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT board_document_memberships_document_fk
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- MCP is a first-class accepted-write source. The actor still comes from the
-- authenticated session; this enum is provenance, never caller identity.
-- Historical handlers accepted arbitrary x-client-type strings; permissive
-- MySQL stored those as the enum index-0 empty value. Repair them before ALTER,
-- otherwise strict MySQL rejects the enum rewrite with error 1265.
UPDATE document_versions
SET source = 'web'
WHERE CAST(source AS CHAR) NOT IN ('desktop', 'web', 'mcp', 'system');
ALTER TABLE document_versions MODIFY COLUMN source ENUM('desktop','web','mcp','system') NOT NULL;
