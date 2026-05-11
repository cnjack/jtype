-- Promote the first active admin to owner for any workspace missing an active owner.
-- This repairs historical data where a workspace could be left with admins but no owner.

UPDATE workspace_members wm
JOIN (
  SELECT workspace_id, user_id
  FROM (
    SELECT
      wm.workspace_id,
      wm.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY wm.workspace_id
        ORDER BY
          CASE WHEN wm.user_id = w.owner_user_id THEN 0 ELSE 1 END,
          wm.joined_at,
          wm.created_at,
          wm.user_id
      ) AS rn
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.status = 'active'
      AND wm.role = 'admin'
      AND NOT EXISTS (
        SELECT 1
        FROM workspace_members owner_member
        WHERE owner_member.workspace_id = wm.workspace_id
          AND owner_member.status = 'active'
          AND owner_member.role = 'owner'
      )
  ) ranked_admins
  WHERE rn = 1
) promoted ON promoted.workspace_id = wm.workspace_id AND promoted.user_id = wm.user_id
SET wm.role = 'owner';

UPDATE workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
SET w.owner_user_id = wm.user_id
WHERE wm.status = 'active'
  AND wm.role = 'owner'
  AND (w.owner_user_id IS NULL OR w.owner_user_id <> wm.user_id);
