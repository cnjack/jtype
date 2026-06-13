//! Board CRUD handlers.
//!
//! Endpoints:
//!   GET    /api/v1/workspaces/:workspace_id/kanban/boards
//!   POST   /api/v1/workspaces/:workspace_id/kanban/boards
//!   GET    /api/v1/workspaces/:workspace_id/kanban/boards/:board_id
//!   PATCH  /api/v1/workspaces/:workspace_id/kanban/boards/:board_id
//!   POST   /api/v1/workspaces/:workspace_id/kanban/boards/reorder
//!   DELETE /api/v1/workspaces/:workspace_id/kanban/boards/:board_id
//!
//! Role gates:
//!   list / get    → viewer+
//!   create / patch / reorder → editor+
//!   delete        → admin+ (hard delete cascade incl. archived cards in trash)

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use super::{clamp_str, next_workspace_clock, validate_uuid};
use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_BOARD_NAME: usize = 255;
const DEFAULT_COLUMNS: [&str; 3] = ["To do", "Doing", "Done"];

pub async fn list_boards(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT b.id, b.workspace_id, b.name, b.description, b.position,
                  b.created_by_user_id, b.updated_clock,
                  CAST(b.created_at AS CHAR) AS created_at, CAST(b.updated_at AS CHAR) AS updated_at,
                  (SELECT COUNT(*) FROM kanban_cards c WHERE c.board_id = b.id AND c.archived_at IS NULL) AS card_count,
                  (SELECT COUNT(*) FROM kanban_columns col WHERE col.board_id = b.id) AS column_count
           FROM kanban_boards b
           WHERE b.workspace_id = ?
           ORDER BY b.position ASC, b.created_at ASC"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let boards: Vec<KanbanBoardSummary> = rows
        .into_iter()
        .map(|row| KanbanBoardSummary {
            id: row.try_get("id").unwrap_or_default(),
            workspace_id: row.try_get("workspace_id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            description: row.try_get("description").unwrap_or(None),
            position: row.try_get("position").unwrap_or(0),
            created_by_user_id: row.try_get("created_by_user_id").unwrap_or_default(),
            updated_clock: row.try_get("updated_clock").unwrap_or(0),
            created_at: row.try_get::<String, _>("created_at").unwrap_or_default(),
            updated_at: row.try_get::<String, _>("updated_at").unwrap_or_default(),
            card_count: row.try_get("card_count").unwrap_or(0),
            column_count: row.try_get("column_count").unwrap_or(0),
        })
        .collect();

    Ok(Json(boards).into_response())
}

pub async fn create_board(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<CreateKanbanBoardRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let name = clamp_str(payload.name.trim(), MAX_BOARD_NAME);
    if name.is_empty() {
        return Err(AppError::BadRequest("board name cannot be empty".into()));
    }
    let description = payload.description.as_deref().map(|d| clamp_str(d.trim(), 65_535));

    // Client-generated ids are reused on both ends (design §11.11) so a board
    // created offline converges with its cloud twin; absent → server-generated.
    let board_id = match payload.id.as_deref() {
        Some(id) => { validate_uuid(id)?; id.to_string() }
        None => Uuid::new_v4().to_string(),
    };
    let seed_column_ids: Vec<String> = match &payload.column_ids {
        Some(ids) => {
            if ids.len() != DEFAULT_COLUMNS.len() {
                return Err(AppError::BadRequest(format!(
                    "columnIds must contain exactly {} ids",
                    DEFAULT_COLUMNS.len()
                )));
            }
            for id in ids {
                validate_uuid(id)?;
            }
            ids.clone()
        }
        None => DEFAULT_COLUMNS.iter().map(|_| Uuid::new_v4().to_string()).collect(),
    };

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;
    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Append to end: position = max + 1
    let next_pos: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_boards WHERE workspace_id = ?"#,
    )
    .bind(&workspace_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO kanban_boards
           (id, workspace_id, name, description, position, created_by_user_id, updated_clock)
           VALUES (?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(next_pos)
    .bind(&user.id)
    .bind(next_clock)
    .execute(&mut *tx)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.message().contains("uniq_board_per_workspace") => {
            AppError::BadRequest(format!("board name '{}' already exists in this workspace", name))
        }
        _ => AppError::Database(e),
    })?;

    // Seed 3 default columns (reusing client-supplied ids when provided)
    let column_ids: Vec<String> = seed_column_ids;
    for (i, col_name) in DEFAULT_COLUMNS.iter().enumerate() {
        sqlx::query(
            r#"INSERT INTO kanban_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)"#,
        )
        .bind(&column_ids[i])
        .bind(&board_id)
        .bind(col_name)
        .bind(i as i32)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    // Broadcast: board created
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanBoardUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                name: name.clone(),
                position: next_pos,
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id: device_id.clone(),
            },
            session_id.as_deref(),
        )
        .await;

    // Broadcast each default column
    for (i, col_id) in column_ids.iter().enumerate() {
        state
            .hub
            .publish_to_workspace(
                &workspace_id,
                WorkspaceEvent::KanbanColumnUpdated {
                    workspace_id: workspace_id.clone(),
                    source_session_id: session_id.clone(),
                    board_id: board_id.clone(),
                    column_id: col_id.clone(),
                    name: DEFAULT_COLUMNS[i].to_string(),
                    position: i as i32,
                    updated_clock: next_clock,
                    edited_by: user.username.clone(),
                    source: "web".to_string(),
                    device_id: device_id.clone(),
                },
                session_id.as_deref(),
            )
            .await;
    }

    // Return the full board (with seeded columns)
    get_board_inner(&state, &workspace_id, &board_id).await
}

