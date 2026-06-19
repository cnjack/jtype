//! Admin server-settings endpoints.
//!
//! Currently exposes the object-storage configuration, which an operator can
//! edit through the admin UI. Saved values are persisted in `server_settings`
//! and override the `JTYPED_STORAGE_*` environment variables; a successful save
//! hot-swaps the live storage backend with no restart. Admin (full-scope)
//! sessions only.

use std::collections::HashMap;

use axum::{extract::State, http::HeaderMap, Json};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::mail;
use crate::middleware::auth::{extract_user, require_admin};
use crate::settings;
use crate::storage;
use crate::AppState;

/// Per-field provenance ("db" | "env" | "default") for the resolved storage
/// config, so the UI can show where each effective value comes from.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageSources {
    endpoint: String,
    bucket: String,
    access_key: String,
    secret_key: String,
    region: String,
    local_dir: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSettingsResponse {
    /// Backend selected by the current config: `"s3"` (endpoint set) or `"local"`.
    active_backend: String,
    endpoint: String,
    bucket: String,
    access_key: String,
    region: String,
    local_dir: String,
    /// The secret value is never returned — only whether one is set.
    secret_key_set: bool,
    sources: StorageSources,
}

fn build_response(map: &HashMap<String, String>) -> StorageSettingsResponse {
    let cfg = settings::resolve_storage_config(map);
    let active_backend = if cfg.endpoint.trim().is_empty() {
        "local"
    } else {
        "s3"
    };
    let src = |key: &str, env: &str| settings::source_of(map, key, env).as_str().to_string();
    StorageSettingsResponse {
        active_backend: active_backend.to_string(),
        secret_key_set: !cfg.secret_key.is_empty(),
        endpoint: cfg.endpoint,
        bucket: cfg.bucket,
        access_key: cfg.access_key,
        region: cfg.region,
        local_dir: cfg.local_dir,
        sources: StorageSources {
            endpoint: src(settings::STORAGE_ENDPOINT, settings::ENV_STORAGE_ENDPOINT),
            bucket: src(settings::STORAGE_BUCKET, settings::ENV_STORAGE_BUCKET),
            access_key: src(settings::STORAGE_ACCESS_KEY, settings::ENV_STORAGE_ACCESS_KEY),
            secret_key: src(settings::STORAGE_SECRET_KEY, settings::ENV_STORAGE_SECRET_KEY),
            region: src(settings::STORAGE_REGION, settings::ENV_STORAGE_REGION),
            local_dir: src(settings::STORAGE_LOCAL_DIR, settings::ENV_STORAGE_LOCAL_DIR),
        },
    }
}

/// GET /api/admin/settings/storage
pub async fn get_storage_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<StorageSettingsResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_admin(&user)?;

    let map = settings::load_map(&state.pool).await?;
    Ok(Json(build_response(&map)))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStorageSettings {
    endpoint: Option<String>,
    bucket: Option<String>,
    access_key: Option<String>,
    /// Leave unset or blank to keep the existing secret unchanged.
    secret_key: Option<String>,
    region: Option<String>,
    local_dir: Option<String>,
}

/// PUT /api/admin/settings/storage
///
/// A field present in the body is persisted. A NON-EMPTY value overrides the
/// environment; clearing a field (empty value) is treated as unset, so the
/// value falls back to the `JTYPED_STORAGE_*` env var then the built-in default
/// — an empty row no longer silently forces the local backend. The secret is
/// the exception: a blank secret keeps the stored one. The candidate backend is
/// built and connectivity-probed before anything is persisted or swapped, so a
/// bad config is rejected rather than breaking uploads.
pub async fn update_storage_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateStorageSettings>,
) -> Result<Json<StorageSettingsResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_admin(&user)?;

    // Light validation: an S3 endpoint must be an http(s) URL.
    if let Some(endpoint) = &payload.endpoint {
        let e = endpoint.trim();
        if !e.is_empty() && !(e.starts_with("http://") || e.starts_with("https://")) {
            return Err(AppError::BadRequest(
                "storage endpoint must start with http:// or https://".into(),
            ));
        }
    }

    // Collect the keys to persist. Non-secret fields are trimmed; the secret is
    // stored verbatim and only when a non-blank value is supplied.
    let mut pending: Vec<(&'static str, String)> = Vec::new();
    if let Some(v) = payload.endpoint.as_ref() {
        pending.push((settings::STORAGE_ENDPOINT, v.trim().to_string()));
    }
    if let Some(v) = payload.bucket.as_ref() {
        pending.push((settings::STORAGE_BUCKET, v.trim().to_string()));
    }
    if let Some(v) = payload.access_key.as_ref() {
        pending.push((settings::STORAGE_ACCESS_KEY, v.trim().to_string()));
    }
    if let Some(v) = payload.region.as_ref() {
        pending.push((settings::STORAGE_REGION, v.trim().to_string()));
    }
    if let Some(v) = payload.local_dir.as_ref() {
        pending.push((settings::STORAGE_LOCAL_DIR, v.trim().to_string()));
    }
    if let Some(secret) = payload.secret_key.as_ref() {
        if !secret.trim().is_empty() {
            pending.push((settings::STORAGE_SECRET_KEY, secret.clone()));
        }
    }

    // Compute the candidate config: current DB map with the pending changes
    // applied (env/default still fill any unset keys).
    let mut map = settings::load_map(&state.pool).await?;
    for (key, value) in &pending {
        map.insert((*key).to_string(), value.clone());
    }
    let cfg = settings::resolve_storage_config(&map);

    // Build and verify the backend BEFORE persisting or swapping.
    let candidate = storage::try_build(&cfg).map_err(AppError::BadRequest)?;
    storage::probe(&candidate)
        .await
        .map_err(|e| AppError::BadRequest(format!("storage connectivity check failed: {e}")))?;

    for (key, value) in &pending {
        settings::upsert(&state.pool, key, value).await?;
    }
    state.set_storage(candidate);

    let map = settings::load_map(&state.pool).await?;
    Ok(Json(build_response(&map)))
}

