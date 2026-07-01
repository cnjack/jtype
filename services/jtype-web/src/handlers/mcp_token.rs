//! Mint a personal `mcp`-scoped token for the board Settings "MCP access" panel,
//! so a user can paste a ready-to-use address + token into an AI client
//! (Claude/Cursor) without running the full OAuth flow.

use axum::{extract::State, http::HeaderMap, Json};
use serde::Serialize;

use crate::error::AppError;
use crate::handlers::auth::create_scoped_session;
use crate::middleware::auth::extract_user;
use crate::AppState;

/// Same 90-day lifetime the OAuth-minted MCP tokens use.
const MCP_TOKEN_TTL_SECS: i64 = 90 * 24 * 60 * 60;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MintedMcpToken {
    pub token: String,
}

/// `POST /api/v1/mcp-token` — mint a 90-day `mcp`-scoped token for the caller.
/// Requires a full (non-`mcp`) session, so an agent token can't escalate by
/// minting itself a fresh one.
pub async fn mint(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MintedMcpToken>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    if user.scope == "mcp" {
        return Err(AppError::Forbidden);
    }
    let token = create_scoped_session(
        &state.pool,
        &user.id,
        "mcp",
        Some(MCP_TOKEN_TTL_SECS),
        Some("Board settings"),
    )
    .await?;
    Ok(Json(MintedMcpToken { token }))
}
