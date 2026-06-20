use std::sync::OnceLock;
use std::time::{Duration, Instant};

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::Serialize;
use sqlx::Row;
use tokio::sync::Mutex;

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

// ── Version / update check ───────────────────────────────────────────────────

const RELEASE_REPO: &str = "cnjack/jtype";
const VERSION_CACHE_TTL: Duration = Duration::from_secs(3600);

/// What the running server build reports as its version. Docker stamps the
/// release tag in via `JTYPE_VERSION` at build time (see the Dockerfile); a
/// plain `cargo run` falls back to the crate version.
fn current_version() -> &'static str {
    option_env!("JTYPE_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"))
}

#[derive(Clone)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
    name: Option<String>,
    published_at: Option<String>,
    body: Option<String>,
}

struct CachedRelease {
    fetched_at: Instant,
    release: Option<GithubRelease>,
}

fn release_cache() -> &'static Mutex<Option<CachedRelease>> {
    static CACHE: OnceLock<Mutex<Option<CachedRelease>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminVersionResponse {
    /// Version the running server reports (release tag in prod, crate version in dev).
    current: String,
    /// Latest published release tag (without the leading `v`), if any.
    latest: Option<String>,
    update_available: bool,
    release_url: Option<String>,
    release_name: Option<String>,
    published_at: Option<String>,
    notes: Option<String>,
    /// Convenience `docker pull` target for the operator.
    image: String,
    /// Non-fatal note when the GitHub lookup failed (stale/empty data served).
    error: Option<String>,
}

pub async fn version_info(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminVersionResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_admin(&user)?;

    let current = current_version().to_string();
    let (release, error) = latest_release().await;

    let latest = release
        .as_ref()
        .map(|r| r.tag_name.trim_start_matches('v').to_string());
    let update_available = latest
        .as_deref()
        .map(|l| is_newer(l, &current))
        .unwrap_or(false);
    let image = format!("ghcr.io/{RELEASE_REPO}:{}", latest.as_deref().unwrap_or("latest"));

    Ok(Json(AdminVersionResponse {
        current,
        latest,
        update_available,
        release_url: release.as_ref().map(|r| r.html_url.clone()),
        release_name: release.as_ref().and_then(|r| r.name.clone()),
        published_at: release.as_ref().and_then(|r| r.published_at.clone()),
        notes: release.as_ref().and_then(|r| r.body.clone()),
        image,
        error,
    }))
}

/// Returns the latest release (cached for an hour) and a non-fatal error string
/// if the live lookup failed. A failed refresh serves the last good value when
/// one exists, so a flaky GitHub never breaks the admin page.
async fn latest_release() -> (Option<GithubRelease>, Option<String>) {
    let mut guard = release_cache().lock().await;
    if let Some(cached) = guard.as_ref() {
        if cached.fetched_at.elapsed() < VERSION_CACHE_TTL {
            return (cached.release.clone(), None);
        }
    }
    match fetch_latest_release().await {
        Ok(release) => {
            *guard = Some(CachedRelease {
                fetched_at: Instant::now(),
                release: release.clone(),
            });
            (release, None)
        }
        Err(e) => {
            let stale = guard.as_ref().and_then(|c| c.release.clone());
            (stale, Some(e))
        }
    }
}

async fn fetch_latest_release() -> Result<Option<GithubRelease>, String> {
    let client = reqwest::Client::builder()
        .user_agent("jtype-web")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("https://api.github.com/repos/{RELEASE_REPO}/releases/latest");
    let resp = client
        .get(&url)
        .header("accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("contacting GitHub: {e}"))?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None); // no published release yet
    }
    if !resp.status().is_success() {
        return Err(format!("GitHub API returned {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(Some(GithubRelease {
        tag_name: json["tag_name"].as_str().unwrap_or_default().to_string(),
        html_url: json["html_url"].as_str().unwrap_or_default().to_string(),
        name: json["name"].as_str().map(str::to_string),
        published_at: json["published_at"].as_str().map(str::to_string),
        body: json["body"].as_str().map(str::to_string),
    }))
}

/// Compares the dotted numeric core of two versions (ignoring any `-pre`/`+build`
/// suffix). Good enough for an "update available" hint.
fn parse_core(v: &str) -> (u64, u64, u64) {
    let core = v.trim_start_matches('v');
    let core = core.split(['-', '+']).next().unwrap_or(core);
    let mut it = core.split('.').map(|p| p.parse::<u64>().unwrap_or(0));
    (
        it.next().unwrap_or(0),
        it.next().unwrap_or(0),
        it.next().unwrap_or(0),
    )
}

fn is_newer(latest: &str, current: &str) -> bool {
    parse_core(latest) > parse_core(current)
}

#[cfg(test)]
mod version_tests {
    use super::{is_newer, parse_core};

    #[test]
    fn parses_and_compares_cores() {
        assert_eq!(parse_core("v0.2.8"), (0, 2, 8));
        assert_eq!(parse_core("0.2.0+abc1234"), (0, 2, 0));
        assert_eq!(parse_core("1.0.0-rc.1"), (1, 0, 0));
        assert!(is_newer("0.2.8", "0.2.0"));
        assert!(is_newer("v0.3.0", "0.2.9"));
        assert!(!is_newer("0.2.0", "0.2.0"));
        assert!(!is_newer("0.1.0", "0.2.0"));
        // A build-metadata suffix on the current version must not trip the check.
        assert!(is_newer("0.2.1", "0.2.0+deadbee"));
    }
}
