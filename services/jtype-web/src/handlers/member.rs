use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::AppState;

// ── Response / Request Types ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub status: String,
    pub joined_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferRequest {
    pub new_owner_user_id: String,
}

// ── Handlers ──

/// GET /api/v1/workspaces/:workspace_id/members
/// Returns all active members of the workspace.
pub async fn list_members(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<MemberInfo>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT wm.user_id, u.username, wm.role, wm.status, wm.joined_at
           FROM workspace_members wm
           JOIN users u ON u.id = wm.user_id
           WHERE wm.workspace_id = ? AND wm.status = 'active'
           ORDER BY FIELD(wm.role, 'owner', 'admin', 'editor', 'viewer'), u.username"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let members = rows
        .into_iter()
        .map(|row| {
            Ok(MemberInfo {
                user_id: row.try_get("user_id")?,
                username: row.try_get("username")?,
                role: row.try_get("role")?,
                status: row.try_get("status")?,
                joined_at: row
                    .try_get::<Option<String>, _>("joined_at")
                    .unwrap_or(None),
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;

    Ok(Json(members))
}

/// POST /api/v1/workspaces/:workspace_id/members/:user_id/remove
/// Owner or admin can remove a member. Admin cannot remove owner or other admins.
pub async fn remove_member(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, target_user_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let caller_role =
        require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;

    // Look up the target member's current status and role
    let target = sqlx::query(
        "SELECT role, status FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
    )
    .bind(&workspace_id)
    .bind(&target_user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let target_role: String = target.try_get("role")?;
    let target_status: String = target.try_get("status")?;

    // Already removed → idempotent 204
    if target_status == "removed" {
        return Ok(StatusCode::NO_CONTENT);
    }

    // Cannot remove owner
    if target_role == "owner" {
        return Err(AppError::Forbidden);
    }

    // Admin cannot remove another admin
    if caller_role == "admin" && target_role == "admin" {
        return Err(AppError::Forbidden);
    }

    sqlx::query(
        "UPDATE workspace_members SET status = 'removed' WHERE workspace_id = ? AND user_id = ?",
    )
    .bind(&workspace_id)
    .bind(&target_user_id)
    .execute(&state.pool)
    .await?;

    // Fetch target username for the event
    let target_username: String = sqlx::query_scalar("SELECT username FROM users WHERE id = ?")
        .bind(&target_user_id)
        .fetch_one(&state.pool)
        .await
        .unwrap_or_default();

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::MemberRemoved {
                workspace_id: workspace_id.clone(),
                user_id: target_user_id.clone(),
                username: target_username,
                removed_by_user_id: user.id.clone(),
            },
            session_id.as_deref(),
        )
        .await;
    // Kick target user from workspace across all sessions (H10)
    state
        .hub
        .kick_user_from_workspace(&target_user_id, &workspace_id)
        .await;

    Ok(StatusCode::NO_CONTENT)
}
/// A member voluntarily leaves the workspace. Owner cannot leave.
pub async fn leave_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let caller_role = require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    if caller_role == "owner" {
        return Err(AppError::BadRequest(
            "Owner cannot leave. Transfer ownership first.".to_string(),
        ));
    }

    sqlx::query(
        "UPDATE workspace_members SET status = 'removed' WHERE workspace_id = ? AND user_id = ?",
    )
    .bind(&workspace_id)
    .bind(&user.id)
    .execute(&state.pool)
    .await?;

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::MemberLeft {
                workspace_id: workspace_id.clone(),
                user_id: user.id.clone(),
                username: user.username.clone(),
            },
            session_id.as_deref(),
        )
        .await;
    // Remove user's own session subscriptions for this workspace (H11)
    state
        .hub
        .kick_user_from_workspace(&user.id, &workspace_id)
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// PUT /api/v1/workspaces/:workspace_id/members/:user_id
/// Only the owner can change a member's role.
pub async fn update_member_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, target_user_id)): Path<(String, String)>,
    Json(payload): Json<UpdateRoleRequest>,
) -> Result<Json<MemberInfo>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner"]).await?;

    // Cannot change own role
    if target_user_id == user.id {
        return Err(AppError::BadRequest(
            "Cannot change your own role.".to_string(),
        ));
    }

    let role = payload.role.trim().to_ascii_lowercase();
    if !["admin", "editor", "viewer"].contains(&role.as_str()) {
        return Err(AppError::BadRequest(
            "Role must be admin, editor, or viewer.".to_string(),
        ));
    }

    // Ensure target is an active member
    let target = sqlx::query(
        "SELECT role, status FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
    )
    .bind(&workspace_id)
    .bind(&target_user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let _status: String = target.try_get("status")?;
    let previous_role: String = target.try_get("role")?;

    // No-op guard: skip update and event if role is unchanged (M4)
    if role == previous_role {
        let row = sqlx::query(
            r#"SELECT wm.user_id, u.username, wm.role, wm.status, wm.joined_at
               FROM workspace_members wm
               JOIN users u ON u.id = wm.user_id
               WHERE wm.workspace_id = ? AND wm.user_id = ?"#,
        )
        .bind(&workspace_id)
        .bind(&target_user_id)
        .fetch_one(&state.pool)
        .await?;
        return Ok(Json(MemberInfo {
            user_id: row.try_get("user_id")?,
            username: row.try_get("username")?,
            role: row.try_get("role")?,
            status: row.try_get("status")?,
            joined_at: row
                .try_get::<Option<String>, _>("joined_at")
                .unwrap_or(None),
        }));
    }

    sqlx::query("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?")
        .bind(&role)
        .bind(&workspace_id)
        .bind(&target_user_id)
        .execute(&state.pool)
        .await?;

    // Return updated member info
    let row = sqlx::query(
        r#"SELECT wm.user_id, u.username, wm.role, wm.status, wm.joined_at
           FROM workspace_members wm
           JOIN users u ON u.id = wm.user_id
           WHERE wm.workspace_id = ? AND wm.user_id = ?"#,
    )
    .bind(&workspace_id)
    .bind(&target_user_id)
    .fetch_one(&state.pool)
    .await?;

    let username: String = row.try_get("username")?;

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::MemberRoleChanged {
                workspace_id: workspace_id.clone(),
                user_id: target_user_id.clone(),
                username: username.clone(),
                previous_role,
                new_role: role.clone(),
            },
            session_id.as_deref(),
        )
        .await;

    Ok(Json(MemberInfo {
        user_id: row.try_get("user_id")?,
        username,
        role: row.try_get("role")?,
        status: row.try_get("status")?,
        joined_at: row
            .try_get::<Option<String>, _>("joined_at")
            .unwrap_or(None),
    }))
}

