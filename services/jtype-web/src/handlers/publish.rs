use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;

// ── Themes ──────────────────────────────────────────────────────────────────

pub async fn list_themes() -> Json<Vec<crate::themes::ThemeInfo>> {
    Json(crate::themes::list_themes())
}

/// GET /api/themes/:theme_id — full spec for a built-in theme (used to seed a
/// custom theme from a preset). Unknown ids → 404.
pub async fn get_theme(
    Path(theme_id): Path<String>,
) -> Result<Json<crate::themes::ThemeSpec>, AppError> {
    crate::themes::builtin_spec(&theme_id)
        .map(Json)
        .ok_or(AppError::NotFound)
}

// ── Site settings ────────────────────────────────────────────────────────────

pub async fn get_site_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<SiteSettingsResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let site = ensure_site(&state.pool, &workspace_id).await?;
    Ok(Json(site))
}

pub async fn update_site_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<UpdateSiteSettingsRequest>,
) -> Result<Json<SiteSettingsResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin"],
    )
    .await?;

    if let Some(theme) = payload.theme.as_deref() {
        if !crate::themes::is_valid_theme(theme) {
            return Err(AppError::BadRequest(format!("unknown theme '{}'", theme)));
        }
    }

    // Validate + sanitise any custom theme before persisting. We store the
    // canonical sanitised spec so the column never holds unsafe values.
    let custom_theme_json: Option<String> = match &payload.custom_theme {
        Some(value) => {
            let raw = serde_json::to_string(value)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;
            let spec = crate::themes::ThemeSpec::from_custom_json(&raw)
                .map_err(|e| AppError::BadRequest(format!("invalid custom theme: {e}")))?;
            Some(serde_json::to_string(&spec).map_err(|e| AppError::Server(e.to_string()))?)
        }
        None => None,
    };

    ensure_site(&state.pool, &workspace_id).await?;

    sqlx::query(
        r#"UPDATE sites SET
             name        = COALESCE(?, name),
             footer_html = COALESCE(?, footer_html),
             theme       = COALESCE(?, theme),
             custom_theme = COALESCE(?, custom_theme)
           WHERE workspace_id = ?"#,
    )
    .bind(payload.name.as_deref())
    .bind(payload.footer_html.as_deref())
    .bind(payload.theme.as_deref())
    .bind(custom_theme_json.as_deref())
    .bind(&workspace_id)
    .execute(&state.pool)
    .await?;

    let site = load_site(&state.pool, &workspace_id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(site))
}

// ── Publish ──────────────────────────────────────────────────────────────────

pub async fn publish_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<Json<PublishDocumentResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let site = ensure_site(&state.pool, &workspace_id).await?;
    let session_id = super::extract_session_id(&headers);

    let doc_row = sqlx::query(
        r#"SELECT relative_path, title, content, content_hash,
                  COALESCE(current_version_id, id) AS version_id
           FROM documents WHERE id = ? AND workspace_id = ?"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let relative_path: String = doc_row.try_get("relative_path")?;
    let title: String = doc_row.try_get("title")?;
    let content: String = doc_row.try_get("content")?;
    let content_hash: String = doc_row.try_get("content_hash")?;
    let version_id: Option<String> = doc_row.try_get("version_id")?;

    let page_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO published_pages
             (id, site_id, workspace_id, document_id, relative_path, title, content, content_hash, version_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title        = VALUES(title),
             content      = VALUES(content),
             content_hash = VALUES(content_hash),
             version_id   = VALUES(version_id),
             updated_at   = CURRENT_TIMESTAMP"#,
    )
    .bind(&page_id)
    .bind(&site.id)
    .bind(&workspace_id)
    .bind(&document_id)
    .bind(&relative_path)
    .bind(&title)
    .bind(&content)
    .bind(&content_hash)
    .bind(&version_id)
    .execute(&state.pool)
    .await?;

    sqlx::query("UPDATE documents SET is_published = 1 WHERE id = ? AND workspace_id = ?")
        .bind(&document_id)
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::DocumentPublishChanged {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                relative_path: relative_path.clone(),
                document_id: document_id.clone(),
                is_published: true,
            },
            session_id.as_deref(),
        )
        .await;

    let published_at: String = sqlx::query(
        "SELECT DATE_FORMAT(published_at, '%Y-%m-%dT%H:%i:%sZ') AS ts FROM published_pages WHERE site_id = ? AND document_id = ?",
    )
    .bind(&site.id)
    .bind(&document_id)
    .fetch_one(&state.pool)
    .await?
    .try_get("ts")?;

    Ok(Json(PublishDocumentResponse {
        document_id,
        relative_path,
        title,
        content_hash,
        published_at,
        is_published: true,
    }))
}

