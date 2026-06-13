-- Roll back Kanban module: drop in reverse FK order.

DROP TABLE IF EXISTS kanban_card_trash;
DROP TABLE IF EXISTS kanban_card_labels;
DROP TABLE IF EXISTS kanban_cards;
DROP TABLE IF EXISTS kanban_labels;
DROP TABLE IF EXISTS kanban_columns;
DROP TABLE IF EXISTS kanban_boards;
