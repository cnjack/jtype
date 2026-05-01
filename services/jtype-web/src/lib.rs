use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use pulldown_cmark::{html, Options, Parser};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{mysql::MySqlPoolOptions, MySql, Pool, Row, Transaction};
use std::env;
use thiserror::Error;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pool: Pool<MySql>,
    public_base_url: String,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("password error")]
    Password,
    #[error("unauthorized")]
    Unauthorized,
    #[error("not found")]
    NotFound,
    #[error("{0}")]
    BadRequest(String),
    #[error("server error: {0}")]
    Server(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::NotFound => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) | AppError::Password => StatusCode::BAD_REQUEST,
            AppError::Database(_) | AppError::Server(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = Json(ErrorResponse {
            error: self.to_string(),
        });
        (status, body).into_response()
    }
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    username: String,
    password: String,
    site_title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    token: String,
    username: String,
    site_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncWorkspaceRequest {
    workspace_name: String,
    documents: Vec<SyncDocument>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncDocument {
    relative_path: String,
    title: String,
    status: String,
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncWorkspaceResponse {
    workspace_name: String,
    document_count: usize,
    site_url: String,
}

#[derive(Debug, Clone)]
struct AuthUser {
    id: String,
    username: String,
}

#[derive(Debug, Clone)]
struct SiteDocument {
    relative_path: String,
    title: String,
    content: String,
}

pub async fn run_from_env() -> Result<(), AppError> {
    let database_url = env::var("JTYPED_DATABASE_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .unwrap_or_else(|_| "mysql://jtype:jtype-local@127.0.0.1:3306/jtype".to_string());
    let bind_addr = env::var("JTYPED_BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let public_base_url =
        env::var("JTYPED_PUBLIC_BASE_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());

    let pool = MySqlPoolOptions::new()
        .max_connections(8)
        .connect(&database_url)
        .await?;
    ensure_schema(&pool).await?;

    let app = app(pool, public_base_url);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .map_err(|error| AppError::Server(error.to_string()))?;
    println!("jtype-web listening on http://{}", bind_addr);
    axum::serve(listener, app)
        .await
        .map_err(|error| AppError::Server(error.to_string()))
}

pub fn app(pool: Pool<MySql>, public_base_url: String) -> Router {
    let state = AppState {
        pool,
        public_base_url,
    };

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/login", get(login_page))
        .route("/api/register", post(register))
        .route("/api/login", post(login))
        .route("/api/me", get(me))
        .route("/api/sync/workspace", post(sync_workspace))
        .route("/:site_user", get(public_site_index))
        .route("/:site_user/*page_path", get(public_site_page))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}

pub async fn ensure_schema(pool: &Pool<MySql>) -> Result<(), AppError> {
    for statement in include_str!("../../../infra/mysql/001_init.sql")
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
    {
        sqlx::query(statement).execute(pool).await?;
    }
    run_compat_migrations(pool).await?;
    Ok(())
}

async fn run_compat_migrations(pool: &Pool<MySql>) -> Result<(), AppError> {
    if column_char_length(pool, "workspaces", "id").await? != Some(36) {
        drop_foreign_key_if_exists(pool, "documents", "documents_workspace_id_fk").await?;
        drop_foreign_key_if_exists(pool, "publish_targets", "publish_targets_workspace_id_fk")
            .await?;
        drop_foreign_key_if_exists(pool, "publish_revisions", "publish_revisions_workspace_id_fk")
            .await?;
        sqlx::query("ALTER TABLE workspaces MODIFY COLUMN id CHAR(36) NOT NULL")
            .execute(pool)
            .await?;
    }

    if !column_exists(pool, "workspaces", "user_id").await? {
        sqlx::query("ALTER TABLE workspaces ADD COLUMN user_id CHAR(36) NULL AFTER id")
            .execute(pool)
            .await?;
    }

    if !index_exists(pool, "workspaces", "workspaces_user_name_unique").await? {
        sqlx::query("CREATE UNIQUE INDEX workspaces_user_name_unique ON workspaces (user_id, name)")
            .execute(pool)
            .await?;
    }

    if !foreign_key_exists(pool, "workspaces", "workspaces_user_id_fk").await? {
        sqlx::query(
            r#"ALTER TABLE workspaces
               ADD CONSTRAINT workspaces_user_id_fk
               FOREIGN KEY (user_id) REFERENCES users(id)
               ON DELETE CASCADE"#,
        )
        .execute(pool)
        .await?;
    }

    if !foreign_key_exists(pool, "documents", "documents_workspace_id_fk").await? {
        sqlx::query(
            r#"ALTER TABLE documents
               ADD CONSTRAINT documents_workspace_id_fk
               FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
               ON DELETE CASCADE"#,
        )
        .execute(pool)
        .await?;
    }

    if !foreign_key_exists(pool, "publish_targets", "publish_targets_workspace_id_fk").await? {
        sqlx::query(
            r#"ALTER TABLE publish_targets
               ADD CONSTRAINT publish_targets_workspace_id_fk
               FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
               ON DELETE CASCADE"#,
        )
        .execute(pool)
        .await?;
    }

    if !foreign_key_exists(pool, "publish_revisions", "publish_revisions_workspace_id_fk").await? {
        sqlx::query(
            r#"ALTER TABLE publish_revisions
               ADD CONSTRAINT publish_revisions_workspace_id_fk
               FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
               ON DELETE CASCADE"#,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn column_exists(pool: &Pool<MySql>, table: &str, column: &str) -> Result<bool, AppError> {
    let row = sqlx::query(
        r#"SELECT COUNT(*) AS count
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND COLUMN_NAME = ?"#,
    )
    .bind(table)
    .bind(column)
    .fetch_one(pool)
    .await?;
    let count: i64 = row.try_get("count")?;
    Ok(count > 0)
}

async fn column_char_length(
    pool: &Pool<MySql>,
    table: &str,
    column: &str,
) -> Result<Option<u64>, AppError> {
    let row = sqlx::query(
        r#"SELECT CHARACTER_MAXIMUM_LENGTH AS max_len
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND COLUMN_NAME = ?"#,
    )
    .bind(table)
    .bind(column)
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else {
        return Ok(None);
    };
    let max_len: i64 = row.try_get("max_len")?;
    Ok(Some(max_len as u64))
}

async fn index_exists(pool: &Pool<MySql>, table: &str, index: &str) -> Result<bool, AppError> {
    let row = sqlx::query(
        r#"SELECT COUNT(*) AS count
           FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND INDEX_NAME = ?"#,
    )
    .bind(table)
    .bind(index)
    .fetch_one(pool)
    .await?;
    let count: i64 = row.try_get("count")?;
    Ok(count > 0)
}

async fn foreign_key_exists(
    pool: &Pool<MySql>,
    table: &str,
    constraint: &str,
) -> Result<bool, AppError> {
    let row = sqlx::query(
        r#"SELECT COUNT(*) AS count
           FROM information_schema.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND CONSTRAINT_NAME = ?
             AND CONSTRAINT_TYPE = 'FOREIGN KEY'"#,
    )
    .bind(table)
    .bind(constraint)
    .fetch_one(pool)
    .await?;
    let count: i64 = row.try_get("count")?;
    Ok(count > 0)
}

async fn drop_foreign_key_if_exists(
    pool: &Pool<MySql>,
    table: &str,
    constraint: &str,
) -> Result<(), AppError> {
    if foreign_key_exists(pool, table, constraint).await? {
        sqlx::query(&format!(
            "ALTER TABLE `{}` DROP FOREIGN KEY `{}`",
            table, constraint
        ))
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let username = normalize_username(&payload.username)?;
    validate_password(&payload.password)?;
    let password_hash = hash_password(&payload.password)?;
    let user_id = Uuid::new_v4().to_string();
    let site_title = payload
        .site_title
        .unwrap_or_else(|| format!("{} Docs", username));

    sqlx::query(
        r#"INSERT INTO users (id, username, password_hash, site_title)
           VALUES (?, ?, ?, ?)"#,
    )
    .bind(&user_id)
    .bind(&username)
    .bind(password_hash)
    .bind(site_title)
    .execute(&state.pool)
    .await
    .map_err(|error| match error {
        sqlx::Error::Database(db_error) if db_error.is_unique_violation() => {
            AppError::BadRequest("username already exists".to_string())
        }
        other => AppError::Database(other),
    })?;

    let token = create_session(&state.pool, &user_id).await?;
    Ok(Json(auth_response(&state.public_base_url, token, username)))
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let username = normalize_username(&payload.username)?;
    let row = sqlx::query("SELECT id, password_hash FROM users WHERE username = ?")
        .bind(&username)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::Unauthorized)?;
    let user_id: String = row.try_get("id")?;
    let password_hash: String = row.try_get("password_hash")?;
    verify_password(&payload.password, &password_hash)?;
    let token = create_session(&state.pool, &user_id).await?;
    Ok(Json(auth_response(&state.public_base_url, token, username)))
}

async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthResponse>, AppError> {
    let user = auth_user(&state.pool, &headers).await?;
    Ok(Json(auth_response(
        &state.public_base_url,
        "".to_string(),
        user.username,
    )))
}

async fn sync_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SyncWorkspaceRequest>,
) -> Result<Json<SyncWorkspaceResponse>, AppError> {
    let user = auth_user(&state.pool, &headers).await?;
    if payload.workspace_name.trim().is_empty() {
        return Err(AppError::BadRequest(
            "workspaceName is required".to_string(),
        ));
    }

    let mut tx = state.pool.begin().await?;
    let workspace_id = upsert_workspace(&mut tx, &user.id, &payload.workspace_name).await?;
    sqlx::query("DELETE FROM documents WHERE workspace_id = ?")
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;

    for doc in &payload.documents {
        if !is_markdown_path(&doc.relative_path) {
            continue;
        }
        let document_id = Uuid::new_v4().to_string();
        let title = if doc.title.trim().is_empty() {
            extract_title(&doc.content).unwrap_or_else(|| doc.relative_path.clone())
        } else {
            doc.title.clone()
        };
        let status = normalize_status(&doc.status, &doc.content);
        let content_hash = sha256_hex(&doc.content);
        sqlx::query(
            r#"INSERT INTO documents
               (id, workspace_id, relative_path, title, status, content_hash, content)
               VALUES (?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(document_id)
        .bind(&workspace_id)
        .bind(&doc.relative_path)
        .bind(title)
        .bind(status)
        .bind(content_hash)
        .bind(&doc.content)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(Json(SyncWorkspaceResponse {
        workspace_name: payload.workspace_name,
        document_count: payload.documents.len(),
        site_url: site_url(&state.public_base_url, &user.username),
    }))
}

async fn public_site_index(
    State(state): State<AppState>,
    Path(site_user): Path<String>,
) -> Result<Html<String>, AppError> {
    render_public_site(state, site_user, None).await
}

async fn public_site_page(
    State(state): State<AppState>,
    Path((site_user, page_path)): Path<(String, String)>,
) -> Result<Html<String>, AppError> {
    render_public_site(state, site_user, Some(page_path)).await
}

async fn render_public_site(
    state: AppState,
    site_user: String,
    page_path: Option<String>,
) -> Result<Html<String>, AppError> {
    let username = site_user
        .strip_prefix('@')
        .ok_or(AppError::NotFound)?
        .to_string();
    let user_row = sqlx::query("SELECT id, username, site_title FROM users WHERE username = ?")
        .bind(&username)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let user_id: String = user_row.try_get("id")?;
    let site_title: String = user_row.try_get("site_title")?;
    let docs = load_site_documents(&state.pool, &user_id).await?;
    if docs.is_empty() {
        return Ok(Html(site_shell(
            &site_title,
            &username,
            &[],
            "No published documents yet.",
            "",
        )));
    }

    let selected = select_document(&docs, page_path.as_deref()).ok_or(AppError::NotFound)?;
    let body = markdown_to_html(&selected.content);
    Ok(Html(site_shell(
        &site_title,
        &username,
        &docs,
        &body,
        &selected.relative_path,
    )))
}

async fn login_page() -> Html<String> {
    Html(
        r#"<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>JType Login</title>
<style>body{font-family:Inter,system-ui,sans-serif;background:#fafafa;color:#18181b;margin:0}.wrap{max-width:420px;margin:10vh auto;padding:32px;background:white;border:1px solid #e4e4e7;border-radius:12px}input,button{width:100%;box-sizing:border-box;margin-top:12px;padding:10px;border-radius:8px;border:1px solid #d4d4d8}button{background:#047857;color:white;font-weight:700}</style></head>
<body><main class="wrap"><h1>JType</h1><p>Use the desktop app Sync panel for now. API endpoints are available at <code>/api/register</code> and <code>/api/login</code>.</p></main></body></html>"#
            .to_string(),
    )
}

async fn upsert_workspace(
    tx: &mut Transaction<'_, MySql>,
    user_id: &str,
    workspace_name: &str,
) -> Result<String, AppError> {
    if let Some(row) = sqlx::query("SELECT id FROM workspaces WHERE user_id = ? AND name = ?")
        .bind(user_id)
        .bind(workspace_name)
        .fetch_optional(&mut **tx)
        .await?
    {
        return Ok(row.try_get("id")?);
    }

    let workspace_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO workspaces (id, user_id, name) VALUES (?, ?, ?)")
        .bind(&workspace_id)
        .bind(user_id)
        .bind(workspace_name)
        .execute(&mut **tx)
        .await?;
    Ok(workspace_id)
}

async fn load_site_documents(
    pool: &Pool<MySql>,
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

fn select_document<'a>(
    docs: &'a [SiteDocument],
    page_path: Option<&str>,
) -> Option<&'a SiteDocument> {
    let Some(page_path) = page_path.filter(|value| !value.is_empty()) else {
        return docs
            .iter()
            .find(|doc| doc.relative_path == "index.md")
            .or_else(|| docs.first());
    };
    let normalized = page_path.trim_matches('/');
    let candidates = [
        normalized.to_string(),
        format!("{}.md", normalized),
        format!("{}/index.md", normalized),
    ];
    docs.iter().find(|doc| {
        candidates
            .iter()
            .any(|candidate| candidate == &doc.relative_path)
    })
}

async fn auth_user(pool: &Pool<MySql>, headers: &HeaderMap) -> Result<AuthUser, AppError> {
    let token = bearer_token(headers)?;
    let token_hash = sha256_hex(token);
    let row = sqlx::query(
        r#"SELECT u.id, u.username
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ?"#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    Ok(AuthUser {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
    })
}

fn bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    let value = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(AppError::Unauthorized)?;
    value
        .strip_prefix("Bearer ")
        .filter(|token| !token.trim().is_empty())
        .ok_or(AppError::Unauthorized)
}

async fn create_session(pool: &Pool<MySql>, user_id: &str) -> Result<String, AppError> {
    let token = random_token();
    let token_hash = sha256_hex(&token);
    sqlx::query("INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)")
        .bind(token_hash)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(token)
}

fn auth_response(public_base_url: &str, token: String, username: String) -> AuthResponse {
    AuthResponse {
        site_url: site_url(public_base_url, &username),
        token,
        username,
    }
}

fn site_url(public_base_url: &str, username: &str) -> String {
    format!("{}/@{}", public_base_url.trim_end_matches('/'), username)
}

fn normalize_username(username: &str) -> Result<String, AppError> {
    let username = username.trim().to_ascii_lowercase();
    if username.len() < 3
        || username.len() > 80
        || !username
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(AppError::BadRequest(
            "username must be 3-80 chars: a-z, 0-9, - or _".to_string(),
        ));
    }
    Ok(username)
}

fn validate_password(password: &str) -> Result<(), AppError> {
    if password.len() < 6 {
        return Err(AppError::BadRequest(
            "password must be at least 6 characters".to_string(),
        ));
    }
    Ok(())
}

fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| AppError::Password)
}

fn verify_password(password: &str, password_hash: &str) -> Result<(), AppError> {
    let parsed = PasswordHash::new(password_hash).map_err(|_| AppError::Password)?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| AppError::Unauthorized)
}

fn random_token() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

fn sha256_hex(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

fn normalize_status(status: &str, content: &str) -> &'static str {
    let frontmatter = parse_frontmatter(content);
    if status.eq_ignore_ascii_case("draft")
        || frontmatter
            .get("status")
            .map(|value| value.eq_ignore_ascii_case("draft"))
            .unwrap_or(false)
        || frontmatter
            .get("publish")
            .map(|value| value.eq_ignore_ascii_case("false"))
            .unwrap_or(false)
    {
        "draft"
    } else {
        "published"
    }
}

fn is_markdown_path(path: &str) -> bool {
    path.to_ascii_lowercase().ends_with(".md")
        || path.to_ascii_lowercase().ends_with(".markdown")
        || path.to_ascii_lowercase().ends_with(".mdown")
        || path.to_ascii_lowercase().ends_with(".mkd")
}

fn extract_title(content: &str) -> Option<String> {
    parse_frontmatter(content)
        .get("title")
        .cloned()
        .or_else(|| {
            content.lines().find_map(|line| {
                line.strip_prefix("# ")
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_string)
            })
        })
}

fn parse_frontmatter(content: &str) -> std::collections::HashMap<String, String> {
    let mut frontmatter = std::collections::HashMap::new();
    let mut lines = content.lines();
    if lines.next() != Some("---") {
        return frontmatter;
    }
    for line in lines {
        if line == "---" {
            break;
        }
        if let Some((key, value)) = line.split_once(':') {
            frontmatter.insert(
                key.trim().to_string(),
                value
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string(),
            );
        }
    }
    frontmatter
}

fn markdown_to_html(content: &str) -> String {
    let parser = Parser::new_ext(content, Options::all());
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

fn page_href(username: &str, relative_path: &str) -> String {
    let path = relative_path
        .trim_end_matches(".md")
        .trim_end_matches("/index")
        .trim_matches('/');
    if path == "index" || path.is_empty() {
        format!("/@{}", username)
    } else {
        format!("/@{}/{}", username, path)
    }
}

fn site_shell(
    site_title: &str,
    username: &str,
    docs: &[SiteDocument],
    body: &str,
    active_path: &str,
) -> String {
    let nav = docs
        .iter()
        .map(|doc| {
            let active = if doc.relative_path == active_path {
                " active"
            } else {
                ""
            };
            format!(
                r#"<li><a class="nav-link{}" href="{}">{}</a></li>"#,
                active,
                page_href(username, &doc.relative_path),
                escape_html(&doc.title)
            )
        })
        .collect::<Vec<_>>()
        .join("");

    format!(
        r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{}</title>
    <style>{}</style>
  </head>
  <body>
    <aside>
      <div class="brand">JType</div>
      <div class="site-title">{}</div>
      <nav><ul>{}</ul></nav>
    </aside>
    <main>
      <article class="prose">{}</article>
    </main>
  </body>
</html>"#,
        escape_html(site_title),
        protocol_css(),
        escape_html(site_title),
        nav,
        body
    )
}

fn protocol_css() -> &'static str {
    r#"
body{margin:0;background:#fafafa;color:#18181b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
aside{position:fixed;inset:0 auto 0 0;width:288px;overflow:auto;border-right:1px solid #e4e4e7;background:#fff;padding:24px}
.brand{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#047857}
.site-title{margin-top:8px;font-weight:700;color:#18181b}
nav{margin-top:32px}ul{list-style:none;margin:0;padding:0}.nav-link{display:block;border-radius:8px;padding:7px 10px;color:#52525b;text-decoration:none;font-size:14px}.nav-link:hover{background:#f4f4f5;color:#18181b}.nav-link.active{background:#ecfdf5;color:#047857;font-weight:700;box-shadow:inset 3px 0 0 #10b981}
main{margin-left:336px;max-width:840px;padding:56px 40px}.prose{font-size:16px;line-height:1.75}.prose h1{font-size:40px;line-height:1.1;margin:0 0 28px}.prose h2{font-size:24px;margin:36px 0 12px}.prose h3{font-size:20px;margin:28px 0 10px}.prose p,.prose li{color:#3f3f46}.prose a{color:#047857}.prose pre{overflow:auto;border-radius:10px;background:#18181b;color:#f8fafc;padding:18px}.prose code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.prose :not(pre)>code{border-radius:5px;background:#f4f4f5;padding:2px 5px;color:#18181b}.prose blockquote{border-left:4px solid #10b981;margin-left:0;padding-left:16px;color:#52525b}.prose table{border-collapse:collapse;width:100%}.prose th,.prose td{border:1px solid #e4e4e7;padding:8px 10px;text-align:left}
@media(max-width:800px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid #e4e4e7}main{margin-left:0;padding:32px 20px}.prose h1{font-size:32px}}
"#
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_username() {
        assert_eq!(normalize_username(" Jack_01 ").unwrap(), "jack_01");
        assert!(normalize_username("no").is_err());
        assert!(normalize_username("bad name").is_err());
    }

    #[test]
    fn extracts_frontmatter_title() {
        let title = extract_title("---\ntitle: Hello\n---\n# Fallback").unwrap();
        assert_eq!(title, "Hello");
    }

    #[test]
    fn hides_drafts() {
        assert_eq!(
            normalize_status("published", "---\nstatus: draft\n---\n# A"),
            "draft"
        );
        assert_eq!(normalize_status("", "# A"), "published");
    }

    #[test]
    fn selects_site_documents() {
        let docs = vec![
            SiteDocument {
                relative_path: "index.md".to_string(),
                title: "Home".to_string(),
                content: "# Home".to_string(),
            },
            SiteDocument {
                relative_path: "guide/setup.md".to_string(),
                title: "Setup".to_string(),
                content: "# Setup".to_string(),
            },
        ];
        assert_eq!(
            select_document(&docs, None).unwrap().relative_path,
            "index.md"
        );
        assert_eq!(
            select_document(&docs, Some("guide/setup"))
                .unwrap()
                .relative_path,
            "guide/setup.md"
        );
    }

    #[test]
    fn renders_protocol_style_shell() {
        let docs = vec![SiteDocument {
            relative_path: "index.md".to_string(),
            title: "Home".to_string(),
            content: "# Home".to_string(),
        }];
        let html = site_shell("Jack Docs", "jack", &docs, "<h1>Home</h1>", "index.md");
        assert!(html.contains("JType"));
        assert!(html.contains("/@jack"));
        assert!(html.contains("nav-link active"));
    }
}