pub async fn unpublish_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let session_id = super::extract_session_id(&headers);

    let relative_path_row = sqlx::query(
        "SELECT relative_path FROM documents WHERE id = ? AND workspace_id = ?",
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let relative_path: String = relative_path_row.try_get("relative_path")?;

    sqlx::query(
        r#"DELETE pp FROM published_pages pp
           JOIN sites s ON s.id = pp.site_id
           WHERE s.workspace_id = ? AND pp.document_id = ?"#,
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .execute(&state.pool)
    .await?;

    sqlx::query("UPDATE documents SET is_published = 0 WHERE id = ? AND workspace_id = ?")
        .bind(&document_id)
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::DocumentPublishChanged {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                relative_path,
                document_id: document_id.clone(),
                is_published: false,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_publish_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<Json<PublishStatusResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let doc_row = sqlx::query(
        "SELECT is_published, content_hash FROM documents WHERE id = ? AND workspace_id = ?",
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let is_published: bool = doc_row.try_get::<i8, _>("is_published").unwrap_or(0) != 0;
    let current_hash: String = doc_row.try_get("content_hash")?;

    let pub_row = sqlx::query(
        r#"SELECT pp.content_hash, DATE_FORMAT(pp.published_at, '%Y-%m-%dT%H:%i:%sZ') AS ts
           FROM published_pages pp
           JOIN sites s ON s.id = pp.site_id
           WHERE s.workspace_id = ? AND pp.document_id = ?"#,
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .fetch_optional(&state.pool)
    .await?;

    let (published_at, published_hash) = if let Some(row) = pub_row {
        let ts: String = row.try_get("ts")?;
        let hash: String = row.try_get("content_hash")?;
        (Some(ts), Some(hash))
    } else {
        (None, None)
    };

    let has_unpublished_changes = match &published_hash {
        Some(ph) => *ph != current_hash,
        None => false,
    };

    Ok(Json(PublishStatusResponse {
        document_id,
        is_published,
        published_at,
        current_hash,
        published_hash,
        has_unpublished_changes,
    }))
}

pub async fn list_published(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<PublishedPageItem>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT pp.id, pp.document_id, pp.relative_path, pp.title, pp.content_hash,
                  pp.version_id,
                  DATE_FORMAT(pp.published_at, '%Y-%m-%dT%H:%i:%sZ') AS published_at,
                  DATE_FORMAT(pp.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
           FROM published_pages pp
           JOIN sites s ON s.id = pp.site_id
           WHERE s.workspace_id = ?
           ORDER BY pp.relative_path"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let pages = rows
        .into_iter()
        .map(|row| {
            Ok(PublishedPageItem {
                id: row.try_get("id")?,
                document_id: row.try_get("document_id")?,
                relative_path: row.try_get("relative_path")?,
                title: row.try_get("title")?,
                content_hash: row.try_get("content_hash")?,
                version_id: row.try_get("version_id")?,
                published_at: row.try_get("published_at")?,
                updated_at: row.try_get("updated_at")?,
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;

    Ok(Json(pages))
}

pub async fn publish_batch(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<PublishBatchRequest>,
) -> Result<Json<PublishBatchResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let site = ensure_site(&state.pool, &workspace_id).await?;
    let mut published = Vec::new();
    let mut failed = Vec::new();

    for doc_id in &payload.document_ids {
        match do_publish_one(&state.pool, &site.id, &workspace_id, doc_id).await {
            Ok(resp) => published.push(resp),
            Err(_) => failed.push(doc_id.clone()),
        }
    }

    Ok(Json(PublishBatchResponse { published, failed }))
}

pub async fn preview(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<PreviewRequest>,
) -> Result<axum::response::Html<String>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let theme_id = payload.theme.as_deref().unwrap_or("default");
    if !crate::themes::is_valid_theme(theme_id) {
        return Err(AppError::BadRequest(format!("unknown theme '{}'", theme_id)));
    }
    let custom_json: Option<String> = match &payload.custom_theme {
        Some(v) => Some(serde_json::to_string(v).map_err(|e| AppError::BadRequest(e.to_string()))?),
        None => None,
    };
    let spec = crate::themes::resolve(theme_id, custom_json.as_deref());
    let content_html = crate::util::markdown_to_html(&payload.content);
    let title = extract_title(&payload.content).unwrap_or_else(|| "Preview".to_string());

    let page = crate::handlers::site::PageMeta {
        relative_path: "preview.md".to_string(),
        title: title.clone(),
        href: "#".to_string(),
    };
    let ctx = crate::themes::RenderContext {
        site_name: "Preview",
        footer_html: "",
        workspace_title: "Preview",
        workspace_slug: "preview",
        username: &user.username,
        pages: &[page.clone()],
        current_page: &page,
        content_html: &content_html,
    };

    Ok(axum::response::Html(crate::themes::render_page(&spec, &ctx)))
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async fn do_publish_one(
    pool: &sqlx::Pool<sqlx::MySql>,
    site_id: &str,
    workspace_id: &str,
    document_id: &str,
) -> Result<PublishDocumentResponse, AppError> {
    let row = sqlx::query(
        r#"SELECT relative_path, title, content, content_hash,
                  COALESCE(current_version_id, id) AS version_id
           FROM documents WHERE id = ? AND workspace_id = ?"#,
    )
    .bind(document_id)
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let relative_path: String = row.try_get("relative_path")?;
    let title: String = row.try_get("title")?;
    let content: String = row.try_get("content")?;
    let content_hash: String = row.try_get("content_hash")?;
    let version_id: Option<String> = row.try_get("version_id")?;

    let page_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO published_pages
             (id, site_id, workspace_id, document_id, relative_path, title, content, content_hash, version_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title        = VALUES(title),
             content      = VALUES(content),
             content_hash = VALUES(content_hash),
             version_id   = VALUES(version_id),
             updated_at   = CURRENT_TIMESTAMP"#,
    )
    .bind(&page_id)
    .bind(site_id)
    .bind(workspace_id)
    .bind(document_id)
    .bind(&relative_path)
    .bind(&title)
    .bind(&content)
    .bind(&content_hash)
    .bind(&version_id)
    .execute(pool)
    .await?;

    sqlx::query("UPDATE documents SET is_published = 1 WHERE id = ? AND workspace_id = ?")
        .bind(document_id)
        .bind(workspace_id)
        .execute(pool)
        .await?;

    let ts: String = sqlx::query(
        "SELECT DATE_FORMAT(published_at, '%Y-%m-%dT%H:%i:%sZ') AS ts FROM published_pages WHERE site_id = ? AND document_id = ?",
    )
    .bind(site_id)
    .bind(document_id)
    .fetch_one(pool)
    .await?
    .try_get("ts")?;

    Ok(PublishDocumentResponse {
        document_id: document_id.to_string(),
        relative_path,
        title,
        content_hash,
        published_at: ts,
        is_published: true,
    })
}

/// Lazy-create the site record for a workspace, return its settings.
pub async fn ensure_site(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
) -> Result<SiteSettingsResponse, AppError> {
    // Check if site already exists
    if let Some(site) = load_site(pool, workspace_id).await? {
        return Ok(site);
    }
    // Create
    let site_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT IGNORE INTO sites (id, workspace_id, name, theme) VALUES (?, ?, '', 'default')",
    )
    .bind(&site_id)
    .bind(workspace_id)
    .execute(pool)
    .await?;

    load_site(pool, workspace_id)
        .await?
        .ok_or(AppError::Server("failed to create site".to_string()))
}

async fn load_site(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
) -> Result<Option<SiteSettingsResponse>, AppError> {
    let row = sqlx::query(
        r#"SELECT id, workspace_id, name, footer_html, theme,
                  CAST(custom_theme AS CHAR) AS custom_theme,
                  DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                  DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
           FROM sites WHERE workspace_id = ?"#,
    )
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?;

    let Some(row) = row else { return Ok(None) };
    let custom_theme_str: Option<String> = row.try_get("custom_theme")?;
    let custom_theme = custom_theme_str.and_then(|s| serde_json::from_str(&s).ok());
    Ok(Some(SiteSettingsResponse {
        id: row.try_get("id")?,
        workspace_id: row.try_get("workspace_id")?,
        name: row.try_get("name")?,
        footer_html: row.try_get("footer_html")?,
        theme: row.try_get("theme")?,
        custom_theme,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    }))
}
