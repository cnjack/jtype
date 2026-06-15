//! Path-keyed binary blob endpoints.
//!
//! Unlike `assets` (UUID/sha-keyed, image-only, for the web editor), blobs are
//! keyed by vault `relative_path` so desktop clients sync binary files (images,
//! PDFs, anything) the same way they sync markdown documents. Bytes live in the
//! object store; `document_blobs` is the metadata + sync-clock index. Reads are
//! proxied so the object store is never exposed to clients directly.

use axum::{
    body::{Body, Bytes},
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::Response,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::error::AppError;
use crate::handlers::document::next_workspace_clock;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::storage;
use crate::AppState;

/// Maximum accepted blob size (bytes). Larger than images since PDFs sync here.
pub const MAX_BLOB_BYTES: usize = 25 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobManifestEntry {
    pub relative_path: String,
    pub sha256: String,
    pub byte_size: i64,
    pub content_type: String,
    pub updated_clock: i64,
    pub deleted_clock: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobUploadResponse {
    pub relative_path: String,
    pub sha256: String,
    pub byte_size: i64,
    pub updated_clock: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBlobsQuery {
    #[serde(default)]
    pub since_clock: i64,
}

/// Reject paths that could escape the vault or are malformed. Mirrors the
/// jtype-core `safe_join` invariants on the server side.
fn sanitize_relative_path(raw: &str) -> Result<String, AppError> {
    let rel = raw.trim_start_matches('/');
    if rel.is_empty()
        || rel.contains('\0')
        || rel.split('/').any(|seg| seg == ".." || seg.is_empty())
    {
        return Err(AppError::BadRequest("invalid relative path".into()));
    }
    Ok(rel.to_string())
}

/// Content-type is derived purely from the vault path extension — the
/// client-supplied `Content-Type` header is intentionally ignored. Trusting it
/// would let an editor store `text/html` (or any script-bearing type) against
/// an innocuous path and have `download_blob` echo it back. Blobs always carry
/// their real extension (they're synced vault files), so the extension is the
/// authoritative, safe source of truth.
fn content_type_for(relative_path: &str) -> String {
    let ext = relative_path.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
    .to_string()
}

/// POST /api/v1/workspaces/:workspace_id/blobs/*relative_path
/// Raw bytes in the body. Idempotent: re-uploading identical bytes to the same
/// path is a no-op (returns the existing clock).
pub async fn upload_blob(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, relative_path)): Path<(String, String)>,
    body: Bytes,
) -> Result<Json<BlobUploadResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let relative_path = sanitize_relative_path(&relative_path)?;
    if body.is_empty() {
        return Err(AppError::BadRequest("empty upload".into()));
    }
    if body.len() > MAX_BLOB_BYTES {
        return Err(AppError::BadRequest(format!(
            "blob exceeds the {} MB limit",
            MAX_BLOB_BYTES / (1024 * 1024)
        )));
    }

    let sha = crate::util::sha256_bytes(&body);
    let byte_size = body.len() as i64;
    let content_type = content_type_for(&relative_path);

    // No-op if the same bytes already live at this path (and it's not tombstoned).
    let existing: Option<(String, Option<i64>, i64)> = sqlx::query(
        "SELECT sha256, deleted_clock, updated_clock FROM document_blobs WHERE workspace_id = ? AND relative_path = ?",
    )
    .bind(&workspace_id)
    .bind(&relative_path)
    .fetch_optional(&state.pool)
    .await?
    .map(|row| {
        Ok::<_, sqlx::Error>((
            row.try_get("sha256")?,
            row.try_get("deleted_clock")?,
            row.try_get("updated_clock")?,
        ))
    })
    .transpose()?;
    if let Some((existing_sha, deleted_clock, updated_clock)) = &existing {
        if existing_sha == &sha && deleted_clock.is_none() {
            return Ok(Json(BlobUploadResponse {
                relative_path,
                sha256: sha,
                byte_size,
                updated_clock: *updated_clock,
            }));
        }
    }

    // Bytes are content-addressed (shared across paths/versions); writing the
    // same key twice is harmless and keeps reads valid for any referencing row.
    let storage_key = format!("blobs/{}/{}", workspace_id, sha);
    let store = state.storage();
    storage::put(&store, &storage_key, body).await?;

    let mut tx = state.pool.begin().await?;
    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    sqlx::query(
        r#"INSERT INTO document_blobs
             (workspace_id, relative_path, storage_key, content_type, byte_size, sha256, updated_clock, deleted_clock, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
           ON DUPLICATE KEY UPDATE
             storage_key = VALUES(storage_key),
             content_type = VALUES(content_type),
             byte_size = VALUES(byte_size),
             sha256 = VALUES(sha256),
             updated_clock = VALUES(updated_clock),
             deleted_clock = NULL"#,
    )
    .bind(&workspace_id)
    .bind(&relative_path)
    .bind(&storage_key)
    .bind(&content_type)
    .bind(byte_size)
    .bind(&sha)
    .bind(next_clock)
    .bind(&user.id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(Json(BlobUploadResponse {
        relative_path,
        sha256: sha,
        byte_size,
        updated_clock: next_clock,
    }))
}

/// GET /api/v1/workspaces/:workspace_id/blobs — manifest of blobs (including
/// tombstones) with updated_clock > since_clock, so clients can reconcile.
pub async fn list_blobs(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Query(query): Query<ListBlobsQuery>,
) -> Result<Json<Vec<BlobManifestEntry>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT relative_path, sha256, byte_size, content_type, updated_clock, deleted_clock
           FROM document_blobs
           WHERE workspace_id = ? AND updated_clock > ?
           ORDER BY updated_clock ASC"#,
    )
    .bind(&workspace_id)
    .bind(query.since_clock)
    .fetch_all(&state.pool)
    .await?;

    let entries = rows
        .into_iter()
        .map(|row| {
            Ok(BlobManifestEntry {
                relative_path: row.try_get("relative_path")?,
                sha256: row.try_get("sha256")?,
                byte_size: row.try_get("byte_size")?,
                content_type: row.try_get("content_type")?,
                updated_clock: row.try_get("updated_clock")?,
                deleted_clock: row.try_get("deleted_clock")?,
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;
    Ok(Json(entries))
}

/// GET /api/v1/workspaces/:workspace_id/blobs/*relative_path — proxy bytes.
pub async fn download_blob(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, relative_path)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;
    let relative_path = sanitize_relative_path(&relative_path)?;

    let row = sqlx::query(
        "SELECT storage_key, content_type FROM document_blobs WHERE workspace_id = ? AND relative_path = ? AND deleted_clock IS NULL",
    )
    .bind(&workspace_id)
    .bind(&relative_path)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let storage_key: String = row.try_get("storage_key")?;
    let content_type: String = row.try_get("content_type")?;

    let store = state.storage();
    let bytes = storage::get(&store, &storage_key).await?;

    // Force a download rather than inline rendering. Blobs include SVG (and the
    // store will hold whatever bytes an editor uploaded), so serving inline on
    // the app origin would be a stored-XSS vector — exactly what the asset store
    // guards against by excluding SVG (see storage::sniff_image). The desktop
    // sync client reads the body bytes directly and ignores this header.
    Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_DISPOSITION, "attachment")
        .header(header::CACHE_CONTROL, "private, max-age=3600")
        .header(header::X_CONTENT_TYPE_OPTIONS, "nosniff")
        .body(Body::from(bytes))
        .map_err(|e| AppError::Server(e.to_string()))
}

/// DELETE /api/v1/workspaces/:workspace_id/blobs/*relative_path — tombstone so
/// the deletion propagates to other devices via the manifest. The content-
/// addressed bytes are intentionally left in storage (may be shared).
pub async fn delete_blob(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, relative_path)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;
    let relative_path = sanitize_relative_path(&relative_path)?;

    let mut tx = state.pool.begin().await?;
    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    let result = sqlx::query(
        "UPDATE document_blobs SET deleted_clock = ?, updated_clock = ? WHERE workspace_id = ? AND relative_path = ? AND deleted_clock IS NULL",
    )
    .bind(next_clock)
    .bind(next_clock)
    .bind(&workspace_id)
    .bind(&relative_path)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    if result.rows_affected() == 0 {
        return Ok(StatusCode::NO_CONTENT);
    }
    Ok(StatusCode::NO_CONTENT)
}
