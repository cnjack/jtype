use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
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
                  COALESCE(m.role, 'owner') AS role,
                  COALESCE(w.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                  COUNT(d.id) AS document_count
           FROM workspaces w
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = w.id
           WHERE m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?
           GROUP BY w.id, w.name, w.slug, m.role, w.storage_budget_bytes
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
                role: row.try_get("role")?,
                document_count: row.try_get("document_count")?,
                storage_budget_bytes: row.try_get("storage_budget_bytes")?,
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

pub async fn get_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<WorkspaceSummary>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;
    Ok(Json(load_workspace_summary(&state.pool, &user.id, &workspace_id).await?))
}

pub async fn get_workspace_manifest(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<WorkspaceManifestResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;
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
    sqlx::query(
        r#"INSERT INTO workspace_invites (id, workspace_id, invited_by_user_id, email, role, token_hash)
           VALUES (?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&invite_id)
    .bind(&workspace_id)
    .bind(&user.id)
    .bind(payload.email.map(|v| v.trim().to_ascii_lowercase()))
    .bind(role)
    .bind(token_hash)
    .execute(&state.pool)
    .await?;
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
    Ok(Json(load_workspace_summary(&state.pool, &user.id, &workspace_id).await?))
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
    sqlx::query("INSERT INTO workspaces (id, user_id, owner_user_id, name, slug) VALUES (?, ?, ?, ?, ?)")
        .bind(&workspace_id)
        .bind(user_id)
        .bind(user_id)
        .bind(workspace_name)
        .bind(slug)
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
                  COALESCE(m.role, 'owner') AS role,
                  COALESCE(w.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                  COUNT(d.id) AS document_count
           FROM workspaces w
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = w.id
           WHERE w.id = ? AND (m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?)
           GROUP BY w.id, w.name, w.slug, m.role, w.storage_budget_bytes"#,
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
        role: row.try_get("role")?,
        document_count: row.try_get("document_count")?,
        storage_budget_bytes: row.try_get("storage_budget_bytes")?,
    })
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
