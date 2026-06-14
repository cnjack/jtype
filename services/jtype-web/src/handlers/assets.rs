//! Binary asset (image) endpoints.
//!
//! Bytes live in the object store (RustFS/S3/local); this module records
//! metadata and proxies public reads so the object store is never exposed to
//! clients directly. See `internal-docs/asset-storage/design.md`.

use axum::{
    body::{Body, Bytes},
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::Response,
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::AssetResponse;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::storage;
use crate::AppState;

/// Maximum accepted upload size (bytes).
pub const MAX_ASSET_BYTES: usize = 10 * 1024 * 1024;

fn asset_url(workspace_id: &str, asset_id: &str) -> String {
    format!("/assets/{}/{}", workspace_id, asset_id)
}

/// POST /api/v1/workspaces/:workspace_id/assets
///
/// Raw image bytes in the body; the type is sniffed from magic bytes (the
/// client Content-Type is not trusted). Optional `X-Filename` header records the
/// original name. Identical bytes (same sha256) within a workspace are deduped.
pub async fn upload_asset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    body: Bytes,
) -> Result<Json<AssetResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    if body.is_empty() {
        return Err(AppError::BadRequest("empty upload".into()));
    }
    if body.len() > MAX_ASSET_BYTES {
        return Err(AppError::BadRequest(format!(
            "asset exceeds the {} MB limit",
            MAX_ASSET_BYTES / (1024 * 1024)
        )));
    }
    let kind = storage::sniff_image(&body).ok_or_else(|| {
        AppError::BadRequest(
            "unsupported file type (allowed: png, jpeg, gif, webp, avif)".into(),
        )
    })?;

    let sha = crate::util::sha256_bytes(&body);
    let byte_size = body.len() as i64;
    let original_name = headers
        .get("x-filename")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.chars().take(255).collect::<String>())
        .filter(|s| !s.is_empty());

    // Dedupe: an identical upload in this workspace returns the existing asset.
    if let Some(existing) = find_existing(&state, &workspace_id, &sha).await? {
        return Ok(Json(existing));
    }

    let id = Uuid::new_v4().to_string();
    let storage_key = format!("assets/{}/{}.{}", workspace_id, sha, kind.ext);
    let store = state.storage();
    storage::put(&store, &storage_key, body).await?;

    let insert = sqlx::query(
        r#"INSERT INTO assets
             (id, workspace_id, storage_key, content_type, byte_size, sha256, original_name, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&storage_key)
    .bind(kind.content_type)
    .bind(byte_size)
    .bind(&sha)
    .bind(&original_name)
    .bind(&user.id)
    .execute(&state.pool)
    .await;

    if insert.is_err() {
        // Likely a concurrent upload of the same bytes hit the unique key —
        // return the row the other request created.
        if let Some(existing) = find_existing(&state, &workspace_id, &sha).await? {
            return Ok(Json(existing));
        }
        insert?;
    }

    let created_at: String = sqlx::query(
        "SELECT DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS ts FROM assets WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.pool)
    .await?
    .try_get("ts")?;

    Ok(Json(AssetResponse {
        url: asset_url(&workspace_id, &id),
        id,
        content_type: kind.content_type.to_string(),
        byte_size,
        original_name,
        created_at,
    }))
}

async fn find_existing(
    state: &AppState,
    workspace_id: &str,
    sha: &str,
) -> Result<Option<AssetResponse>, AppError> {
    let row = sqlx::query(
        r#"SELECT id, content_type, byte_size, original_name,
                  DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
           FROM assets WHERE workspace_id = ? AND sha256 = ?"#,
    )
    .bind(workspace_id)
    .bind(sha)
    .fetch_optional(&state.pool)
    .await?;
    let Some(row) = row else { return Ok(None) };
    let id: String = row.try_get("id")?;
    Ok(Some(AssetResponse {
        url: asset_url(workspace_id, &id),
        id,
        content_type: row.try_get("content_type")?,
        byte_size: row.try_get("byte_size")?,
        original_name: row.try_get("original_name")?,
        created_at: row.try_get("created_at")?,
    }))
}

/// GET /api/v1/workspaces/:workspace_id/assets
pub async fn list_assets(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<AssetResponse>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT id, content_type, byte_size, original_name,
                  DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
           FROM assets WHERE workspace_id = ?
           ORDER BY created_at DESC"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let assets = rows
        .into_iter()
        .map(|row| {
            let id: String = row.try_get("id")?;
            Ok(AssetResponse {
                url: asset_url(&workspace_id, &id),
                id,
                content_type: row.try_get("content_type")?,
                byte_size: row.try_get("byte_size")?,
                original_name: row.try_get("original_name")?,
                created_at: row.try_get("created_at")?,
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;
    Ok(Json(assets))
}

/// DELETE /api/v1/workspaces/:workspace_id/assets/:asset_id
pub async fn delete_asset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, asset_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let row = sqlx::query("SELECT storage_key FROM assets WHERE id = ? AND workspace_id = ?")
        .bind(&asset_id)
        .bind(&workspace_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let storage_key: String = row.try_get("storage_key")?;

    let store = state.storage();
    storage::delete(&store, &storage_key).await?;
    sqlx::query("DELETE FROM assets WHERE id = ? AND workspace_id = ?")
        .bind(&asset_id)
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// GET /assets/:workspace_id/:asset_id — public, proxies bytes from the object
/// store. The object store itself is never reachable by clients.
pub async fn serve_asset(
    State(state): State<AppState>,
    Path((workspace_id, asset_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let row = sqlx::query(
        "SELECT storage_key, content_type FROM assets WHERE id = ? AND workspace_id = ?",
    )
    .bind(&asset_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let storage_key: String = row.try_get("storage_key")?;
    let content_type: String = row.try_get("content_type")?;

    let store = state.storage();
    let bytes = storage::get(&store, &storage_key).await?;

    Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
        .header(header::X_CONTENT_TYPE_OPTIONS, "nosniff")
        .body(Body::from(bytes))
        .map_err(|e| AppError::Server(e.to_string()))
}
