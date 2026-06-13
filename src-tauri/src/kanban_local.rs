//! Local-first Kanban store for the desktop app.
//!
//! Mirrors the cloud Kanban module (`services/jtype-web`) but persists entirely
//! on disk under the vault root (`.jtype/kanban.json`), so boards/columns/cards
//! work fully **offline**. Every mutation is also appended to a pending-ops
//! queue; the sync layer (ws_client / cloud sync) drains it to the cloud when
//! online, and applies remote board snapshots back via [`merge_remote_board`]
//! for multi-device convergence.
//!
//! Design invariants kept identical to the cloud handlers so local and cloud
//! behave the same:
//!   - creating a board seeds three default columns ("To do" / "Doing" / "Done")
//!   - moving/archiving a card compacts the source column to a 0..n gap-free range
//!   - restoring a card appends it to the end of its column
//!
//! IDs are supplied by the caller (the frontend generates UUIDs and reuses the
//! same id locally and when the op is replayed to the cloud), so this module has
//! no uuid dependency.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub const DEFAULT_COLUMNS: [&str; 3] = ["To do", "Doing", "Done"];

// ── Data model (camelCase to match the cloud JSON contract) ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalColumn {
    pub id: String,
    pub name: String,
    pub position: i32,
    #[serde(default)]
    pub wip_limit: Option<i32>,
    #[serde(default)]
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCard {
    pub id: String,
    pub column_id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    pub position: i32,
    #[serde(default = "priority_none")]
    pub priority: String,
    #[serde(default)]
    pub due_at: Option<String>,
    #[serde(default)]
    pub assignee_user_id: Option<String>,
    #[serde(default)]
    pub label_ids: Vec<String>,
    #[serde(default)]
    pub archived_at: Option<String>,
    pub updated_clock: i64,
}

