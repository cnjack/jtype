use axum::{
    extract::{Path, State},
    response::Html,
};
use sqlx::Row;

use crate::error::AppError;
use crate::util::markdown_to_html;
use crate::AppState;

#[derive(Debug, Clone)]
struct SiteDocument {
    relative_path: String,
    title: String,
    content: String,
}

pub async fn site_index(
    State(state): State<AppState>,
    Path(site_user): Path<String>,
) -> Result<Html<String>, AppError> {
    render_site(state, site_user, None).await
}

pub async fn site_page(
    State(state): State<AppState>,
    Path((site_user, page_path)): Path<(String, String)>,
) -> Result<Html<String>, AppError> {
    render_site(state, site_user, Some(page_path)).await
}

async fn render_site(
    state: AppState,
    site_user: String,
    page_path: Option<String>,
) -> Result<Html<String>, AppError> {
    let username = site_user;
    let user_row = sqlx::query("SELECT id, site_title FROM users WHERE username = ?")
        .bind(&username)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let user_id: String = user_row.try_get("id")?;
    let site_title: String = user_row.try_get("site_title")?;
    let docs = load_site_documents(&state.pool, &user_id).await?;
    if docs.is_empty() {
        return Ok(Html(site_shell(&site_title, &username, &[], "No published documents yet.", "")));
    }
    let selected = select_document(&docs, page_path.as_deref()).ok_or(AppError::NotFound)?;
    let body = markdown_to_html(&selected.content);
    Ok(Html(site_shell(&site_title, &username, &docs, &body, &selected.relative_path)))
}

async fn load_site_documents(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
) -> Result<Vec<SiteDocument>, AppError> {
    let rows = sqlx::query(
        r#"SELECT d.relative_path, d.title, d.content
           FROM documents d
           JOIN workspaces w ON w.id = d.workspace_id
           WHERE w.user_id = ? AND d.status <> 'draft'
           ORDER BY d.relative_path"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(SiteDocument {
                relative_path: row.try_get("relative_path")?,
                title: row.try_get("title")?,
                content: row.try_get("content")?,
            })
        })
        .collect()
}

fn select_document<'a>(docs: &'a [SiteDocument], page_path: Option<&str>) -> Option<&'a SiteDocument> {
    let Some(page_path) = page_path.filter(|v| !v.is_empty()) else {
        return docs.iter().find(|d| d.relative_path == "index.md").or_else(|| docs.first());
    };
    let normalized = page_path.trim_matches('/');
    let candidates = [
        normalized.to_string(),
        format!("{}.md", normalized),
        format!("{}/index.md", normalized),
    ];
    docs.iter().find(|d| candidates.iter().any(|c| c == &d.relative_path))
}

fn page_href(username: &str, relative_path: &str) -> String {
    let path = relative_path.trim_end_matches(".md").trim_end_matches("/index").trim_matches('/');
    if path == "index" || path.is_empty() {
        format!("/u/{}", username)
    } else {
        format!("/u/{}/{}", username, path)
    }
}

fn escape_html(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn site_shell(site_title: &str, username: &str, docs: &[SiteDocument], body: &str, active_path: &str) -> String {
    let nav = docs
        .iter()
        .map(|d| {
            let active = if d.relative_path == active_path { " active" } else { "" };
            format!(r#"<li><a class="nav-link{}" href="{}">{}</a></li>"#, active, page_href(username, &d.relative_path), escape_html(&d.title))
        })
        .collect::<Vec<_>>()
        .join("");

    format!(
        r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{}</title><style>{}</style></head><body><aside><div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div><div class="site-title">{}</div><nav><ul>{}</ul></nav></aside><main><article class="prose">{}</article></main></body></html>"#,
        escape_html(site_title), SITE_CSS, escape_html(site_title), nav, body
    )
}

const SITE_CSS: &str = r#"body{margin:0;background:#fafafa;color:#18181b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}aside{position:fixed;inset:0 auto 0 0;width:288px;overflow:auto;border-right:1px solid #e4e4e7;background:#fff;padding:24px}.brand{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-size:20px;font-weight:700;letter-spacing:-0.5px}.brand-bracket{color:#a1a1aa}.brand-j{color:#0F766E}.brand-type{color:#18181b}.site-title{margin-top:8px;font-weight:700;color:#18181b}nav{margin-top:32px}ul{list-style:none;margin:0;padding:0}.nav-link{display:block;border-radius:8px;padding:7px 10px;color:#52525b;text-decoration:none;font-size:14px}.nav-link:hover{background:#f4f4f5;color:#18181b}.nav-link.active{background:#ecfdf5;color:#047857;font-weight:700;box-shadow:inset 3px 0 0 #10b981}main{margin-left:336px;max-width:840px;padding:56px 40px}.prose{font-size:16px;line-height:1.75}.prose h1{font-size:40px;line-height:1.1;margin:0 0 28px}.prose h2{font-size:24px;margin:36px 0 12px}.prose h3{font-size:20px;margin:28px 0 10px}.prose p,.prose li{color:#3f3f46}.prose a{color:#047857}.prose pre{overflow:auto;border-radius:10px;background:#18181b;color:#f8fafc;padding:18px}.prose code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.prose :not(pre)>code{border-radius:5px;background:#f4f4f5;padding:2px 5px;color:#18181b}.prose blockquote{border-left:4px solid #10b981;margin-left:0;padding-left:16px;color:#52525b}.prose table{border-collapse:collapse;width:100%}.prose th,.prose td{border:1px solid #e4e4e7;padding:8px 10px;text-align:left}@media(max-width:800px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid #e4e4e7}main{margin-left:0;padding:32px 20px}.prose h1{font-size:32px}}"#;