// ---------------------------------------------------------------------------
// SMTP (email) settings — mirrors the storage endpoints: DB overrides
// `JTYPED_SMTP_*` env vars, the password is never returned (only whether one
// is set), and a candidate transport is built + connectivity-probed before
// anything is persisted or hot-swapped.
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SmtpSources {
    host: String,
    port: String,
    username: String,
    password: String,
    from: String,
    encryption: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmtpSettingsResponse {
    /// Whether SMTP is configured (non-empty host).
    enabled: bool,
    host: String,
    port: u16,
    username: String,
    from: String,
    encryption: String,
    /// The password is never returned — only whether one is set.
    password_set: bool,
    sources: SmtpSources,
}

fn build_smtp_response(map: &HashMap<String, String>) -> SmtpSettingsResponse {
    let cfg = settings::resolve_smtp_config(map);
    let src = |key: &str, env: &str| settings::source_of(map, key, env).as_str().to_string();
    let enabled = !cfg.host.trim().is_empty();
    SmtpSettingsResponse {
        enabled,
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        from: cfg.from,
        encryption: cfg.encryption.as_str().to_string(),
        password_set: !cfg.password.is_empty(),
        sources: SmtpSources {
            host: src(settings::SMTP_HOST, settings::ENV_SMTP_HOST),
            port: src(settings::SMTP_PORT, settings::ENV_SMTP_PORT),
            username: src(settings::SMTP_USERNAME, settings::ENV_SMTP_USERNAME),
            password: src(settings::SMTP_PASSWORD, settings::ENV_SMTP_PASSWORD),
            from: src(settings::SMTP_FROM, settings::ENV_SMTP_FROM),
            encryption: src(settings::SMTP_ENCRYPTION, settings::ENV_SMTP_ENCRYPTION),
        },
    }
}

/// GET /api/admin/settings/smtp
pub async fn get_smtp_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<SmtpSettingsResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_admin(&user)?;
    let map = settings::load_map(&state.pool).await?;
    Ok(Json(build_smtp_response(&map)))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmtpSettings {
    host: Option<String>,
    port: Option<u16>,
    username: Option<String>,
    /// Leave unset or blank to keep the existing password unchanged.
    password: Option<String>,
    from: Option<String>,
    /// "starttls" | "tls" | "none"
    encryption: Option<String>,
}

/// PUT /api/admin/settings/smtp
///
/// Persists the supplied fields, then builds the candidate transport and probes
/// its SMTP handshake before committing or swapping. The password is the
/// exception: a blank password keeps the stored one. A bad config is rejected
/// rather than breaking password-reset emails.
pub async fn update_smtp_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateSmtpSettings>,
) -> Result<Json<SmtpSettingsResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_admin(&user)?;

    // Validate encryption if provided.
    let encryption_value = payload
        .encryption
        .as_deref()
        .map(|e| mail::Encryption::parse(e).as_str().to_string());

    let mut pending: Vec<(&'static str, String)> = Vec::new();
    if let Some(v) = payload.host.as_ref() {
        pending.push((settings::SMTP_HOST, v.trim().to_string()));
    }
    if let Some(v) = payload.port {
        pending.push((settings::SMTP_PORT, v.to_string()));
    }
    if let Some(v) = payload.username.as_ref() {
        pending.push((settings::SMTP_USERNAME, v.trim().to_string()));
    }
    if let Some(v) = payload.from.as_ref() {
        pending.push((settings::SMTP_FROM, v.trim().to_string()));
    }
    if let Some(v) = encryption_value {
        pending.push((settings::SMTP_ENCRYPTION, v));
    }
    if let Some(pw) = payload.password.as_ref() {
        if !pw.trim().is_empty() {
            pending.push((settings::SMTP_PASSWORD, pw.clone()));
        }
    }

    // Candidate config = current map with pending changes applied.
    let mut map = settings::load_map(&state.pool).await?;
    for (key, value) in &pending {
        map.insert((*key).to_string(), value.clone());
    }
    let cfg = settings::resolve_smtp_config(&map);

    // If a host is configured, build + probe before persisting. An empty host
    // disables mail (no probe needed).
    let candidate = if cfg.host.trim().is_empty() {
        None
    } else {
        let m = mail::try_build(&cfg).map_err(AppError::BadRequest)?;
        mail::probe(&m)
            .await
            .map_err(|e| AppError::BadRequest(format!("SMTP connection check failed: {e}")))?;
        Some(m)
    };

    for (key, value) in &pending {
        settings::upsert(&state.pool, key, value).await?;
    }
    state.set_mailer(candidate);

    let map = settings::load_map(&state.pool).await?;
    Ok(Json(build_smtp_response(&map)))
}
