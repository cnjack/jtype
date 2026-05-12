use axum::{
    extract::{Path, State},
    response::{Html, IntoResponse, Response},
};
use axum::http::header;
use sqlx::Row;

use crate::error::AppError;
use crate::util::markdown_to_html;
use crate::AppState;

/// Metadata about a single published page, used by themes.
#[derive(Debug, Clone)]
pub struct PageMeta {
    pub relative_path: String,
    pub title: String,
    pub href: String,
}

// ── Public route handlers ────────────────────────────────────────────────────

pub async fn user_site_index(
    State(state): State<AppState>,
    Path(site_user): Path<String>,
) -> Result<Response, AppError> {
    let username = load_username(&state, &site_user).await?;
    let workspaces = load_user_workspaces(&state, &username).await?;

    // Use default theme for user index
    let theme = crate::themes::get_theme("default");
    let html = theme.render_user_index(&username, &workspaces);
    Ok(Html(html).into_response())
}

pub async fn workspace_index(
    State(state): State<AppState>,
    Path((site_user, workspace_slug)): Path<(String, String)>,
) -> Result<Response, AppError> {
    render_workspace_site(state, site_user, workspace_slug, None, false).await
}

pub async fn workspace_page(
    State(state): State<AppState>,
    Path((site_user, workspace_slug, page_path)): Path<(String, String, String)>,
) -> Result<Response, AppError> {
    let raw = page_path.ends_with(".md");
    render_workspace_site(state, site_user, workspace_slug, Some(page_path), raw).await
}

// ── Core renderer ────────────────────────────────────────────────────────────

async fn render_workspace_site(
    state: AppState,
    site_user: String,
    workspace_slug: String,
    page_path: Option<String>,
    serve_raw: bool,
) -> Result<Response, AppError> {
    let username = load_username(&state, &site_user).await?;
    let (workspace_id, workspace_title, site_name, footer_html, theme_id) =
        load_workspace_site(&state, &username, &workspace_slug).await?;

    let pages = load_published_pages(&state, &workspace_id, &username, &workspace_slug).await?;

    if pages.is_empty() {
        let theme = crate::themes::get_theme(&theme_id);
        return Ok(Html(theme.render_workspace_index(
            &site_name,
            &footer_html,
            &username,
            &workspace_slug,
            &workspace_title,
            &[],
        ))
        .into_response());
    }

    let selected = select_page(&pages, page_path.as_deref()).ok_or(AppError::NotFound)?;

    if serve_raw {
        let content = load_page_content(&state, &workspace_id, &selected.relative_path).await?;
        return Ok((
            [(header::CONTENT_TYPE, "text/markdown; charset=utf-8")],
            content,
        )
            .into_response());
    }

    let content = load_page_content(&state, &workspace_id, &selected.relative_path).await?;
    let content_html = markdown_to_html(&content);

    let theme = crate::themes::get_theme(&theme_id);
    let ctx = crate::themes::RenderContext {
        site_name: &site_name,
        footer_html: &footer_html,
        workspace_title: &workspace_title,
        workspace_slug: &workspace_slug,
        username: &username,
        pages: &pages,
        current_page: selected,
        content_html: &content_html,
    };
    Ok(Html(theme.render_page(&ctx)).into_response())
}

// ── Data loaders ─────────────────────────────────────────────────────────────

async fn load_username(state: &AppState, username: &str) -> Result<String, AppError> {
    let row = sqlx::query("SELECT username FROM users WHERE username = ?")
        .bind(username)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(row.try_get("username")?)
}