fn priority_none() -> String {
    "none".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalLabel {
    pub id: String,
    pub name: String,
    pub color: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBoard {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub position: i32,
    pub updated_clock: i64,
    #[serde(default)]
    pub columns: Vec<LocalColumn>,
    #[serde(default)]
    pub cards: Vec<LocalCard>,
    #[serde(default)]
    pub labels: Vec<LocalLabel>,
}

/// A queued mutation to replay against the cloud when next online.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingKanbanOp {
    #[serde(rename = "type")]
    pub op_type: String,
    pub board_id: String,
    #[serde(default)]
    pub card_id: Option<String>,
    /// Op-specific body the sync layer turns into a REST request.
    #[serde(default)]
    pub payload: serde_json::Value,
    pub local_clock: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LocalKanbanStore {
    #[serde(default)]
    pub boards: Vec<LocalBoard>,
    /// Highest cloud clock merged in (so a pull knows where to resume).
    #[serde(default)]
    pub last_synced_clock: i64,
    /// Monotonic local clock, stamped onto local edits before they sync.
    #[serde(default)]
    pub local_clock: i64,
    #[serde(default)]
    pub pending_ops: Vec<PendingKanbanOp>,
}

// ── Persistence (mirrors workspace::{load,save}_trash_metadata) ──

fn kanban_store_path(root: &Path) -> PathBuf {
    root.join(".jtype").join("kanban.json")
}

pub fn load_kanban_store(root: &Path) -> Result<LocalKanbanStore, String> {
    let path = kanban_store_path(root);
    if !path.exists() {
        return Ok(LocalKanbanStore::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_kanban_store(root: &Path, store: &LocalKanbanStore) -> Result<(), String> {
    let path = kanban_store_path(root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

// ── In-memory operations (pure; unit-tested directly) ──

impl LocalKanbanStore {
    fn next_clock(&mut self) -> i64 {
        self.local_clock += 1;
        self.local_clock
    }

    fn board_mut(&mut self, board_id: &str) -> Result<&mut LocalBoard, String> {
        self.boards
            .iter_mut()
            .find(|b| b.id == board_id)
            .ok_or_else(|| format!("board {board_id} not found"))
    }

    pub fn get_board(&self, board_id: &str) -> Option<&LocalBoard> {
        self.boards.iter().find(|b| b.id == board_id)
    }

    fn enqueue(&mut self, op_type: &str, board_id: &str, card_id: Option<String>, payload: serde_json::Value) {
        let local_clock = self.local_clock;
        self.pending_ops.push(PendingKanbanOp {
            op_type: op_type.to_string(),
            board_id: board_id.to_string(),
            card_id,
            payload,
            local_clock,
        });
    }

    /// Create a board (with the caller-provided id + the three seeded columns,
    /// whose ids the caller also supplies). Returns an error on duplicate name,
    /// matching the cloud's unique-name-per-workspace constraint.
    pub fn create_board(
        &mut self,
        id: &str,
        name: &str,
        description: Option<String>,
        column_ids: [&str; 3],
    ) -> Result<LocalBoard, String> {
        let name = name.trim();
        if name.is_empty() {
            return Err("board name cannot be empty".into());
        }
        if self.boards.iter().any(|b| b.name == name) {
            return Err(format!("board name '{name}' already exists"));
        }
        let clock = self.next_clock();
        let position = self.boards.iter().map(|b| b.position).max().unwrap_or(-1) + 1;
        let columns = DEFAULT_COLUMNS
            .iter()
            .enumerate()
            .map(|(i, n)| LocalColumn {
                id: column_ids[i].to_string(),
                name: n.to_string(),
                position: i as i32,
                wip_limit: None,
                color: None,
            })
            .collect();
        let board = LocalBoard {
            id: id.to_string(),
            name: name.to_string(),
            description,
            position,
            updated_clock: clock,
            columns,
            cards: Vec::new(),
            labels: Vec::new(),
        };
        self.boards.push(board.clone());
        self.enqueue(
            "createBoard",
            id,
            None,
            serde_json::json!({ "name": name, "description": board.description }),
        );
        Ok(board)
    }

    pub fn delete_board(&mut self, board_id: &str) -> Result<(), String> {
        let before = self.boards.len();
        self.boards.retain(|b| b.id != board_id);
        if self.boards.len() == before {
            return Err(format!("board {board_id} not found"));
        }
        self.pending_ops.retain(|op| op.board_id != board_id);
        let clock = self.next_clock();
        self.enqueue("deleteBoard", board_id, None, serde_json::json!({ "clock": clock }));
        Ok(())
    }

    /// Create a card at the end of its column. `id` is caller-provided.
    pub fn create_card(
        &mut self,
        board_id: &str,
        column_id: &str,
        id: &str,
        title: &str,
        description: Option<String>,
        priority: &str,
        label_ids: Vec<String>,
    ) -> Result<LocalCard, String> {
        let title = title.trim();
        if title.is_empty() {
            return Err("card title cannot be empty".into());
        }
        let clock = self.next_clock();
        let board = self.board_mut(board_id)?;
        if !board.columns.iter().any(|c| c.id == column_id) {
            return Err(format!("column {column_id} not found on board {board_id}"));
        }
        let position = board
            .cards
            .iter()
            .filter(|c| c.column_id == column_id && c.archived_at.is_none())
            .map(|c| c.position)
            .max()
            .unwrap_or(-1)
            + 1;
        let card = LocalCard {
            id: id.to_string(),
            column_id: column_id.to_string(),
            title: title.to_string(),
            description,
            position,
            priority: priority.to_string(),
            due_at: None,
            assignee_user_id: None,
            label_ids,
            archived_at: None,
            updated_clock: clock,
        };
        board.cards.push(card.clone());
        self.enqueue(
            "createCard",
            board_id,
            Some(id.to_string()),
            serde_json::json!({
                "columnId": column_id,
                "title": title,
                "priority": priority,
            }),
        );
        Ok(card)
    }

    /// Move/reorder a card within or across columns, keeping positions compact
    /// (identical semantics to the cloud `move_card`).
    pub fn move_card(
        &mut self,
        board_id: &str,
        card_id: &str,
        target_column_id: &str,
        target_position: i32,
    ) -> Result<(), String> {
        let clock = self.next_clock();
        let board = self.board_mut(board_id)?;
        if !board.columns.iter().any(|c| c.id == target_column_id) {
            return Err(format!("column {target_column_id} not found"));
        }
        let source_column_id = board
            .cards
            .iter()
            .find(|c| c.id == card_id)
            .map(|c| c.column_id.clone())
            .ok_or_else(|| format!("card {card_id} not found"))?;
        if board
            .cards
            .iter()
            .find(|c| c.id == card_id)
            .map(|c| c.archived_at.is_some())
            .unwrap_or(false)
        {
            return Err("cannot move archived card; restore first".into());
        }

        // Active card ids in the target column, in order, excluding the mover.
        let mut target: Vec<String> = board
            .cards
            .iter()
            .filter(|c| c.column_id == target_column_id && c.archived_at.is_none() && c.id != card_id)
            .map(|c| (c.position, c.id.clone()))
            .collect::<std::collections::BTreeMap<_, _>>()
            .into_values()
            .collect();
        let idx = (target_position.max(0) as usize).min(target.len());
        target.insert(idx, card_id.to_string());

        // Re-point the mover and renumber the target column.
        for (pos, id) in target.iter().enumerate() {
            if let Some(c) = board.cards.iter_mut().find(|c| &c.id == id) {
                c.position = pos as i32;
                c.column_id = target_column_id.to_string();
            }
        }
        // Compact the source column if it differs.
        if source_column_id != target_column_id {
            compact_column(board, &source_column_id);
        }
        if let Some(c) = board.cards.iter_mut().find(|c| c.id == card_id) {
            c.updated_clock = clock;
        }
        self.enqueue(
            "moveCard",
            board_id,
            Some(card_id.to_string()),
            serde_json::json!({ "targetColumnId": target_column_id, "targetPosition": target_position }),
        );
        Ok(())
    }

    /// Archive (soft-delete) a card, compacting the source column.
    pub fn archive_card(&mut self, board_id: &str, card_id: &str, archived_at: &str) -> Result<(), String> {
        let clock = self.next_clock();
        let board = self.board_mut(board_id)?;
        let column_id = {
            let card = board
                .cards
                .iter_mut()
                .find(|c| c.id == card_id)
                .ok_or_else(|| format!("card {card_id} not found"))?;
            if card.archived_at.is_some() {
                return Err("card already archived".into());
            }
            card.archived_at = Some(archived_at.to_string());
            card.updated_clock = clock;
            card.column_id.clone()
        };
        compact_column(board, &column_id);
        self.enqueue("archiveCard", board_id, Some(card_id.to_string()), serde_json::json!({}));
        Ok(())
    }

    /// Restore an archived card, appending it to the end of its column.
    pub fn restore_card(&mut self, board_id: &str, card_id: &str) -> Result<(), String> {
        let clock = self.next_clock();
        let board = self.board_mut(board_id)?;
        let column_id = board
            .cards
            .iter()
            .find(|c| c.id == card_id)
            .map(|c| c.column_id.clone())
            .ok_or_else(|| format!("card {card_id} not found"))?;
        let is_archived = board
            .cards
            .iter()
            .find(|c| c.id == card_id)
            .map(|c| c.archived_at.is_some())
            .unwrap_or(false);
        if !is_archived {
            return Err("card is not archived".into());
        }
        let end = board
            .cards
            .iter()
            .filter(|c| c.column_id == column_id && c.archived_at.is_none())
            .map(|c| c.position)
            .max()
            .unwrap_or(-1)
            + 1;
        if let Some(card) = board.cards.iter_mut().find(|c| c.id == card_id) {
            card.archived_at = None;
            card.position = end;
            card.updated_clock = clock;
        }
        self.enqueue("restoreCard", board_id, Some(card_id.to_string()), serde_json::json!({}));
        Ok(())
    }

    /// Active (non-archived) cards in a column, ordered by position.
    pub fn column_cards(&self, board_id: &str, column_id: &str) -> Vec<&LocalCard> {
        let mut v: Vec<&LocalCard> = self
            .get_board(board_id)
            .map(|b| {
                b.cards
                    .iter()
                    .filter(|c| c.column_id == column_id && c.archived_at.is_none())
                    .collect()
            })
            .unwrap_or_default();
        v.sort_by_key(|c| c.position);
        v
    }

    /// Drain queued ops for the sync layer to replay against the cloud.
    pub fn take_pending_ops(&mut self) -> Vec<PendingKanbanOp> {
        std::mem::take(&mut self.pending_ops)
    }

    /// Apply a board snapshot received from the cloud. Last-writer-wins by
    /// `updated_clock`: the remote board replaces the local copy only if it is
    /// newer (or the board is new locally). Advances `last_synced_clock`. This
    /// is the multi-device convergence hook — a peer's change, pulled or pushed
    /// via WebSocket, lands here.
    pub fn merge_remote_board(&mut self, remote: LocalBoard, cloud_clock: i64) {
        if cloud_clock > self.last_synced_clock {
            self.last_synced_clock = cloud_clock;
        }
        match self.boards.iter_mut().find(|b| b.id == remote.id) {
            Some(local) if local.updated_clock >= remote.updated_clock => {
                // Local is newer or equal — keep local (it still has pending ops).
            }
            Some(local) => {
                *local = remote;
            }
            None => self.boards.push(remote),
        }
    }
}

/// Renumber a column's active cards to a gap-free 0..n range, preserving order.
fn compact_column(board: &mut LocalBoard, column_id: &str) {
    let mut ordered: Vec<(i32, String)> = board
        .cards
        .iter()
        .filter(|c| c.column_id == column_id && c.archived_at.is_none())
        .map(|c| (c.position, c.id.clone()))
        .collect();
    ordered.sort_by_key(|(p, _)| *p);
    for (new_pos, (_, id)) in ordered.into_iter().enumerate() {
        if let Some(c) = board.cards.iter_mut().find(|c| c.id == id) {
            c.position = new_pos as i32;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn store_with_board() -> (LocalKanbanStore, String, Vec<String>) {
        let mut store = LocalKanbanStore::default();
        let cols = ["col-todo", "col-doing", "col-done"];
        let board = store
            .create_board("b1", "Sprint", None, cols)
            .unwrap();
        let col_ids = board.columns.iter().map(|c| c.id.clone()).collect();
        (store, "b1".to_string(), col_ids)
    }

    #[test]
    fn persists_and_reloads_from_disk() {
        let dir = tempdir().unwrap();
        let (store, _b, _c) = store_with_board();
        save_kanban_store(dir.path(), &store).unwrap();
        assert!(dir.path().join(".jtype").join("kanban.json").exists());

        let reloaded = load_kanban_store(dir.path()).unwrap();
        assert_eq!(reloaded.boards.len(), 1);
        assert_eq!(reloaded.boards[0].columns.len(), 3);
    }

    #[test]
    fn load_missing_store_is_empty() {
        let dir = tempdir().unwrap();
        let store = load_kanban_store(dir.path()).unwrap();
        assert!(store.boards.is_empty());
        assert_eq!(store.last_synced_clock, 0);
    }

    #[test]
    fn create_board_seeds_three_default_columns() {
        let (_store, board_id, cols) = store_with_board();
        assert_eq!(board_id, "b1");
        assert_eq!(cols.len(), 3);
    }

    #[test]
    fn duplicate_board_name_is_rejected() {
        let (mut store, _b, _c) = store_with_board();
        let err = store
            .create_board("b2", "Sprint", None, ["x", "y", "z"])
            .unwrap_err();
        assert!(err.contains("already exists"), "{err}");
    }

    #[test]
    fn create_card_appends_and_enqueues_pending_op() {
        let (mut store, board_id, cols) = store_with_board();
        let pending_before = store.pending_ops.len();
        store
            .create_card(&board_id, &cols[0], "card-1", "task", None, "none", vec![])
            .unwrap();
        let order = store.column_cards(&board_id, &cols[0]);
        assert_eq!(order.len(), 1);
        assert_eq!(order[0].position, 0);
        // create_board + create_card each enqueue an op.
        assert_eq!(store.pending_ops.len(), pending_before + 1);
        assert_eq!(store.pending_ops.last().unwrap().op_type, "createCard");
    }

    #[test]
    fn archive_compacts_source_column() {
        let (mut store, board_id, cols) = store_with_board();
        for (i, t) in ["A", "B", "C"].iter().enumerate() {
            store
                .create_card(&board_id, &cols[0], &format!("c{i}"), t, None, "none", vec![])
                .unwrap();
        }
        store.archive_card(&board_id, "c1", "2026-06-13 00:00:00").unwrap();
        let order: Vec<String> = store
            .column_cards(&board_id, &cols[0])
            .iter()
            .map(|c| c.id.clone())
            .collect();
        assert_eq!(order, vec!["c0".to_string(), "c2".to_string()]);
        assert_eq!(store.column_cards(&board_id, &cols[0])[0].position, 0);
        assert_eq!(store.column_cards(&board_id, &cols[0])[1].position, 1);
    }

    #[test]
    fn restore_appends_to_end_of_column() {
        let (mut store, board_id, cols) = store_with_board();
        store.create_card(&board_id, &cols[0], "a", "A", None, "none", vec![]).unwrap();
        store.create_card(&board_id, &cols[0], "b", "B", None, "none", vec![]).unwrap();
        store.archive_card(&board_id, "a", "2026-06-13 00:00:00").unwrap();
        store.create_card(&board_id, &cols[0], "c", "C", None, "none", vec![]).unwrap();
        store.restore_card(&board_id, "a").unwrap();
        let order: Vec<String> = store
            .column_cards(&board_id, &cols[0])
            .iter()
            .map(|c| c.id.clone())
            .collect();
        assert_eq!(order, vec!["b".to_string(), "c".to_string(), "a".to_string()]);
    }

    #[test]
    fn move_card_across_columns_compacts_source() {
        let (mut store, board_id, cols) = store_with_board();
        for (i, t) in ["A", "B", "C"].iter().enumerate() {
            store
                .create_card(&board_id, &cols[0], &format!("c{i}"), t, None, "none", vec![])
                .unwrap();
        }
        // Move the middle card to the front of column 2.
        store.move_card(&board_id, "c1", &cols[1], 0).unwrap();

        let src: Vec<String> = store.column_cards(&board_id, &cols[0]).iter().map(|c| c.id.clone()).collect();
        let dst: Vec<String> = store.column_cards(&board_id, &cols[1]).iter().map(|c| c.id.clone()).collect();
        assert_eq!(src, vec!["c0".to_string(), "c2".to_string()], "source compacted");
        assert_eq!(dst, vec!["c1".to_string()], "moved card landed in target");
        // source positions are gap-free
        assert_eq!(store.column_cards(&board_id, &cols[0])[1].position, 1);
    }

    #[test]
    fn cannot_move_archived_card() {
        let (mut store, board_id, cols) = store_with_board();
        store.create_card(&board_id, &cols[0], "a", "A", None, "none", vec![]).unwrap();
        store.archive_card(&board_id, "a", "2026-06-13 00:00:00").unwrap();
        let err = store.move_card(&board_id, "a", &cols[1], 0).unwrap_err();
        assert!(err.contains("archived"), "{err}");
    }

    #[test]
    fn delete_board_drops_its_pending_ops() {
        let (mut store, board_id, cols) = store_with_board();
        store.create_card(&board_id, &cols[0], "a", "A", None, "none", vec![]).unwrap();
        assert!(store.pending_ops.iter().any(|o| o.board_id == board_id));
        store.delete_board(&board_id).unwrap();
        // create/createCard ops for this board are gone; only the deleteBoard op remains.
        assert!(store.pending_ops.iter().all(|o| o.op_type == "deleteBoard"));
        assert!(store.get_board(&board_id).is_none());
    }

    #[test]
    fn take_pending_ops_drains_queue() {
        let (mut store, _b, _c) = store_with_board();
        let ops = store.take_pending_ops();
        assert!(!ops.is_empty());
        assert!(store.pending_ops.is_empty());
    }

    // ── Multi-device convergence ──

    #[test]
    fn merge_remote_newer_board_replaces_local() {
        let (mut store, board_id, _cols) = store_with_board();
        let local_clock = store.get_board(&board_id).unwrap().updated_clock;
        // A peer renamed the board with a higher clock.
        let mut remote = store.get_board(&board_id).unwrap().clone();
        remote.name = "Renamed by peer".into();
        remote.updated_clock = local_clock + 10;

        store.merge_remote_board(remote, local_clock + 10);
        assert_eq!(store.get_board(&board_id).unwrap().name, "Renamed by peer");
        assert_eq!(store.last_synced_clock, local_clock + 10);
    }

    #[test]
    fn merge_remote_older_board_keeps_local() {
        let (mut store, board_id, _cols) = store_with_board();
        // Make a local edit so local clock is high.
        store.create_card(&board_id, &store.get_board(&board_id).unwrap().columns[0].id.clone(), "a", "A", None, "none", vec![]).unwrap();
        let local = store.get_board(&board_id).unwrap().clone();

        // A stale remote snapshot arrives.
        let mut remote = local.clone();
        remote.name = "Stale".into();
        remote.updated_clock = 1; // older

        store.merge_remote_board(remote, 1);
        assert_eq!(store.get_board(&board_id).unwrap().name, local.name, "newer local wins");
    }

    #[test]
    fn merge_remote_new_board_is_added() {
        let (mut store, _b, _c) = store_with_board();
        let remote = LocalBoard {
            id: "peer-board".into(),
            name: "From peer".into(),
            description: None,
            position: 5,
            updated_clock: 3,
            columns: vec![],
            cards: vec![],
            labels: vec![],
        };
        store.merge_remote_board(remote, 7);
        assert!(store.get_board("peer-board").is_some());
        assert_eq!(store.last_synced_clock, 7);
    }
}
