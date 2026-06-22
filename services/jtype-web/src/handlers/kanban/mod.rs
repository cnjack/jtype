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
pub mod webhook;

use sqlx::Row;

use crate::error::AppError;

// ── Shared helpers (used across board/column/card/label) ──

/// Advance `workspaces.sync_clock` and return the new value.
/// Re-exported from `document.rs` to avoid coupling.
pub(crate) async fn next_workspace_clock(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
) -> Result<i64, AppError> {
    crate::handlers::document::next_workspace_clock(tx, workspace_id).await
}

/// Validate kanban priority string.
pub(crate) fn validate_priority(p: &str) -> Result<&str, AppError> {
    match p {
        "none" | "low" | "medium" | "high" | "urgent" => Ok(p),
        _ => Err(AppError::BadRequest(format!(
            "invalid priority '{}' (expected: none|low|medium|high|urgent)",
            p
        ))),
    }
}

/// Verify a prospective card assignee is a member (or owner) of the workspace.
/// `None` assignee is always allowed (unassigned). Returns BadRequest otherwise,
/// preventing cards from being assigned to non-members or non-existent users
/// (the latter would otherwise surface as an opaque FK 500).
pub(crate) async fn validate_assignee(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    assignee_user_id: Option<&str>,
) -> Result<(), AppError> {
    let Some(uid) = assignee_user_id else {
        return Ok(());
    };
    let ok: Option<i64> = sqlx::query_scalar(
        r#"SELECT 1
           FROM workspaces w
           LEFT JOIN workspace_members m
                  ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           WHERE w.id = ?
             AND (m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?)"#,
    )
    .bind(uid)
    .bind(workspace_id)
    .bind(uid)
    .bind(uid)
    .fetch_optional(pool)
    .await?;
    if ok.is_none() {
        return Err(AppError::BadRequest(
            "assignee is not a member of this workspace".into(),
        ));
    }
    Ok(())
}

/// Normalize and validate a `due_at` string into MySQL `DATETIME` form
/// (`YYYY-MM-DD HH:MM:SS`). Accepts ISO-8601 (`T` separator, trailing `Z`,
/// fractional seconds, timezone offset — all stripped to a naive datetime,
/// consistent with how the rest of the service stores timestamps) and the
/// bare MySQL form. A date-only value gets `00:00:00` appended.
pub(crate) fn normalize_due_at(s: &str) -> Result<String, AppError> {
    let t = s.trim().replace('T', " ");
    let t = t.trim_end_matches('Z').trim();
    let bytes = t.as_bytes();
    if bytes.len() >= 19 && is_date(&t[..10]) && bytes[10] == b' ' && is_time(&t[11..19]) {
        return Ok(t[..19].to_string());
    }
    if t.len() == 10 && is_date(t) {
        return Ok(format!("{} 00:00:00", t));
    }
    Err(AppError::BadRequest(format!(
        "due_at must be 'YYYY-MM-DD HH:MM:SS' or an ISO-8601 datetime, got '{}'",
        s
    )))
}

fn is_date(s: &str) -> bool {
    let b = s.as_bytes();
    s.len() == 10
        && b[4] == b'-'
        && b[7] == b'-'
        && b[..4].iter().all(u8::is_ascii_digit)
        && b[5..7].iter().all(u8::is_ascii_digit)
        && b[8..10].iter().all(u8::is_ascii_digit)
}

fn is_time(s: &str) -> bool {
    let b = s.as_bytes();
    s.len() == 8
        && b[2] == b':'
        && b[5] == b':'
        && b[..2].iter().all(u8::is_ascii_digit)
        && b[3..5].iter().all(u8::is_ascii_digit)
        && b[6..8].iter().all(u8::is_ascii_digit)
}

/// Validate a client-supplied id is a well-formed UUID (8-4-4-4-12 hex).
/// Clients generate ids and reuse them on both ends (design §11.11); rejecting
/// malformed ids keeps junk out of `CHAR(36)` PKs / FKs.
pub(crate) fn validate_uuid(s: &str) -> Result<(), AppError> {
    let b = s.as_bytes();
    let ok = b.len() == 36
        && b[8] == b'-'
        && b[13] == b'-'
        && b[18] == b'-'
        && b[23] == b'-'
        && b.iter().enumerate().all(|(i, c)| {
            matches!(i, 8 | 13 | 18 | 23) || c.is_ascii_hexdigit()
        });
    if ok {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!("invalid id '{}' (expected a UUID)", s)))
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
