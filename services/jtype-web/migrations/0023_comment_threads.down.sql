DROP TABLE IF EXISTS comment_reactions;

ALTER TABLE card_comments
  DROP FOREIGN KEY card_comments_parent_fk,
  DROP KEY idx_card_comments_parent,
  DROP COLUMN parent_id,
  DROP COLUMN resolved_at,
  DROP COLUMN resolved_by;
