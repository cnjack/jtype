use axum::{
    extract::{Path, State},
    response::Html,
};
use sqlx::Row;

use crate::error::AppError;
use crate::util::markdown_to_html;
use crate::AppState;

#[derive(Debug, Clone)]
struct SiteWorkspace {
    slug: String,
    publish_title: String,
    document_count: i64,
}

#[derive(Debug, Clone)]
struct SiteDocument {
    relative_path: String,
    title: String,
    content: String,
}

pub async fn user_site_index(
    State(state): State<AppState>,
    Path(site_user): Path<String>,
) -> Result<Html<String>, AppError> {
    let (user_id, username) = load_user(&state, &site_user).await?;
    let workspaces = load_published_workspaces(&state.pool, &user_id).await?;
    Ok(Html(workspace_index_shell(&username, &workspaces)))
}

pub async fn workspace_index(
    State(state): State<AppState>,
    Path((site_user, workspace_slug)): Path<(String, String)>,
) -> Result<Html<String>, AppError> {
    render_workspace_site(state, site_user, workspace_slug, None).await
}

pub async fn workspace_page(
    State(state): State<AppState>,
    Path((site_user, workspace_slug, page_path)): Path<(String, String, String)>,
) -> Result<Html<String>, AppError> {
    render_workspace_site(state, site_user, workspace_slug, Some(page_path)).await
}

async fn render_workspace_site(
    state: AppState,
    site_user: String,
    workspace_slug: String,
    page_path: Option<String>,
) -> Result<Html<String>, AppError> {
    let (user_id, username) = load_user(&state, &site_user).await?;
    let workspace = load_workspace(&state.pool, &user_id, &workspace_slug).await?;
    let docs = load_site_documents(&state.pool, &user_id, &workspace.slug).await?;
    if docs.is_empty() {
        return Ok(Html(site_shell(
            &workspace.publish_title,
            &username,
            &workspace.slug,
            &[],
            "No published documents yet.",
            "",
        )));
    }
    let selected = select_document(&docs, page_path.as_deref()).ok_or(AppError::NotFound)?;
    let body = prepare_mermaid_in_html(&markdown_to_html(&selected.content));
    Ok(Html(site_shell(
        &workspace.publish_title,
        &username,
        &workspace.slug,
        &docs,
        &body,
        &selected.relative_path,
    )))
}

async fn load_user(state: &AppState, username: &str) -> Result<(String, String), AppError> {
    let row = sqlx::query("SELECT id, username FROM users WHERE username = ?")
        .bind(username)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok((row.try_get("id")?, row.try_get("username")?))
}

async fn load_published_workspaces(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
) -> Result<Vec<SiteWorkspace>, AppError> {
    let rows = sqlx::query(
        r#"SELECT COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) AS slug,
                  COALESCE(w.publish_title, w.name) AS publish_title,
                  COUNT(d.id) AS document_count
           FROM workspaces w
           JOIN documents d ON d.workspace_id = w.id AND d.status = 'published'
           WHERE w.user_id = ? OR w.owner_user_id = ?
           GROUP BY w.id, w.slug, w.name, w.publish_title
           ORDER BY w.updated_at DESC"#,
    )
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(SiteWorkspace {
                slug: row.try_get("slug")?,
                publish_title: row.try_get("publish_title")?,
                document_count: row.try_get("document_count")?,
            })
        })
        .collect()
}

async fn load_workspace(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
    slug: &str,
) -> Result<SiteWorkspace, AppError> {
    let row = sqlx::query(
        r#"SELECT COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) AS slug,
                  COALESCE(w.publish_title, w.name) AS publish_title,
                  COUNT(d.id) AS document_count
           FROM workspaces w
           LEFT JOIN documents d ON d.workspace_id = w.id AND d.status = 'published'
           WHERE (w.user_id = ? OR w.owner_user_id = ?)
             AND COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) = ?
           GROUP BY w.id, w.slug, w.name, w.publish_title"#,
    )
    .bind(user_id)
    .bind(user_id)
    .bind(slug)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(SiteWorkspace {
        slug: row.try_get("slug")?,
        publish_title: row.try_get("publish_title")?,
        document_count: row.try_get("document_count")?,
    })
}

