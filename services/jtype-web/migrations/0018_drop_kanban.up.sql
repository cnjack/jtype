-- Retire the cloud DB-backed Kanban subsystem (unification v2).
-- The board is now the document-backed `.board` + `.md` model synced via the
-- documents table; the standalone kanban_* tables are redundant and removed.
-- Comments / webhooks / ticket numbers will be rebuilt fresh on the document
-- model (keyed by documents.id) in later migrations.
-- Drop in child-to-parent FK order.

DROP TABLE IF EXISTS kanban_webhook_deliveries;
DROP TABLE IF EXISTS kanban_webhooks;
DROP TABLE IF EXISTS kanban_card_comments;
DROP TABLE IF EXISTS kanban_card_trash;
DROP TABLE IF EXISTS kanban_card_labels;
DROP TABLE IF EXISTS kanban_cards;
DROP TABLE IF EXISTS kanban_labels;
DROP TABLE IF EXISTS kanban_columns;
DROP TABLE IF EXISTS kanban_boards;
