DROP TABLE IF EXISTS comment_reactions;

ALTER TABLE card_comments DROP FOREIGN KEY card_comments_parent_fk;
ALTER TABLE card_comments DROP KEY idx_card_comments_parent;
ALTER TABLE card_comments DROP COLUMN parent_id;
ALTER TABLE card_comments DROP COLUMN resolved_at;
ALTER TABLE card_comments DROP COLUMN resolved_by;