/// POST /api/v1/workspaces/:workspace_id/transfer
/// Transfer ownership to another active member. Old owner becomes admin.
pub async fn transfer_ownership(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<TransferRequest>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner"]).await?;

    // Self-transfer guard (M3)
    if user.id == payload.new_owner_user_id {
        return Err(AppError::BadRequest(
            "Cannot transfer ownership to yourself.".to_string(),
        ));
    }

    // Ensure target is an active member
    let target = sqlx::query(
        r#"SELECT wm.role, wm.status, u.username
           FROM workspace_members wm
           JOIN users u ON u.id = wm.user_id
           WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.status = 'active'"#,
    )
    .bind(&workspace_id)
    .bind(&payload.new_owner_user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::BadRequest(
        "Target user is not an active member.".to_string(),
    ))?;

    let _status: String = target.try_get("status")?;
    let target_previous_role: String = target.try_get("role")?;
    let target_username: String = target.try_get("username")?;

    let mut tx = state.pool.begin().await?;

    // Old owner → admin
    sqlx::query(
        "UPDATE workspace_members SET role = 'admin' WHERE workspace_id = ? AND user_id = ?",
    )
    .bind(&workspace_id)
    .bind(&user.id)
    .execute(&mut *tx)
    .await?;

    // New owner → owner
    sqlx::query(
        "UPDATE workspace_members SET role = 'owner' WHERE workspace_id = ? AND user_id = ?",
    )
    .bind(&workspace_id)
    .bind(&payload.new_owner_user_id)
    .execute(&mut *tx)
    .await?;

    // Update workspaces.owner_user_id
    sqlx::query("UPDATE workspaces SET owner_user_id = ? WHERE id = ?")
        .bind(&payload.new_owner_user_id)
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    let session_id = super::extract_session_id(&headers);
    // Notify: old owner demoted to admin
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::MemberRoleChanged {
                workspace_id: workspace_id.clone(),
                user_id: user.id.clone(),
                username: user.username.clone(),
                previous_role: "owner".to_string(),
                new_role: "admin".to_string(),
            },
            session_id.as_deref(),
        )
        .await;

    // Notify: new owner promoted to owner
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::MemberRoleChanged {
                workspace_id: workspace_id.clone(),
                user_id: payload.new_owner_user_id.clone(),
                username: target_username,
                previous_role: target_previous_role,
                new_role: "owner".to_string(),
            },
            session_id.as_deref(),
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}
