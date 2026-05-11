use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;

pub async fn list_workspaces(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<WorkspaceListResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let rows = sqlx::query(
        r#"SELECT w.id, w.name,
                  COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) AS slug,
                  COALESCE(w.publish_title, w.name) AS publish_title,
                  COALESCE(m.role, 'owner') AS role,
                  COALESCE(w.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                  COUNT(d.id) AS document_count,
                  CAST(COALESCE(SUM(OCTET_LENGTH(d.content)), 0) AS SIGNED) AS storage_used_bytes
           FROM workspaces w
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = w.id
           WHERE m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?
           GROUP BY w.id, w.name, w.slug, w.publish_title, m.role, w.storage_budget_bytes
           ORDER BY w.updated_at DESC"#,
    )
    .bind(&user.id)
    .bind(&user.id)
    .bind(&user.id)
    .fetch_all(&state.pool)
    .await?;

    let workspaces = rows
        .into_iter()
        .map(|row| {
            Ok(WorkspaceSummary {
                id: row.try_get("id")?,
                name: row.try_get("name")?,
                slug: row.try_get("slug")?,
                publish_title: row.try_get("publish_title")?,
                role: row.try_get("role")?,
                document_count: row.try_get("document_count")?,
                storage_budget_bytes: row.try_get("storage_budget_bytes")?,
                storage_used_bytes: row.try_get("storage_used_bytes")?,
            })
        })
        .collect::<Result<Vec<_>, AppError>>()?;

    Ok(Json(WorkspaceListResponse { workspaces }))
}

pub async fn create_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateWorkspaceRequest>,
) -> Result<Json<WorkspaceSummary>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let name = normalize_workspace_name(&payload.name)?;
    let mut tx = state.pool.begin().await?;
    let workspace_id = upsert_workspace(&mut tx, &user.id, &name).await?;
    let budget = payload.storage_budget_bytes.unwrap_or(1_073_741_824).max(0);
    sqlx::query("UPDATE workspaces SET storage_budget_bytes = ? WHERE id = ?")
        .bind(budget)
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    let summary = load_workspace_summary(&state.pool, &user.id, &workspace_id).await?;
    Ok(Json(summary))
}

pub async fn update_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<UpdateWorkspaceRequest>,
) -> Result<Json<WorkspaceSummary>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;

    if let Some(name) = payload.name.as_deref() {
        let name = normalize_workspace_name(name)?;
        sqlx::query("UPDATE workspaces SET name = ? WHERE id = ?")
            .bind(name)
            .bind(&workspace_id)
            .execute(&state.pool)
            .await?;
    }
    if let Some(title) = payload.publish_title.as_deref() {
        let title = title.trim();
        if title.is_empty() || title.len() > 255 {
            return Err(AppError::BadRequest(
                "publish title must be 1-255 chars".to_string(),
            ));
        }
        sqlx::query("UPDATE workspaces SET publish_title = ? WHERE id = ?")
            .bind(title)
            .bind(&workspace_id)
            .execute(&state.pool)
            .await?;
    }

    let summary = load_workspace_summary(&state.pool, &user.id, &workspace_id).await?;
    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::WorkspaceUpdated {
                workspace_id: workspace_id.clone(),
                name: summary.name.clone(),
                slug: summary.slug.clone(),
                publish_title: summary.publish_title.clone(),
            },
            session_id.as_deref(),
        )
        .await;
    Ok(Json(summary))
}

pub async fn get_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<WorkspaceSummary>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;
    Ok(Json(
        load_workspace_summary(&state.pool, &user.id, &workspace_id).await?,
    ))
}

