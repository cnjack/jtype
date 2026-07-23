//! Mint and validate board-scoped MCP credentials.
//!
//! A credential created here is anchored to the immutable document id of one
//! `.board` file. The logical board id is also recorded because cards refer to
//! it from frontmatter and the pinned MCP endpoint carries it in the URL.

use axum::{extract::State, http::HeaderMap, Json};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{MySql, Pool, Row};

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::util::{is_board_path, random_token, sha256_hex};
use crate::AppState;

/// Same 90-day lifetime the OAuth-minted MCP tokens use.
const MCP_TOKEN_TTL_SECS: i64 = 90 * 24 * 60 * 60;
const BOARD_SCOPE: &str = "mcp_kanban_board";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MintMcpTokenRequest {
    pub workspace_id: String,
    pub board_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MintedMcpToken {
    pub token: String,
    pub expires_at: String,
    pub workspace_id: String,
    pub board_id: String,
    pub board_document_id: String,
}

/// `POST /api/v1/mcp-token` — mint a 90-day token for exactly one board.
///
/// The caller must use a full login session and currently belong to the cloud
/// workspace. `boardId` must uniquely identify the JSON config of a `.board`
/// document in that workspace; ambiguous duplicate logical ids fail closed.
pub async fn mint(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<MintMcpTokenRequest>,
) -> Result<Json<MintedMcpToken>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    if user.scope != "full" {
        return Err(AppError::Forbidden);
    }

    let workspace_id = payload.workspace_id.trim();
    let board_id = payload.board_id.trim();
    if workspace_id.is_empty() {
        return Err(AppError::BadRequest("workspaceId is required".to_string()));
    }
    if board_id.is_empty() || board_id.len() > 128 {
        return Err(AppError::BadRequest(
            "boardId must be between 1 and 128 bytes".to_string(),
        ));
    }

    require_workspace_role(
        &state.pool,
        workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let board_document_id =
        resolve_unique_board_document(&state.pool, workspace_id, board_id).await?;
    let token = random_token();
    let token_hash = sha256_hex(&token);

    // Session + authority grant must become visible atomically. Otherwise an
    // interrupted mint could leave a usable scoped session with no board
    // authority record (or an orphaned grant).
    let mut tx = state.pool.begin().await?;
    sqlx::query(
        r#"INSERT INTO sessions (token_hash, user_id, scope, label, expires_at)
           VALUES (?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))"#,
    )
    .bind(&token_hash)
    .bind(&user.id)
    .bind(BOARD_SCOPE)
    .bind("Board MCP")
    .bind(MCP_TOKEN_TTL_SECS)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO mcp_board_grants
           (token_hash, workspace_id, board_document_id, logical_board_id)
           VALUES (?, ?, ?, ?)"#,
    )
    .bind(&token_hash)
    .bind(workspace_id)
    .bind(&board_document_id)
    .bind(board_id)
    .execute(&mut *tx)
    .await?;

    let expires_at: String =
        sqlx::query_scalar("SELECT CAST(expires_at AS CHAR) FROM sessions WHERE token_hash = ?")
            .bind(&token_hash)
            .fetch_one(&mut *tx)
            .await?;
    tx.commit().await?;

    Ok(Json(MintedMcpToken {
        token,
        expires_at,
        workspace_id: workspace_id.to_string(),
        board_id: board_id.to_string(),
        board_document_id,
    }))
}

/// Validate that a raw credential is currently authorized for the exact pinned
/// workspace + logical board.
///
/// This rechecks token expiry, user status, current workspace membership, the
/// immutable board document, and its current JSON `id`. Removing the member,
/// deleting/renaming the board document, or changing its logical id therefore
/// revokes access without waiting for token expiry.
pub(crate) async fn validate_board_grant(
    pool: &Pool<MySql>,
    raw_token: &str,
    workspace_id: &str,
    logical_board_id: &str,
) -> Result<(), AppError> {
    let row = sqlx::query(
        r#"SELECT d.id AS board_document_id, d.relative_path, d.content
           FROM sessions s
           JOIN mcp_board_grants g ON g.token_hash = s.token_hash
           JOIN users u ON u.id = s.user_id
           JOIN workspaces w ON w.id = g.workspace_id
           LEFT JOIN workspace_members m
             ON m.workspace_id = w.id
            AND m.user_id = s.user_id
            AND m.status = 'active'
           JOIN documents d
             ON d.id = g.board_document_id
            AND d.workspace_id = g.workspace_id
           WHERE s.token_hash = ?
             AND s.scope = ?
             AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
             AND u.disabled_at IS NULL
             AND g.workspace_id = ?
             AND g.logical_board_id = ?
             AND (m.user_id IS NOT NULL OR w.user_id = s.user_id OR w.owner_user_id = s.user_id)"#,
    )
    .bind(sha256_hex(raw_token))
    .bind(BOARD_SCOPE)
    .bind(workspace_id)
    .bind(logical_board_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Forbidden)?;

    let board_document_id: String = row.try_get("board_document_id")?;
    let relative_path: String = row.try_get("relative_path")?;
    let content: String = row.try_get("content")?;
    if !is_board_path(&relative_path)
        || board_config_id(&content).as_deref() != Some(logical_board_id)
    {
        return Err(AppError::Forbidden);
    }

    // Logical board ids are how card frontmatter joins cards to a board. If a
    // duplicate appears after minting, fail closed rather than letting the
    // pinned token operate on an ambiguous card set or another board config.
    let unique_document_id =
        resolve_unique_board_document(pool, workspace_id, logical_board_id).await?;
    if unique_document_id != board_document_id {
        return Err(AppError::Forbidden);
    }

    Ok(())
}

async fn resolve_unique_board_document(
    pool: &Pool<MySql>,
    workspace_id: &str,
    logical_board_id: &str,
) -> Result<String, AppError> {
    let rows =
        sqlx::query("SELECT id, relative_path, content FROM documents WHERE workspace_id = ?")
            .bind(workspace_id)
            .fetch_all(pool)
            .await?;

    let mut matches = rows.into_iter().filter_map(|row| {
        let id: String = row.try_get("id").ok()?;
        let relative_path: String = row.try_get("relative_path").ok()?;
        let content: String = row.try_get("content").ok()?;
        (is_board_path(&relative_path)
            && board_config_id(&content).as_deref() == Some(logical_board_id))
        .then_some(id)
    });

    let first = matches.next().ok_or_else(|| {
        AppError::BadRequest(format!(
            "boardId {logical_board_id:?} does not identify a .board document in this workspace"
        ))
    })?;
    if matches.next().is_some() {
        return Err(AppError::BadRequest(format!(
            "boardId {logical_board_id:?} is ambiguous in this workspace"
        )));
    }
    Ok(first)
}

fn board_config_id(content: &str) -> Option<String> {
    serde_json::from_str::<Value>(content)
        .ok()?
        .get("id")?
        .as_str()
        .filter(|id| !id.is_empty())
        .map(ToOwned::to_owned)
}
