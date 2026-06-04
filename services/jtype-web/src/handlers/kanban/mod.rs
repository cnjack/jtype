//! Kanban handlers — boards, columns, cards, labels.
//!
//! Cloud-only: all state lives in MySQL, no Tauri commands, no local files.
//! WebSocket broadcasts via `hub::ConnectionHub` for realtime.
//!
//! Role gates (delegated to `require_workspace_role`):
//!   viewer  → read
//!   editor  → write, archive, restore
//!   admin   → hard delete, board delete

pub mod board;
pub mod card;
pub mod column;
pub mod label;

use sqlx::Row;

use crate::error::AppError;

// ── Shared helpers (used across board/column/card/label) ──

/// Advance `workspaces.sync_clock` and return the new value.
/// Re-exported from `document.rs` to avoid coupling.
#[allow(dead_code)]
pub(crate) async fn next_workspace_clock(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
) -> Result<i64, AppError> {
    crate::handlers::document::next_workspace_clock(tx, workspace_id).await
}

/// Validate kanban priority string.
#[allow(dead_code)]
pub(crate) fn validate_priority(p: &str) -> Result<&str, AppError> {
    match p {
        "none" | "low" | "medium" | "high" | "urgent" => Ok(p),
        _ => Err(AppError::BadRequest(format!(
            "invalid priority '{}' (expected: none|low|medium|high|urgent)",
            p
        ))),
    }
}

/// Validate hex color: `#RRGGBB`.
pub(crate) fn validate_hex_color(s: &str) -> Result<(), AppError> {
    let bytes = s.as_bytes();
    if bytes.len() != 7 || bytes[0] != b'#' {
        return Err(AppError::BadRequest(format!(
            "color must be '#RRGGBB', got '{}'",
            s
        )));
    }
    for &b in &bytes[1..] {
        if !(b.is_ascii_hexdigit()) {
            return Err(AppError::BadRequest(format!(
                "color must be '#RRGGBB', got '{}'",
                s
            )));
        }
    }
    Ok(())
}

/// Truncate a string to max bytes at a UTF-8 boundary.
pub(crate) fn clamp_str(s: &str, max: usize) -> String {
    if s.len() <= max {
        return s.to_string();
    }
    let mut idx = max;
    while idx > 0 && !s.is_char_boundary(idx) {
        idx -= 1;
    }
    s[..idx].to_string()
}

/// Resolve a column → (board_id, column_name). Verifies workspace ownership.
pub(crate) async fn resolve_column(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    column_id: &str,
) -> Result<(String, String), AppError> {
    let row = sqlx::query(
        r#"SELECT b.id AS board_id, c.name AS column_name
           FROM kanban_columns c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?"#,
    )
    .bind(column_id)
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let board_id: String = row.try_get("board_id")?;
    let column_name: String = row.try_get("column_name")?;
    Ok((board_id, column_name))
}