async fn load_site_documents(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
    workspace_slug: &str,
) -> Result<Vec<SiteDocument>, AppError> {
    let rows = sqlx::query(
        r#"SELECT d.relative_path, d.title, d.content
           FROM documents d
           JOIN workspaces w ON w.id = d.workspace_id
           WHERE (w.user_id = ? OR w.owner_user_id = ?)
             AND COALESCE(w.slug, LOWER(REPLACE(w.name, ' ', '-'))) = ?
             AND d.status = 'published'
           ORDER BY d.relative_path"#,
    )
    .bind(user_id)
    .bind(user_id)
    .bind(workspace_slug)
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

fn page_href(username: &str, workspace_slug: &str, relative_path: &str) -> String {
    let path = relative_path.trim_end_matches(".md").trim_end_matches("/index").trim_matches('/');
    if path == "index" || path.is_empty() {
        format!("/u/{}/{}", username, workspace_slug)
    } else {
        format!("/u/{}/{}/{}", username, workspace_slug, path)
    }
}

fn prepare_mermaid_in_html(html: &str) -> String {
    html.replace(
        "<pre><code class=\"language-mermaid\">",
        "<div class=\"mermaid\">",
    )
    .replace("</code></pre>", "</div>")
}

fn escape_html(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn workspace_index_shell(username: &str, workspaces: &[SiteWorkspace]) -> String {
    let body = if workspaces.is_empty() {
        "<p>No published workspaces yet.</p>".to_string()
    } else {
        workspaces
            .iter()
            .map(|w| {
                format!(
                    r#"<a class="workspace-card" href="/u/{}/{}"><strong>{}</strong><span>{} published pages</span></a>"#,
                    escape_html(username),
                    escape_html(&w.slug),
                    escape_html(&w.publish_title),
                    w.document_count
                )
            })
            .collect::<Vec<_>>()
            .join("")
    };
    format!(
        r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{}</title><style>{}</style></head><body><main class="workspace-index"><div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div><h1>{}</h1><div class="workspace-grid">{}</div></main></body></html>"#,
        escape_html(username),
        SITE_CSS,
        escape_html(username),
        body
    )
}

fn site_shell(site_title: &str, username: &str, workspace_slug: &str, docs: &[SiteDocument], body: &str, active_path: &str) -> String {
    let nav = docs
        .iter()
        .map(|d| {
            let active = if d.relative_path == active_path { " active" } else { "" };
            format!(
                r#"<li><a class="nav-link{}" href="{}">{}</a></li>"#,
                active,
                page_href(username, workspace_slug, &d.relative_path),
                escape_html(&d.title)
            )
        })
        .collect::<Vec<_>>()
        .join("");

    format!(
        r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{}</title><style>{}</style><script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({{startOnLoad:true,securityLevel:'strict',theme:'neutral'}});</script></head><body><aside><div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div><div class="site-title">{}</div><nav><ul>{}</ul></nav></aside><main><article class="prose">{}</article></main></body></html>"#,
        escape_html(site_title), SITE_CSS, escape_html(site_title), nav, body
    )
}

const SITE_CSS: &str = r#"body{margin:0;background:#fbfdfb;color:#18181b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}aside{position:fixed;inset:0 auto 0 0;width:288px;overflow:auto;border-right:1px solid rgba(13,13,12,.06);background:#f7faf8;padding:24px}.brand{font-family:'Arial Black','Segoe UI',Arial,sans-serif;font-size:20px;font-weight:900}.brand-bracket{color:#8d939d}.brand-j{color:#008884}.brand-type{color:#0d0d0c}.site-title{margin-top:18px;font-weight:800;color:#18181b}nav{margin-top:32px}ul{list-style:none;margin:0;padding:0}.nav-link{display:block;border-radius:12px;padding:8px 10px;color:#52615c;text-decoration:none;font-size:14px}.nav-link:hover{background:#fff;color:#18181b}.nav-link.active{background:#e8f6f2;color:#006f6b;font-weight:700}main{margin-left:336px;max-width:840px;padding:56px 40px}.workspace-index{margin-left:0;max-width:920px}.workspace-index h1{font-size:40px;letter-spacing:-.04em}.workspace-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.workspace-card{display:flex;flex-direction:column;gap:8px;padding:18px;border:1px solid rgba(13,13,12,.06);border-radius:18px;background:#fff;color:#18181b;text-decoration:none;box-shadow:0 14px 40px rgba(15,23,42,.06)}.workspace-card span{font-size:13px;color:#6f817a}.prose{font-size:16px;line-height:1.75}.prose h1{font-size:40px;line-height:1.1;margin:0 0 28px}.prose h2{font-size:24px;margin:36px 0 12px}.prose h3{font-size:20px;margin:28px 0 10px}.prose p,.prose li{color:#3f3f46}.prose a{color:#008884}.prose pre{overflow:auto;border-radius:14px;background:#101816;color:#f8fafc;padding:18px}.prose code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.prose :not(pre)>code{border-radius:6px;background:#e8f6f2;padding:2px 5px;color:#0d0d0c}.prose blockquote{border-left:4px solid #008884;margin-left:0;padding-left:16px;color:#52615c}.prose table{border-collapse:collapse;width:100%}.prose .mermaid{max-width:100%;overflow:auto;margin:1rem 0;padding:12px;border:1px solid rgba(13,13,12,.06);border-radius:16px;background:#fff}.prose th,.prose td{border:1px solid rgba(13,13,12,.08);padding:8px 10px;text-align:left}@media(max-width:800px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid rgba(13,13,12,.06)}main{margin-left:0;padding:32px 20px}.prose h1{font-size:32px}}"#;