pub async fn get_board(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;
    get_board_inner(&state, &workspace_id, &board_id).await
}

pub(crate) async fn get_board_inner(
    state: &AppState,
    workspace_id: &str,
    board_id: &str,
) -> Result<Response, AppError> {
    // Board summary
    let row = sqlx::query(
        r#"SELECT id, workspace_id, name, description, position, created_by_user_id,
                  updated_clock,
                  CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at,
                  (SELECT COUNT(*) FROM kanban_cards c WHERE c.board_id = b.id AND c.archived_at IS NULL) AS card_count,
                  (SELECT COUNT(*) FROM kanban_columns col WHERE col.board_id = b.id) AS column_count
           FROM kanban_boards b
           WHERE b.id = ? AND b.workspace_id = ?"#,
    )
    .bind(board_id)
    .bind(workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let summary = KanbanBoardSummary {
        id: row.try_get("id")?,
        workspace_id: row.try_get("workspace_id")?,
        name: row.try_get("name")?,
        description: row.try_get("description")?,
        position: row.try_get("position")?,
        created_by_user_id: row.try_get("created_by_user_id")?,
        updated_clock: row.try_get("updated_clock")?,
        created_at: row.try_get::<String, _>("created_at")?,
        updated_at: row.try_get::<String, _>("updated_at")?,
        card_count: row.try_get("card_count")?,
        column_count: row.try_get("column_count")?,
    };

    // Columns
    let col_rows = sqlx::query(
        r#"SELECT id, board_id, name, position, wip_limit, color,
                  (SELECT COUNT(*) FROM kanban_cards c WHERE c.column_id = col.id AND c.archived_at IS NULL) AS card_count
           FROM kanban_columns col
           WHERE col.board_id = ?
           ORDER BY col.position ASC"#,
    )
    .bind(board_id)
    .fetch_all(&state.pool)
    .await?;

    let columns: Vec<KanbanColumn> = col_rows
        .into_iter()
        .map(|r| KanbanColumn {
            id: r.try_get("id").unwrap_or_default(),
            board_id: r.try_get("board_id").unwrap_or_default(),
            name: r.try_get("name").unwrap_or_default(),
            position: r.try_get("position").unwrap_or(0),
            wip_limit: r.try_get("wip_limit").unwrap_or(None),
            color: r.try_get("color").unwrap_or(None),
            card_count: r.try_get("card_count").unwrap_or(0),
        })
        .collect();

    // Active cards (default: exclude archived)
    let card_rows = sqlx::query(
        r#"SELECT id, workspace_id, board_id, column_id, title, description, position, priority,
                  CAST(due_at AS CHAR) AS due_at, assignee_user_id, properties_extra,
                  created_by_user_id, updated_clock, version_id,
                  CAST(archived_at AS CHAR) AS archived_at,
                  CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at
           FROM kanban_cards
           WHERE board_id = ? AND archived_at IS NULL
           ORDER BY column_id ASC, position ASC"#,
    )
    .bind(board_id)
    .fetch_all(&state.pool)
    .await?;

    let card_ids: Vec<String> = card_rows
        .iter()
        .filter_map(|r| r.try_get::<String, _>("id").ok())
        .collect();
    let mut labels_by_card = load_label_ids_for_cards(&state.pool, &card_ids).await?;
    let mut cards: Vec<KanbanCard> = Vec::with_capacity(card_rows.len());
    for r in card_rows {
        let card_id: String = r.try_get("id")?;
        let label_ids = labels_by_card.remove(&card_id).unwrap_or_default();
        cards.push(KanbanCard {
            id: card_id,
            workspace_id: r.try_get("workspace_id")?,
            board_id: r.try_get("board_id")?,
            column_id: r.try_get("column_id")?,
            title: r.try_get("title")?,
            description: r.try_get("description")?,
            position: r.try_get("position")?,
            priority: r.try_get("priority")?,
            due_at: r.try_get::<Option<String>, _>("due_at")?,
            assignee_user_id: r.try_get("assignee_user_id")?,
            properties_extra: r.try_get("properties_extra")?,
            label_ids,
            created_by_user_id: r.try_get("created_by_user_id")?,
            updated_clock: r.try_get("updated_clock")?,
            version_id: r.try_get("version_id")?,
            archived_at: r.try_get::<Option<String>, _>("archived_at")?,
            created_at: r.try_get::<String, _>("created_at")?,
            updated_at: r.try_get::<String, _>("updated_at")?,
        });
    }

    // Labels
    let label_rows = sqlx::query(
        r#"SELECT id, board_id, name, color, description,
                  CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at
           FROM kanban_labels
           WHERE board_id = ?
           ORDER BY name ASC"#,
    )
    .bind(board_id)
    .fetch_all(&state.pool)
    .await?;

    let labels: Vec<KanbanLabel> = label_rows
        .into_iter()
        .map(|r| KanbanLabel {
            id: r.try_get("id").unwrap_or_default(),
            board_id: r.try_get("board_id").unwrap_or_default(),
            name: r.try_get("name").unwrap_or_default(),
            color: r.try_get("color").unwrap_or_default(),
            description: r.try_get("description").unwrap_or(None),
            created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
            updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
        })
        .collect();

    let board = KanbanBoard {
        summary,
        columns,
        cards,
        labels,
    };
    Ok(Json(board).into_response())
}

pub async fn patch_board(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
    Json(payload): Json<UpdateKanbanBoardRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let new_name = match payload.name.as_deref() {
        Some(n) => {
            let t = clamp_str(n.trim(), MAX_BOARD_NAME);
            if t.is_empty() {
                return Err(AppError::BadRequest("board name cannot be empty".into()));
            }
            Some(t)
        }
        None => None,
    };
    let new_desc = payload
        .description
        .as_deref()
        .map(|d| clamp_str(d.trim(), 65_535));

    let mut tx = state.pool.begin().await?;
    let row = sqlx::query(
        r#"SELECT 1 AS ok FROM kanban_boards WHERE id = ? AND workspace_id = ? FOR UPDATE"#,
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;
    let _: i32 = row.try_get("ok").unwrap_or(0);

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Update fields conditionally
    if let Some(n) = &new_name {
        sqlx::query("UPDATE kanban_boards SET name = ? WHERE id = ?")
            .bind(n)
            .bind(&board_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| match &e {
                sqlx::Error::Database(db_err)
                    if db_err.message().contains("uniq_board_per_workspace") =>
                {
                    AppError::BadRequest(format!("board name '{}' already exists in this workspace", n))
                }
                _ => AppError::Database(e),
            })?;
    }
    if let Some(d) = &new_desc {
        sqlx::query("UPDATE kanban_boards SET description = ? WHERE id = ?")
            .bind(d)
            .bind(&board_id)
            .execute(&mut *tx)
            .await?;
    }
    sqlx::query("UPDATE kanban_boards SET updated_clock = ? WHERE id = ?")
        .bind(next_clock)
        .bind(&board_id)
        .execute(&mut *tx)
        .await?;

    // Fetch the final position for the broadcast
    let position: i32 = sqlx::query_scalar("SELECT position FROM kanban_boards WHERE id = ?")
        .bind(&board_id)
        .fetch_one(&mut *tx)
        .await?;
    let final_name: String = sqlx::query_scalar("SELECT name FROM kanban_boards WHERE id = ?")
        .bind(&board_id)
        .fetch_one(&mut *tx)
        .await?;

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanBoardUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                name: final_name,
                position,
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    get_board_inner(&state, &workspace_id, &board_id).await
}

pub async fn reorder_boards(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<ReorderKanbanBoardsRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    if payload.board_ids.is_empty() {
        return Err(AppError::BadRequest("board_ids cannot be empty".into()));
    }

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;
    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Verify all boards belong to this workspace, and that payload is a
    // permutation of the workspace's current boards.
    let existing: Vec<String> = sqlx::query_scalar(
        r#"SELECT id FROM kanban_boards WHERE workspace_id = ? ORDER BY id"#,
    )
    .bind(&workspace_id)
    .fetch_all(&mut *tx)
    .await?;
    let mut payload_sorted = payload.board_ids.clone();
    payload_sorted.sort();
    let mut existing_sorted = existing.clone();
    existing_sorted.sort();
    if payload_sorted != existing_sorted {
        return Err(AppError::BadRequest(
            "board_ids must be a permutation of all boards in the workspace".into(),
        ));
    }

    for (i, bid) in payload.board_ids.iter().enumerate() {
        sqlx::query("UPDATE kanban_boards SET position = ? WHERE id = ? AND workspace_id = ?")
            .bind(i as i32)
            .bind(bid)
            .bind(&workspace_id)
            .execute(&mut *tx)
            .await?;
        sqlx::query("UPDATE kanban_boards SET updated_clock = ? WHERE id = ?")
            .bind(next_clock)
            .bind(bid)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    // Broadcast each board's new position
    for (i, bid) in payload.board_ids.iter().enumerate() {
        let name: String = sqlx::query_scalar("SELECT name FROM kanban_boards WHERE id = ?")
            .bind(bid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or_default();
        state
            .hub
            .publish_to_workspace(
                &workspace_id,
                WorkspaceEvent::KanbanBoardUpdated {
                    workspace_id: workspace_id.clone(),
                    source_session_id: session_id.clone(),
                    board_id: bid.clone(),
                    name,
                    position: i as i32,
                    updated_clock: next_clock,
                    edited_by: user.username.clone(),
                    source: "web".to_string(),
                    device_id: device_id.clone(),
                },
                session_id.as_deref(),
            )
            .await;
    }

    Ok((axum::http::StatusCode::OK, Json(json!({"ok": true}))).into_response())
}

pub async fn delete_board(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;
    let row = sqlx::query("SELECT 1 AS ok FROM kanban_boards WHERE id = ? AND workspace_id = ? FOR UPDATE")
        .bind(&board_id)
        .bind(&workspace_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;
    let _: i32 = row.try_get("ok").unwrap_or(0);

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Hard delete: cascade FKs handle columns, cards, labels, card_labels,
    // AND archived rows in kanban_card_trash (per migration 0007 design).
    sqlx::query("DELETE FROM kanban_boards WHERE id = ?")
        .bind(&board_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanBoardDeleted {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id,
                deleted_clock: next_clock,
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(axum::http::StatusCode::NO_CONTENT.into_response())
}

// ── Module-private helpers ──

pub(crate) async fn load_card_label_ids(
    pool: &sqlx::Pool<sqlx::MySql>,
    card_id: &str,
) -> Result<Vec<String>, AppError> {
    let rows = sqlx::query("SELECT label_id FROM kanban_card_labels WHERE card_id = ?")
        .bind(card_id)
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .filter_map(|r| r.try_get::<String, _>("label_id").ok())
        .collect())
}

/// Batch-load label ids for many cards in a single query (avoids N+1).
/// Returns a map keyed by card_id; cards with no labels are absent from the map.
pub(crate) async fn load_label_ids_for_cards(
    pool: &sqlx::Pool<sqlx::MySql>,
    card_ids: &[String],
) -> Result<std::collections::HashMap<String, Vec<String>>, AppError> {
    use std::collections::HashMap;
    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    if card_ids.is_empty() {
        return Ok(map);
    }
    let placeholders = vec!["?"; card_ids.len()].join(",");
    let sql = format!(
        "SELECT card_id, label_id FROM kanban_card_labels WHERE card_id IN ({placeholders})"
    );
    let mut q = sqlx::query(&sql);
    for id in card_ids {
        q = q.bind(id);
    }
    let rows = q.fetch_all(pool).await?;
    for r in rows {
        let cid: String = r.try_get("card_id")?;
        let lid: String = r.try_get("label_id")?;
        map.entry(cid).or_default().push(lid);
    }
    Ok(map)
}

pub(crate) fn header_device_id(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-device-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}
