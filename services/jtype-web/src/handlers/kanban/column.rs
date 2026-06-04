//! Column handlers.
//!
//! Endpoints:
//!   POST   /api/v1/workspaces/:workspace_id/kanban/boards/:board_id/columns
//!   PATCH  /api/v1/workspaces/:workspace_id/kanban/columns/:column_id
//!   POST   /api/v1/workspaces/:workspace_id/kanban/columns/reorder
//!
//! NO DELETE — columns are deleted only via board hard-delete cascade.
//! Reorder is atomic (single transaction).

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use super::board::header_device_id;
use super::{next_workspace_clock, validate_hex_color, clamp_str};
use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_COLUMN_NAME: usize = 255;

pub async fn create_column(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
    Json(payload): Json<CreateKanbanColumnRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let name = clamp_str(payload.name.trim(), MAX_COLUMN_NAME);
    if name.is_empty() {
        return Err(AppError::BadRequest("column name cannot be empty".into()));
    }
    if let Some(c) = &payload.color {
        validate_hex_color(c)?;
    }

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    // Verify board belongs to this workspace
    let exists: Option<String> = sqlx::query_scalar(
        "SELECT id FROM kanban_boards WHERE id = ? AND workspace_id = ?",
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?;
    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Append to end: position = max + 1
    let next_pos: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_columns WHERE board_id = ?"#,
    )
    .bind(&board_id)
    .fetch_one(&mut *tx)
    .await?;

    let col_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO kanban_columns (id, board_id, name, position, wip_limit, color)
           VALUES (?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&col_id)
    .bind(&board_id)
    .bind(&name)
    .bind(next_pos)
    .bind(payload.wip_limit)
    .bind(&payload.color)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanColumnUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                column_id: col_id.clone(),
                name: name.clone(),
                position: next_pos,
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    // Return the created column
    let col = KanbanColumn {
        id: col_id,
        board_id,
        name,
        position: next_pos,
        wip_limit: payload.wip_limit,
        color: payload.color,
        card_count: 0,
    };
    Ok(Json(col).into_response())
}

pub async fn patch_column(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, column_id)): Path<(String, String)>,
    Json(payload): Json<UpdateKanbanColumnRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    // Find board_id from column (and verify ownership)
    let (board_id, _old_name) = super::resolve_column(&state.pool, &workspace_id, &column_id).await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let new_name = match payload.name.as_deref() {
        Some(n) => {
            let t = clamp_str(n.trim(), MAX_COLUMN_NAME);
            if t.is_empty() {
                return Err(AppError::BadRequest("column name cannot be empty".into()));
            }
            Some(t)
        }
        None => None,
    };

    let mut tx = state.pool.begin().await?;
    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    if let Some(n) = &new_name {
        sqlx::query(
            r#"UPDATE kanban_columns SET name = ? WHERE id = ? AND board_id IN
               (SELECT id FROM kanban_boards WHERE workspace_id = ?)"#,
        )
        .bind(n)
        .bind(&column_id)
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(wip) = &payload.wip_limit {
        sqlx::query(
            r#"UPDATE kanban_columns SET wip_limit = ? WHERE id = ? AND board_id IN
               (SELECT id FROM kanban_boards WHERE workspace_id = ?)"#,
        )
        .bind(wip)
        .bind(&column_id)
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(color_opt) = &payload.color {
        match color_opt {
            Some(color) => {
                validate_hex_color(color)?;
                sqlx::query(
                    r#"UPDATE kanban_columns SET color = ? WHERE id = ? AND board_id IN
                       (SELECT id FROM kanban_boards WHERE workspace_id = ?)"#,
                )
                .bind(color)
                .bind(&column_id)
                .bind(&workspace_id)
                .execute(&mut *tx)
                .await?;
            }
            None => {
                // explicit null = clear color
                sqlx::query(
                    r#"UPDATE kanban_columns SET color = NULL WHERE id = ? AND board_id IN
                       (SELECT id FROM kanban_boards WHERE workspace_id = ?)"#,
                )
                .bind(&column_id)
                .bind(&workspace_id)
                .execute(&mut *tx)
                .await?;
            }
        }
    }

    // Read final state
    let row = sqlx::query(
        r#"SELECT id, board_id, name, position, wip_limit, color,
                  (SELECT COUNT(*) FROM kanban_cards c WHERE c.column_id = col.id AND c.archived_at IS NULL) AS card_count
           FROM kanban_columns col
           WHERE col.id = ?"#,
    )
    .bind(&column_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let col = KanbanColumn {
        id: row.try_get("id")?,
        board_id: row.try_get("board_id")?,
        name: row.try_get("name")?,
        position: row.try_get("position")?,
        wip_limit: row.try_get("wip_limit")?,
        color: row.try_get("color")?,
        card_count: row.try_get("card_count")?,
    };

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanColumnUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                column_id: col.id.clone(),
                name: col.name.clone(),
                position: col.position,
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(Json(col).into_response())
}

pub async fn reorder_columns(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<ReorderKanbanColumnsRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    if payload.column_ids.is_empty() {
        return Err(AppError::BadRequest("column_ids cannot be empty".into()));
    }

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    // Verify board belongs to workspace
    let board_exists: Option<String> = sqlx::query_scalar(
        "SELECT id FROM kanban_boards WHERE id = ? AND workspace_id = ?",
    )
    .bind(&payload.board_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?;
    if board_exists.is_none() {
        return Err(AppError::NotFound);
    }

    // Verify payload is a permutation of the board's current columns
    let existing: Vec<String> = sqlx::query_scalar(
        r#"SELECT id FROM kanban_columns WHERE board_id = ? ORDER BY id"#,
    )
    .bind(&payload.board_id)
    .fetch_all(&mut *tx)
    .await?;
    let mut p = payload.column_ids.clone();
    p.sort();
    let mut e = existing.clone();
    e.sort();
    if p != e {
        return Err(AppError::BadRequest(
            "column_ids must be a permutation of all columns in the board".into(),
        ));
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    for (i, cid) in payload.column_ids.iter().enumerate() {
        sqlx::query("UPDATE kanban_columns SET position = ? WHERE id = ? AND board_id = ?")
            .bind(i as i32)
            .bind(cid)
            .bind(&payload.board_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    // Broadcast each column's new position
    for (i, cid) in payload.column_ids.iter().enumerate() {
        let name: String = sqlx::query_scalar("SELECT name FROM kanban_columns WHERE id = ?")
            .bind(cid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or_default();
        state
            .hub
            .publish_to_workspace(
                &workspace_id,
                WorkspaceEvent::KanbanColumnUpdated {
                    workspace_id: workspace_id.clone(),
                    source_session_id: session_id.clone(),
                    board_id: payload.board_id.clone(),
                    column_id: cid.clone(),
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