/// Returns (workspace_id, workspace_title, site_name, footer_html, theme_id)
async fn load_workspace_site(
    state: &AppState,
    username: &str,
    workspace_slug: &str,
) -> Result<(String, String, String, String, String), AppError> {
    let row = sqlx::query(
        r#"SELECT w.id,
                  COALESCE(NULLIF(w.publish_title,''), w.name) AS workspace_title,
                  COALESCE(NULLIF(s.name,''), w.name) AS site_name,
                  COALESCE(s.footer_html, '') AS footer_html,
                  COALESCE(s.theme, 'default') AS theme
           FROM workspaces w
           JOIN users u ON u.id = w.owner_user_id
           LEFT JOIN sites s ON s.workspace_id = w.id
           WHERE u.username = ?
             AND COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', ' -'))) = ?
           LIMIT 1"#,
    )
    .bind(username)
    .bind(workspace_slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok((
        row.try_get("id")?,
        row.try_get("workspace_title")?,
        row.try_get("site_name")?,
        row.try_get("footer_html")?,
        row.try_get("theme")?,
    ))
}

async fn load_user_workspaces(
    state: &AppState,
    username: &str,
) -> Result<Vec<crate::themes::WorkspaceMeta>, AppError> {
    let rows = sqlx::query(
        r#"SELECT COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) AS slug,
                  COALESCE(NULLIF(w.publish_title,''), w.name) AS title,
                  COUNT(pp.id) AS page_count
           FROM workspaces w
           JOIN users u ON u.id = w.owner_user_id
           LEFT JOIN sites s ON s.workspace_id = w.id
           LEFT JOIN published_pages pp ON pp.site_id = s.id
           WHERE u.username = ?
           GROUP BY w.id, w.slug, w.name, w.publish_title
           HAVING page_count > 0
           ORDER BY w.updated_at DESC"#,
    )
    .bind(username)
    .fetch_all(&state.pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            let slug: String = row.try_get("slug")?;
            let href = format!("/u/{}/{}", username, slug);
            Ok(crate::themes::WorkspaceMeta {
                slug: slug.clone(),
                title: row.try_get("title")?,
                page_count: row.try_get("page_count")?,
                href,
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()
        .map_err(AppError::from)
}

async fn load_published_pages(
    state: &AppState,
    workspace_id: &str,
    username: &str,
    workspace_slug: &str,
) -> Result<Vec<PageMeta>, AppError> {
    let rows = sqlx::query(
        r#"SELECT pp.relative_path, pp.title
           FROM published_pages pp
           JOIN sites s ON s.id = pp.site_id
           WHERE s.workspace_id = ?
           ORDER BY pp.relative_path"#,
    )
    .bind(workspace_id)
    .fetch_all(&state.pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            let relative_path: String = row.try_get("relative_path")?;
            let title: String = row.try_get("title")?;
            let href = page_href(username, workspace_slug, &relative_path);
            Ok(PageMeta { relative_path, title, href })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()
        .map_err(AppError::from)
}

async fn load_page_content(
    state: &AppState,
    workspace_id: &str,
    relative_path: &str,
) -> Result<String, AppError> {
    let row = sqlx::query(
        r#"SELECT pp.content
           FROM published_pages pp
           JOIN sites s ON s.id = pp.site_id
           WHERE s.workspace_id = ? AND pp.relative_path = ?"#,
    )
    .bind(workspace_id)
    .bind(relative_path)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(row.try_get("content")?)
}

// ── Page selection ────────────────────────────────────────────────────────────

fn select_page<'a>(pages: &'a [PageMeta], page_path: Option<&str>) -> Option<&'a PageMeta> {
    let Some(page_path) = page_path.filter(|v| !v.is_empty()) else {
        return pages
            .iter()
            .find(|p| p.relative_path == "index.md")
            .or_else(|| pages.first());
    };
    let normalized = page_path
        .trim_start_matches('/')
        .trim_end_matches(".md");
    let candidates = [
        normalized.to_string(),
        format!("{}.md", normalized),
        format!("{}/index.md", normalized),
    ];
    pages
        .iter()
        .find(|p| candidates.iter().any(|c| c == &p.relative_path))
}

// ── Shared helpers ────────────────────────────────────────────────────────────

pub fn page_href(username: &str, workspace_slug: &str, relative_path: &str) -> String {
    let path = relative_path
        .trim_end_matches(".md")
        .trim_end_matches("/index")
        .trim_matches('/');
    if path == "index" || path.is_empty() {
        format!("/u/{}/{}", username, workspace_slug)
    } else {
        format!("/u/{}/{}/{}", username, workspace_slug, path)
    }
}
