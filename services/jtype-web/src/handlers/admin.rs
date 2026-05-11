use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use sqlx::Row;

use crate::db::models::*;
use crate::error::AppError;
use crate::middleware::auth::{extract_user, require_admin};
use crate::AppState;

pub async fn list_users(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AdminUserResponse>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_admin(&user)?;

    let rows = sqlx::query(
        r#"SELECT u.id, u.username, u.role, u.site_title, u.display_name, u.email,
                  CASE WHEN u.disabled_at IS NULL THEN 1 ELSE 0 END AS is_enabled,
                  u.created_at,
                  COALESCE(u.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                  COUNT(DISTINCT wm.workspace_id) AS workspace_count,
                                     CAST(COALESCE(SUM(OCTET_LENGTH(d.content)), 0) AS SIGNED) AS storage_used_bytes
           FROM users u
           LEFT JOIN workspace_members wm ON wm.user_id = u.id AND wm.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = wm.workspace_id
           GROUP BY u.id, u.username, u.role, u.site_title, u.display_name, u.email,
                    u.disabled_at, u.created_at, u.storage_budget_bytes
           ORDER BY u.created_at ASC"#,
    )
    .fetch_all(&state.pool)
    .await?;

    let users = rows
        .into_iter()
        .map(|row| AdminUserResponse {
            id: row.try_get("id").unwrap_or_default(),
            username: row.try_get("username").unwrap_or_default(),
            role: row.try_get("role").unwrap_or_default(),
            site_title: row.try_get("site_title").unwrap_or_default(),
            display_name: row.try_get("display_name").unwrap_or(None),
            email: row.try_get("email").unwrap_or(None),
            enabled: row.try_get::<i8, _>("is_enabled").unwrap_or(1) != 0,
            workspace_count: row.try_get("workspace_count").unwrap_or(0),
            storage_used_bytes: row.try_get("storage_used_bytes").unwrap_or(0),
            storage_budget_bytes: row.try_get("storage_budget_bytes").unwrap_or(1_073_741_824),
            created_at: row.try_get::<String, _>("created_at").unwrap_or_default(),
        })
        .collect();

    Ok(Json(users))
}

pub async fn get_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<String>,
) -> Result<Json<AdminUserResponse>, AppError> {
    let caller = extract_user(&state.pool, &headers).await?;
    require_admin(&caller)?;

    let row = sqlx::query(
        r#"SELECT u.id, u.username, u.role, u.site_title, u.display_name, u.email,
                  CASE WHEN u.disabled_at IS NULL THEN 1 ELSE 0 END AS is_enabled,
                  u.created_at,
                  COALESCE(u.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                  COUNT(DISTINCT wm.workspace_id) AS workspace_count,
                   CAST(COALESCE(SUM(OCTET_LENGTH(d.content)), 0) AS SIGNED) AS storage_used_bytes
           FROM users u
           LEFT JOIN workspace_members wm ON wm.user_id = u.id AND wm.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = wm.workspace_id
           WHERE u.id = ?
           GROUP BY u.id, u.username, u.role, u.site_title, u.display_name, u.email,
                    u.disabled_at, u.created_at, u.storage_budget_bytes"#,
    )
    .bind(&user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(AdminUserResponse {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        role: row.try_get("role")?,
        site_title: row.try_get("site_title")?,
        display_name: row.try_get("display_name").unwrap_or(None),
        email: row.try_get("email").unwrap_or(None),
        enabled: row.try_get::<i8, _>("is_enabled").unwrap_or(1) != 0,
        workspace_count: row.try_get("workspace_count")?,
        storage_used_bytes: row.try_get("storage_used_bytes")?,
        storage_budget_bytes: row.try_get("storage_budget_bytes")?,
        created_at: row.try_get::<String, _>("created_at").unwrap_or_default(),
    }))
}

pub async fn update_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<String>,
    Json(payload): Json<AdminUpdateUserRequest>,
) -> Result<Json<AdminUserResponse>, AppError> {
    let caller = extract_user(&state.pool, &headers).await?;
    require_admin(&caller)?;

    // Prevent admin from disabling themselves
    if let Some(false) = payload.enabled {
        if user_id == caller.id {
            return Err(AppError::BadRequest("cannot disable yourself".to_string()));
        }
    }

    if let Some(ref role) = payload.role {
        let role = role.trim().to_ascii_lowercase();
        if role != "admin" && role != "user" {
            return Err(AppError::BadRequest(
                "role must be admin or user".to_string(),
            ));
        }
        sqlx::query("UPDATE users SET role = ? WHERE id = ?")
            .bind(&role)
            .bind(&user_id)
            .execute(&state.pool)
            .await?;
    }

    if let Some(enabled) = payload.enabled {
        if enabled {
            sqlx::query("UPDATE users SET disabled_at = NULL WHERE id = ?")
                .bind(&user_id)
                .execute(&state.pool)
                .await?;
        } else {
            sqlx::query("UPDATE users SET disabled_at = CURRENT_TIMESTAMP WHERE id = ? AND disabled_at IS NULL")
                .bind(&user_id)
                .execute(&state.pool)
                .await?;
        }
    }

    if let Some(budget) = payload.storage_budget_bytes {
        if budget < 0 {
            return Err(AppError::BadRequest(
                "budget must be non-negative".to_string(),
            ));
        }
        sqlx::query("UPDATE users SET storage_budget_bytes = ? WHERE id = ?")
            .bind(budget)
            .bind(&user_id)
            .execute(&state.pool)
            .await?;
    }

    get_user(State(state), headers, Path(user_id)).await
}

