use axum::{extract::State, http::HeaderMap, Json};
use sqlx::Row;

use crate::db::models::*;
use crate::error::AppError;
use crate::middleware::auth::extract_user;
use crate::AppState;

pub async fn get_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<ProfileResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let row = sqlx::query(
        r#"SELECT id, username, role, site_title,
                  display_name, email, disabled_at, storage_budget_bytes
           FROM users WHERE id = ?"#,
    )
    .bind(&user.id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(ProfileResponse {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        role: row.try_get("role")?,
        display_name: row.try_get("display_name").unwrap_or(None),
        email: row.try_get("email").unwrap_or(None),
        site_title: row.try_get("site_title")?,
        enabled: row
            .try_get::<Option<String>, _>("disabled_at")
            .unwrap_or(None)
            .is_none(),
        storage_budget_bytes: row.try_get("storage_budget_bytes").unwrap_or(1_073_741_824),
    }))
}

pub async fn update_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;

    if let Some(ref display_name) = payload.display_name {
        if display_name.len() > 255 {
            return Err(AppError::BadRequest("display name too long".to_string()));
        }
        sqlx::query("UPDATE users SET display_name = ? WHERE id = ?")
            .bind(display_name.trim())
            .bind(&user.id)
            .execute(&state.pool)
            .await?;
    }

    if let Some(ref email) = payload.email {
        if !email.is_empty() && !email.contains('@') {
            return Err(AppError::BadRequest("invalid email".to_string()));
        }
        let email_val = if email.is_empty() {
            None
        } else {
            Some(email.trim().to_ascii_lowercase())
        };
        sqlx::query("UPDATE users SET email = ? WHERE id = ?")
            .bind(&email_val)
            .bind(&user.id)
            .execute(&state.pool)
            .await?;
    }

    get_profile(State(state), headers).await
}

pub async fn update_site_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateSiteRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;

    if let Some(ref site_title) = payload.site_title {
        if site_title.trim().is_empty() || site_title.len() > 255 {
            return Err(AppError::BadRequest(
                "site title must be 1-255 chars".to_string(),
            ));
        }
        sqlx::query("UPDATE users SET site_title = ? WHERE id = ?")
            .bind(site_title.trim())
            .bind(&user.id)
            .execute(&state.pool)
            .await?;
    }

    get_profile(State(state), headers).await
}

pub async fn my_storage(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<StorageUsageResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;

    let budget: i64 = sqlx::query(
        "SELECT COALESCE(storage_budget_bytes, 1073741824) AS budget FROM users WHERE id = ?",
    )
    .bind(&user.id)
    .fetch_one(&state.pool)
    .await?
    .try_get("budget")?;

    let rows = sqlx::query(
        r#"SELECT w.id, w.name, w.storage_budget_bytes,
                   CAST(COALESCE(SUM(OCTET_LENGTH(d.content)), 0) AS SIGNED) AS used_bytes
           FROM workspaces w
           JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           LEFT JOIN documents d ON d.workspace_id = w.id
           GROUP BY w.id, w.name, w.storage_budget_bytes"#,
    )
    .bind(&user.id)
    .fetch_all(&state.pool)
    .await?;

    let mut total_used: i64 = 0;
    let workspaces: Vec<WorkspaceStorageItem> = rows
        .into_iter()
        .map(|row| {
            let used: i64 = row.try_get("used_bytes").unwrap_or(0);
            total_used += used;
            WorkspaceStorageItem {
                workspace_id: row.try_get("id").unwrap_or_default(),
                workspace_name: row.try_get("name").unwrap_or_default(),
                budget_bytes: row.try_get("storage_budget_bytes").unwrap_or(1_073_741_824),
                used_bytes: used,
            }
        })
        .collect();

    Ok(Json(StorageUsageResponse {
        total_budget_bytes: budget,
        total_used_bytes: total_used,
        workspaces,
    }))
}

pub async fn my_devices(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<DeviceInfo>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;

    let rows = sqlx::query(
        r#"SELECT sc.device_id, sc.workspace_id, w.name AS workspace_name,
                  sc.last_seen_clock, sc.updated_at
           FROM workspace_sync_cursors sc
           JOIN workspaces w ON w.id = sc.workspace_id
           JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           ORDER BY sc.updated_at DESC"#,
    )
    .bind(&user.id)
    .fetch_all(&state.pool)
    .await?;

    let devices = rows
        .into_iter()
        .map(|row| DeviceInfo {
            device_id: row.try_get("device_id").unwrap_or_default(),
            workspace_id: row.try_get("workspace_id").unwrap_or_default(),
            workspace_name: row.try_get("workspace_name").unwrap_or_default(),
            last_seen_clock: row.try_get("last_seen_clock").unwrap_or(0),
            updated_at: row.try_get::<String, _>("updated_at").unwrap_or_default(),
        })
        .collect();

    Ok(Json(devices))
}