pub async fn get_workspace_manifest(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<WorkspaceManifestResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;
    let rows = sqlx::query(
        r#"SELECT relative_path, title, status, content_hash,
                  COALESCE(current_version_id, id) AS version_id, updated_clock
           FROM documents WHERE workspace_id = ? ORDER BY relative_path"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;
    let documents = rows
        .into_iter()
        .map(|row| {
            Ok(ManifestDocument {
                relative_path: row.try_get("relative_path")?,
                title: row.try_get("title")?,
                status: row.try_get("status")?,
                content_hash: row.try_get("content_hash")?,
                version_id: row.try_get("version_id")?,
                updated_clock: row.try_get("updated_clock")?,
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;
    Ok(Json(WorkspaceManifestResponse {
        workspace_id,
        documents,
    }))
}

pub async fn create_invite(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<CreateInviteRequest>,
) -> Result<Json<InviteResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;
    let role = normalize_invite_role(payload.role.as_deref())?;
    let invite_id = Uuid::new_v4().to_string();
    let invite_token = random_token();
    let token_hash = sha256_hex(&invite_token);
    let email_normalized = payload.email.map(|v| v.trim().to_ascii_lowercase());
    sqlx::query(
        r#"INSERT INTO workspace_invites (id, workspace_id, invited_by_user_id, email, role, token_hash)
           VALUES (?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&invite_id)
    .bind(&workspace_id)
    .bind(&user.id)
    .bind(&email_normalized)
    .bind(role)
    .bind(token_hash)
    .execute(&state.pool)
    .await?;

    // Notify the invited user if they already have an account (M1)
    if let Some(ref email) = email_normalized {
        if let Ok(Some(ws)) = sqlx::query("SELECT name FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_optional(&state.pool)
            .await
        {
            let workspace_name: String = ws.try_get("name").unwrap_or_default();
            if let Ok(Some(invited)) = sqlx::query("SELECT id FROM users WHERE email = ?")
                .bind(email)
                .fetch_optional(&state.pool)
                .await
            {
                let invited_user_id: String = invited.try_get("id").unwrap_or_default();
                state
                    .hub
                    .publish_to_user(
                        &invited_user_id,
                        WorkspaceEvent::WorkspaceInvited {
                            workspace_id: workspace_id.clone(),
                            workspace_name,
                            role: role.to_string(),
                            invited_by_username: user.username.clone(),
                        },
                    )
                    .await;
            }
        }
    }

    Ok(Json(InviteResponse {
        invite_id,
        workspace_id,
        role: role.to_string(),
        invite_token,
    }))
}

pub async fn revoke_invite(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, invite_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;
    let result = sqlx::query(
        r#"UPDATE workspace_invites SET revoked_at = CURRENT_TIMESTAMP
           WHERE id = ? AND workspace_id = ? AND accepted_at IS NULL AND revoked_at IS NULL"#,
    )
    .bind(invite_id)
    .bind(workspace_id)
    .execute(&state.pool)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn accept_invite(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(invite_token): Path<String>,
) -> Result<Json<WorkspaceSummary>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let token_hash = sha256_hex(&invite_token);
    let invite = sqlx::query(
        r#"SELECT id, workspace_id, role FROM workspace_invites
           WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL"#,
    )
    .bind(token_hash)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let invite_id: String = invite.try_get("id")?;
    let workspace_id: String = invite.try_get("workspace_id")?;
    let role: String = invite.try_get("role")?;

    let mut tx = state.pool.begin().await?;
    sqlx::query(
        r#"INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at)
           VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', joined_at = CURRENT_TIMESTAMP"#,
    )
    .bind(&workspace_id)
    .bind(&user.id)
    .bind(&role)
    .execute(&mut *tx)
    .await?;
    sqlx::query("UPDATE workspace_invites SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(invite_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::MemberJoined {
                workspace_id: workspace_id.clone(),
                user_id: user.id.clone(),
                username: user.username.clone(),
                role: role.to_string(),
            },
            session_id.as_deref(),
        )
        .await;
    // Add workspace to all active sessions of the new member (H12)
    state
        .hub
        .add_workspace_to_user(&user.id, &workspace_id)
        .await;

    Ok(Json(
        load_workspace_summary(&state.pool, &user.id, &workspace_id).await?,
    ))
}

/// GET /api/v1/workspace-invites/:invite_token (no auth required)
/// Returns a preview of the invite: workspace name, inviter, role, status.
pub async fn preview_invite(
    State(state): State<AppState>,
    Path(invite_token): Path<String>,
) -> Result<Json<InvitePreviewResponse>, AppError> {
    let token_hash = sha256_hex(&invite_token);
    let row = sqlx::query(
        r#"SELECT wi.role,
                  wi.accepted_at,
                  wi.revoked_at,
                  w.name AS workspace_name,
                  u.username AS invited_by_username
           FROM workspace_invites wi
           JOIN workspaces w ON w.id = wi.workspace_id
           JOIN users u ON u.id = wi.invited_by_user_id
           WHERE wi.token_hash = ?"#,
    )
    .bind(token_hash)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let role: String = row.try_get("role")?;
    let workspace_name: String = row.try_get("workspace_name")?;
    let invited_by_username: String = row.try_get("invited_by_username")?;
    let accepted_at: Option<String> = row.try_get("accepted_at").unwrap_or(None);
    let revoked_at: Option<String> = row.try_get("revoked_at").unwrap_or(None);

    let status = if revoked_at.is_some() {
        "revoked".to_string()
    } else if accepted_at.is_some() {
        "accepted".to_string()
    } else {
        "pending".to_string()
    };

    Ok(Json(InvitePreviewResponse {
        workspace_name,
        invited_by_username,
        role,
        status,
    }))
}

/// GET /api/v1/workspaces/:workspace_id/invites
/// Lists pending invites for the workspace. Requires owner or admin.
pub async fn list_invites(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<InviteListItem>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;

    let rows = sqlx::query(
        r#"SELECT id, email, role, accepted_at, revoked_at,
                  CAST(created_at AS CHAR) AS created_at
           FROM workspace_invites
           WHERE workspace_id = ? AND accepted_at IS NULL AND revoked_at IS NULL
           ORDER BY created_at DESC"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let invites = rows
        .into_iter()
        .map(|row| {
            Ok(InviteListItem {
                invite_id: row.try_get("id")?,
                email: row.try_get("email")?,
                role: row.try_get("role")?,
                status: "pending".to_string(),
                created_at: row.try_get::<Option<String>, _>("created_at")?.unwrap_or_default(),
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;

    Ok(Json(invites))
}

// ── Helpers ──

pub async fn upsert_workspace(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    user_id: &str,
    workspace_name: &str,
) -> Result<String, AppError> {
    if let Some(row) = sqlx::query("SELECT id FROM workspaces WHERE user_id = ? AND name = ?")
        .bind(user_id)
        .bind(workspace_name)
        .fetch_optional(&mut **tx)
        .await?
    {
        return Ok(row.try_get("id")?);
    }
    let workspace_id = Uuid::new_v4().to_string();
    let slug = slugify(workspace_name);
    sqlx::query("INSERT INTO workspaces (id, user_id, owner_user_id, name, slug, publish_title) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&workspace_id)
        .bind(user_id)
        .bind(user_id)
        .bind(workspace_name)
        .bind(slug)
        .bind(workspace_name)
        .execute(&mut **tx)
        .await?;
    sqlx::query(
        r#"INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at)
           VALUES (?, ?, 'owner', 'active', CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE role = 'owner', status = 'active'"#,
    )
    .bind(&workspace_id)
    .bind(user_id)
    .execute(&mut **tx)
    .await?;
    Ok(workspace_id)
}

pub async fn load_workspace_summary(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
    workspace_id: &str,
) -> Result<WorkspaceSummary, AppError> {
    let row = sqlx::query(
        r#"SELECT w.id, w.name,
                  COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) AS slug,
                  COALESCE(w.publish_title, w.name) AS publish_title,
                  COALESCE(m.role, 'owner') AS role,
                  COALESCE(w.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                  COUNT(d.id) AS document_count,
                  CAST(COALESCE(SUM(OCTET_LENGTH(d.content)), 0) AS SIGNED) AS storage_used_bytes
           FROM workspaces w
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = w.id
           WHERE w.id = ? AND (m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?)
           GROUP BY w.id, w.name, w.slug, w.publish_title, m.role, w.storage_budget_bytes"#,
    )
    .bind(user_id)
    .bind(workspace_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(WorkspaceSummary {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        slug: row.try_get("slug")?,
        publish_title: row.try_get("publish_title")?,
        role: row.try_get("role")?,
        document_count: row.try_get("document_count")?,
        storage_budget_bytes: row.try_get("storage_budget_bytes")?,
        storage_used_bytes: row.try_get("storage_used_bytes")?,
    })
}

/// DELETE /api/v1/workspaces/:workspace_id
/// Only the workspace owner can delete a workspace. CASCADE cleans all related data.
pub async fn delete_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner"]).await?;

    sqlx::query("DELETE FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::WorkspaceDeleted {
                workspace_id: workspace_id.clone(),
            },
            session_id.as_deref(),
        )
        .await;
    // Kick all active sessions from this workspace (H9)
    state.hub.kick_all_from_workspace(&workspace_id).await;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn require_workspace_role(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    user_id: &str,
    allowed: &[&str],
) -> Result<String, AppError> {
    let row = sqlx::query(
        r#"SELECT COALESCE(m.role, 'owner') AS role
           FROM workspaces w
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           WHERE w.id = ? AND (m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?)"#,
    )
    .bind(user_id)
    .bind(workspace_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let role: String = row.try_get("role")?;
    if allowed.iter().any(|r| *r == role) {
        Ok(role)
    } else {
        Err(AppError::Forbidden)
    }
}