pub async fn list_workspaces(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AdminWorkspaceResponse>>, AppError> {
    let caller = extract_user(&state.pool, &headers).await?;
    require_admin(&caller)?;

    let rows = sqlx::query(
        r#"SELECT w.id, w.name,
                  COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) AS slug,
                  u.username AS owner_username,
                  COUNT(DISTINCT m.user_id) AS member_count,
                  COUNT(DISTINCT d.id) AS document_count,
                  COALESCE(w.storage_budget_bytes, 1073741824) AS storage_budget_bytes,
                                     CAST(COALESCE(SUM(OCTET_LENGTH(d.content)), 0) AS SIGNED) AS storage_used_bytes
           FROM workspaces w
           LEFT JOIN users u ON u.id = w.owner_user_id
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = w.id
           GROUP BY w.id, w.name, w.slug, u.username, w.storage_budget_bytes
           ORDER BY w.created_at DESC"#,
    )
    .fetch_all(&state.pool)
    .await?;

    let workspaces = rows
        .into_iter()
        .map(|row| AdminWorkspaceResponse {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            slug: row.try_get("slug").unwrap_or_default(),
            owner_username: row.try_get("owner_username").unwrap_or(None),
            member_count: row.try_get("member_count").unwrap_or(0),
            document_count: row.try_get("document_count").unwrap_or(0),
            storage_budget_bytes: row.try_get("storage_budget_bytes").unwrap_or(1_073_741_824),
            storage_used_bytes: row.try_get("storage_used_bytes").unwrap_or(0),
        })
        .collect();

    Ok(Json(workspaces))
}

pub async fn list_domains(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AdminDomainResponse>>, AppError> {
    let caller = extract_user(&state.pool, &headers).await?;
    require_admin(&caller)?;

    let rows = sqlx::query(
        r#"SELECT d.id, d.domain, u.username, d.status,
                  c.status AS ssl_status
           FROM custom_domains d
           JOIN users u ON u.id = d.user_id
           LEFT JOIN ssl_certificates c ON c.domain_id = d.id AND c.status = 'active'
           ORDER BY d.created_at ASC"#,
    )
    .fetch_all(&state.pool)
    .await?;

    let domains = rows
        .into_iter()
        .map(|row| AdminDomainResponse {
            id: row.try_get("id").unwrap_or_default(),
            domain: row.try_get("domain").unwrap_or_default(),
            username: row.try_get("username").unwrap_or_default(),
            status: row.try_get("status").unwrap_or_default(),
            ssl_status: row.try_get("ssl_status").unwrap_or(None),
        })
        .collect();

    Ok(Json(domains))
}

pub async fn stats(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminStatsResponse>, AppError> {
    let caller = extract_user(&state.pool, &headers).await?;
    require_admin(&caller)?;

    let users: i64 = sqlx::query("SELECT COUNT(*) AS c FROM users")
        .fetch_one(&state.pool)
        .await?
        .try_get("c")?;
    let workspaces: i64 = sqlx::query("SELECT COUNT(*) AS c FROM workspaces")
        .fetch_one(&state.pool)
        .await?
        .try_get("c")?;
    let documents: i64 = sqlx::query("SELECT COUNT(*) AS c FROM documents")
        .fetch_one(&state.pool)
        .await?
        .try_get("c")?;
    let storage: i64 =
        sqlx::query("SELECT CAST(COALESCE(SUM(OCTET_LENGTH(content)), 0) AS SIGNED) AS c FROM documents")
            .fetch_one(&state.pool)
            .await?
            .try_get("c")?;
    let domains: i64 = sqlx::query("SELECT COUNT(*) AS c FROM custom_domains")
        .fetch_one(&state.pool)
        .await?
        .try_get("c")?;

    Ok(Json(AdminStatsResponse {
        total_users: users,
        total_workspaces: workspaces,
        total_documents: documents,
        total_storage_bytes: storage,
        total_domains: domains,
    }))
}
