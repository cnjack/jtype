//! Label handlers — board-scoped M:N labels on cards.
//!
//! Endpoints:
//!   GET    /api/v1/workspaces/:workspace_id/kanban/boards/:board_id/labels
//!   POST   /api/v1/workspaces/:workspace_id/kanban/boards/:board_id/labels
//!   PATCH  /api/v1/workspaces/:workspace_id/kanban/labels/:label_id
//!   DELETE /api/v1/workspaces/:workspace_id/kanban/labels/:label_id
//!
//! Validation: name 1-80 chars, color `#RRGGBB`, max 50/board (app-layer check).

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use super::board::header_device_id;
use super::{clamp_str, next_workspace_clock, validate_hex_color};
use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_LABEL_NAME: usize = 80;
const MAX_LABEL_DESCRIPTION: usize = 255;
const MAX_LABELS_PER_BOARD: i64 = 50;

pub async fn list_labels(
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

    let exists: Option<String> = sqlx::query_scalar(
        "SELECT id FROM kanban_boards WHERE id = ? AND workspace_id = ?",
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let rows = sqlx::query(
        r#"SELECT id, board_id, name, color, description,
                  CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at
           FROM kanban_labels
           WHERE board_id = ?
           ORDER BY name ASC"#,
    )
    .bind(&board_id)
    .fetch_all(&state.pool)
    .await?;

    let labels: Vec<KanbanLabel> = rows
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

    Ok(Json(labels).into_response())
}

pub async fn create_label(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
    Json(payload): Json<CreateKanbanLabelRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let name = clamp_str(payload.name.trim(), MAX_LABEL_NAME);
    if name.is_empty() {
        return Err(AppError::BadRequest("label name cannot be empty".into()));
    }
    validate_hex_color(&payload.color)?;
    let description = payload
        .description
        .as_deref()
        .map(|d| clamp_str(d.trim(), MAX_LABEL_DESCRIPTION));

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    // Verify board belongs to workspace
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

    // 50/board cap
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM kanban_labels WHERE board_id = ?")
        .bind(&board_id)
        .fetch_one(&mut *tx)
        .await?;
    if count >= MAX_LABELS_PER_BOARD {
        return Err(AppError::BadRequest(format!(
            "max {} labels per board (current: {})",
            MAX_LABELS_PER_BOARD, count
        )));
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    let label_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"INSERT INTO kanban_labels (id, board_id, name, color, description)
           VALUES (?, ?, ?, ?, ?)"#,
    )
    .bind(&label_id)
    .bind(&board_id)
    .bind(&name)
    .bind(&payload.color)
    .bind(&description)
    .execute(&mut *tx)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.message().contains("uniq_label_per_board") => {
            AppError::BadRequest(format!("label name '{}' already exists on this board", name))
        }
        _ => AppError::Database(e),
    })?;

    tx.commit().await?;

    // Read final state
    let row = sqlx::query(
        "SELECT id, board_id, name, color, description,
                CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at
         FROM kanban_labels WHERE id = ?",
    )
    .bind(&label_id)
    .fetch_one(&state.pool)
    .await?;
    let label = KanbanLabel {
        id: row.try_get("id")?,
        board_id: row.try_get("board_id")?,
        name: row.try_get("name")?,
        color: row.try_get("color")?,
        description: row.try_get("description")?,
        created_at: row.try_get::<String, _>("created_at")?,
        updated_at: row.try_get::<String, _>("updated_at")?,
    };

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanLabelChanged {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(Json(label).into_response())
}

pub async fn patch_label(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, label_id)): Path<(String, String)>,
    Json(payload): Json<UpdateKanbanLabelRequest>,
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
            let t = clamp_str(n.trim(), MAX_LABEL_NAME);
            if t.is_empty() {
                return Err(AppError::BadRequest("label name cannot be empty".into()));
            }
            Some(t)
        }
        None => None,
    };
    if let Some(c) = &payload.color {
        validate_hex_color(c)?;
    }

    let mut tx = state.pool.begin().await?;

    // Verify ownership: label → board → workspace
    let row = sqlx::query(
        r#"SELECT l.id, l.board_id
           FROM kanban_labels l
           JOIN kanban_boards b ON b.id = l.board_id
           WHERE l.id = ? AND b.workspace_id = ?
           FOR UPDATE"#,
    )
    .bind(&label_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;
    let board_id: String = row.try_get("board_id")?;

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    if let Some(n) = &new_name {
        sqlx::query("UPDATE kanban_labels SET name = ? WHERE id = ?")
            .bind(n)
            .bind(&label_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| match &e {
                sqlx::Error::Database(db_err) if db_err.message().contains("uniq_label_per_board") => {
                    AppError::BadRequest(format!("label name '{}' already exists on this board", n))
                }
                _ => AppError::Database(e),
            })?;
    }
    if let Some(c) = &payload.color {
        sqlx::query("UPDATE kanban_labels SET color = ? WHERE id = ?")
            .bind(c)
            .bind(&label_id)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(d_opt) = &payload.description {
        match d_opt {
            Some(d) => {
                sqlx::query("UPDATE kanban_labels SET description = ? WHERE id = ?")
                    .bind(clamp_str(d, MAX_LABEL_DESCRIPTION))
                    .bind(&label_id)
                    .execute(&mut *tx)
                    .await?;
            }
            None => {
                sqlx::query("UPDATE kanban_labels SET description = NULL WHERE id = ?")
                    .bind(&label_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }
    }

    tx.commit().await?;

    // Read final state
    let row = sqlx::query(
        "SELECT id, board_id, name, color, description,
                CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at
         FROM kanban_labels WHERE id = ?",
    )
    .bind(&label_id)
    .fetch_one(&state.pool)
    .await?;
    let label = KanbanLabel {
        id: row.try_get("id")?,
        board_id: row.try_get("board_id")?,
        name: row.try_get("name")?,
        color: row.try_get("color")?,
        description: row.try_get("description")?,
        created_at: row.try_get::<String, _>("created_at")?,
        updated_at: row.try_get::<String, _>("updated_at")?,
    };

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanLabelChanged {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id,
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(Json(label).into_response())
}

pub async fn delete_label(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, label_id)): Path<(String, String)>,
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

    let mut tx = state.pool.begin().await?;

    // Verify ownership
    let row = sqlx::query(
        r#"SELECT l.id, l.board_id
           FROM kanban_labels l
           JOIN kanban_boards b ON b.id = l.board_id
           WHERE l.id = ? AND b.workspace_id = ?
           FOR UPDATE"#,
    )
    .bind(&label_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;
    let board_id: String = row.try_get("board_id")?;

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Hard delete — cascades to kanban_card_labels
    sqlx::query("DELETE FROM kanban_labels WHERE id = ?")
        .bind(&label_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanLabelChanged {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id,
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(axum::http::StatusCode::NO_CONTENT.into_response())
}
