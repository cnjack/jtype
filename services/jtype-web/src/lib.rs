pub mod db;
pub mod error;
pub mod handlers;
pub mod hub;
pub mod mail;
pub mod mcp;
pub mod middleware;
pub mod settings;
pub mod storage;
pub mod tasks;
pub mod themes;
pub mod util;

use axum::{
    extract::DefaultBodyLimit,
    http::{header, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::{delete, get, patch, post, put},
    Router,
};
use rust_embed::Embed;
use sqlx::{MySql, Pool};
use std::env;
use tower_http::cors::{Any, CorsLayer};

pub use error::AppError;

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<MySql>,
    pub public_base_url: String,
    pub hub: hub::ConnectionHub,
    pub storage: storage::SharedStore,
    pub mailer: mail::SharedMailer,
}

impl AppState {
    /// Current object-store handle. The read lock is held only long enough to
    /// clone the inner `Arc` out — never across `.await` — so storage swaps
    /// never block request handling.
    pub fn storage(&self) -> storage::DynStore {
        self.storage
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    /// Atomically replace the live object-store backend (used when an admin
    /// changes storage settings). In-flight requests keep the handle they
    /// already cloned; subsequent requests see the new backend.
    pub fn set_storage(&self, store: storage::DynStore) {
        *self.storage.write().unwrap_or_else(|e| e.into_inner()) = store;
    }

    /// Snapshot the active mailer (`None` when SMTP is unconfigured) by cloning
    /// it out under a brief read lock — never across `.await`. The caller then
    /// sends on the owned [`mail::Mailer`], so a concurrent admin save can't
    /// observe a borrow half-way through a send.
    pub fn mailer_snapshot(&self) -> Option<mail::Mailer> {
        self.mailer
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    /// Atomically replace the live mailer (used when an admin saves SMTP
    /// settings). Pass `None` to disable mail.
    pub fn set_mailer(&self, mailer: Option<mail::Mailer>) {
        *self.mailer.write().unwrap_or_else(|e| e.into_inner()) = mailer;
    }
}

#[derive(Embed)]
#[folder = "frontend/dist"]
struct FrontendAssets;

pub async fn run_from_env() -> Result<(), AppError> {
    let bind_addr = env::var("JTYPED_BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:13345".to_string());
    let public_base_url =
        env::var("JTYPED_PUBLIC_BASE_URL").unwrap_or_else(|_| "http://localhost:13345".to_string());

    let pool = db::connect().await.map_err(AppError::Database)?;
    db::migrations::run_all(&pool).await?;

    // Storage config resolves DB (admin UI) → env (`JTYPED_STORAGE_*`) → default.
    let storage_cfg = settings::load_storage_config(&pool).await?;
    let storage = storage::from_config(&storage_cfg);
    // SMTP config resolves DB (admin UI) → env (`JTYPED_SMTP_*`) → default.
    let smtp_cfg = settings::load_smtp_config(&pool).await?;
    let mailer = mail::from_config(&smtp_cfg);
    let (app, _hub) = build_app(pool.clone(), public_base_url, storage, mailer);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| AppError::Server(e.to_string()))?;
    println!("jtype-web listening on http://{}", bind_addr);
    // Spawn periodic trash cleanup (document_trash + kanban_card_trash)
    tasks::cleanup_trash::spawn(pool);
    axum::serve(listener, app)
        .await
        .map_err(|e| AppError::Server(e.to_string()))
}

pub fn build_router(pool: Pool<MySql>, public_base_url: String) -> Router {
    let (router, _hub) = build_router_with_hub(pool, public_base_url);
    router
}

/// Build the router with an in-memory object store (used by tests, which do not
/// need a real S3 backend).
pub fn build_router_with_hub(
    pool: Pool<MySql>,
    public_base_url: String,
) -> (Router, hub::ConnectionHub) {
    build_app(pool, public_base_url, storage::in_memory(), None)
}

/// Core router builder: wires the app state (including object storage) and all
/// routes.
pub fn build_app(
    pool: Pool<MySql>,
    public_base_url: String,
    storage: storage::DynStore,
    mailer: Option<mail::Mailer>,
) -> (Router, hub::ConnectionHub) {
    let hub = hub::ConnectionHub::new();
    let cleanup_hub = hub.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            cleanup_hub.cleanup().await;
        }
    });
    let state = AppState {
        pool,
        public_base_url,
        hub,
        storage: storage::shared(storage),
        mailer: mail::shared(mailer),
    };

    let return_hub = state.hub.clone();
    let pool_for_mcp = state.pool.clone();
    let public_base_url_for_mcp = state.public_base_url.clone();

    let api = Router::new()
        // Health
        .route("/health", get(|| async { "ok" }))
        // Auth API
        .route("/api/register", post(handlers::auth::register))
        .route("/api/login", post(handlers::auth::login))
        .route("/api/me", get(handlers::auth::me))
        // User profile API
        .route(
            "/api/me/profile",
            get(handlers::user::get_profile).put(handlers::user::update_profile),
        )
        .route("/api/me/site", put(handlers::user::update_site_settings))
        .route("/api/me/storage", get(handlers::user::my_storage))
        .route("/api/me/devices", get(handlers::user::my_devices))
        .route(
            "/api/me/tokens",
            get(handlers::user::list_tokens).post(handlers::user::create_token),
        )
        .route(
            "/api/me/tokens/:token_id",
            delete(handlers::user::revoke_token),
        )
        // Admin API
        .route("/api/admin/users", get(handlers::admin::list_users))
        .route(
            "/api/admin/users/:user_id",
            get(handlers::admin::get_user).put(handlers::admin::update_user),
        )
        .route(
            "/api/admin/workspaces",
            get(handlers::admin::list_workspaces),
        )
        .route("/api/admin/domains", get(handlers::admin::list_domains))
        .route("/api/admin/stats", get(handlers::admin::stats))
        .route(
            "/api/admin/settings/storage",
            get(handlers::settings::get_storage_settings)
                .put(handlers::settings::update_storage_settings),
        )
        .route(
            "/api/admin/settings/smtp",
            get(handlers::settings::get_smtp_settings)
                .put(handlers::settings::update_smtp_settings),
        )
        // OAuth device flow
        .route("/api/oauth/device/start", post(handlers::oauth::start))
        .route("/api/oauth/device/approve", post(handlers::oauth::approve))
        .route("/api/oauth/device/poll", post(handlers::oauth::poll))
        // Email verification + password reset (via SMTP)
        .route("/api/auth/forgot-password", post(handlers::mail::forgot_password))
        .route("/api/auth/reset-password", post(handlers::mail::reset_password))
        .route("/api/auth/verify-email", post(handlers::mail::verify_email))
        .route(
            "/api/me/send-email-verification",
            post(handlers::mail::send_email_verification),
        )
        // Email OTP login (passwordless, requires SMTP configured)
        .route("/api/auth/otp/send", post(handlers::mail::otp_send))
        .route("/api/auth/otp/verify", post(handlers::mail::otp_verify))
        // Workspaces API
        .route(
            "/api/v1/workspaces",
            get(handlers::workspace::list_workspaces).post(handlers::workspace::create_workspace),
        )
        .route(
            "/api/v1/workspaces/:workspace_id",
            get(handlers::workspace::get_workspace)
                .put(handlers::workspace::update_workspace)
                .delete(handlers::workspace::delete_workspace),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/members",
            get(handlers::member::list_members),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/members/:user_id/remove",
            post(handlers::member::remove_member),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/members/:user_id",
            put(handlers::member::update_member_role),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/leave",
            post(handlers::member::leave_workspace),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/transfer",
            post(handlers::member::transfer_ownership),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/manifest",
            get(handlers::workspace::get_workspace_manifest),
        )
        .route("/api/v1/live", get(handlers::live::ws_upgrade_user))
        .route(
            "/api/v1/workspaces/:workspace_id/live",
            get(handlers::live::ws_upgrade),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/invites",
            get(handlers::workspace::list_invites).post(handlers::workspace::create_invite),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/invites/:invite_id/revoke",
            post(handlers::workspace::revoke_invite),
        )
        .route(
            "/api/v1/workspace-invites/:invite_token",
            get(handlers::workspace::preview_invite),
        )
        .route(
            "/api/v1/workspace-invites/:invite_token/accept",
            post(handlers::workspace::accept_invite),
        )
        // Documents API
        .route(
            "/api/v1/workspaces/:workspace_id/folders",
            get(handlers::folder::list_folders).post(handlers::folder::create_folder),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/folders/:folder_id",
            delete(handlers::folder::delete_folder),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/documents",
            get(handlers::document::list_documents),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/documents/save",
            post(handlers::document::save_document),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/documents/:document_id",
            get(handlers::document::get_document).delete(handlers::document::delete_document),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/documents/:document_id/versions",
            get(handlers::document::list_versions),
        )
        // Sync API
        .route(
            "/api/v1/workspaces/:workspace_id/sync/pull",
            post(handlers::sync::pull),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/sync/push",
            post(handlers::sync::push),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/conflicts",
            get(handlers::sync::list_conflicts),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/conflicts/:conflict_id/resolve",
            post(handlers::sync::resolve_conflict),
        )
        // Trash API
        .route(
            "/api/v1/workspaces/:workspace_id/trash",
            get(handlers::trash::list_trash).delete(handlers::trash::empty_trash),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/trash/:trash_id/restore",
            post(handlers::trash::restore_from_trash),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/trash/:trash_id",
            delete(handlers::trash::permanent_delete),
        )
        // Kanban API
        // Boards
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards",
            get(handlers::kanban::board::list_boards).post(handlers::kanban::board::create_board),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/reorder",
            post(handlers::kanban::board::reorder_boards),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/:board_id",
            get(handlers::kanban::board::get_board)
                .patch(handlers::kanban::board::patch_board)
                .delete(handlers::kanban::board::delete_board),
        )
        // Columns
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/:board_id/columns",
            post(handlers::kanban::column::create_column),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/columns/reorder",
            post(handlers::kanban::column::reorder_columns),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/columns/:column_id",
            patch(handlers::kanban::column::patch_column),
        )
        // Cards
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/:board_id/cards",
            get(handlers::kanban::card::list_cards).post(handlers::kanban::card::create_card),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/:board_id/trash",
            get(handlers::kanban::card::list_card_trash),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/:board_id/cards/move",
            post(handlers::kanban::card::move_card),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/cards/:card_id",
            patch(handlers::kanban::card::patch_card)
                .delete(handlers::kanban::card::delete_card),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/cards/:card_id/archive",
            post(handlers::kanban::card::archive_card),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/cards/:card_id/restore",
            post(handlers::kanban::card::restore_card),
        )
        // Labels
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/boards/:board_id/labels",
            get(handlers::kanban::label::list_labels).post(handlers::kanban::label::create_label),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/kanban/labels/:label_id",
            patch(handlers::kanban::label::patch_label)
                .delete(handlers::kanban::label::delete_label),
        )
        // Domains API
        .route(
            "/api/v1/domains",
            get(handlers::domain::list).post(handlers::domain::add),
        )
        .route("/api/v1/domains/:domain_id", get(handlers::domain::get))
        .route(
            "/api/v1/domains/:domain_id/binding",
            put(handlers::domain::bind_workspace),
        )
        .route(
            "/api/v1/domains/:domain_id/verify",
            post(handlers::domain::verify),
        )
        .route(
            "/api/v1/domains/:domain_id/certificate",
            post(handlers::domain::upload_certificate),
        )
        // Publish & site settings API
        .route(
            "/api/themes",
            get(handlers::publish::list_themes),
        )
        .route(
            "/api/themes/:theme_id",
            get(handlers::publish::get_theme),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/site",
            get(handlers::publish::get_site_settings).put(handlers::publish::update_site_settings),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/published",
            get(handlers::publish::list_published),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/publish-batch",
            post(handlers::publish::publish_batch),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/preview",
            post(handlers::publish::preview),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/documents/:document_id/publish",
            get(handlers::publish::get_publish_status)
                .post(handlers::publish::publish_document)
                .delete(handlers::publish::unpublish_document),
        )
        // Assets (images). Upload/list/delete require workspace roles; the
        // public read route proxies bytes so the object store stays hidden.
        .route(
            "/api/v1/workspaces/:workspace_id/assets",
            post(handlers::assets::upload_asset)
                .get(handlers::assets::list_assets)
                .layer(DefaultBodyLimit::max(handlers::assets::MAX_ASSET_BYTES + 64 * 1024)),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/assets/:asset_id",
            delete(handlers::assets::delete_asset),
        )
        .route(
            "/assets/:workspace_id/:asset_id",
            get(handlers::assets::serve_asset),
        )
        // Path-keyed binary blobs (desktop asset sync). Manifest lists changes
        // since a clock; the wildcard route uploads/downloads/tombstones bytes
        // by vault relative path.
        .route(
            "/api/v1/workspaces/:workspace_id/blobs",
            get(handlers::blobs::list_blobs),
        )
        .route(
            "/api/v1/workspaces/:workspace_id/blobs/*relative_path",
            post(handlers::blobs::upload_blob)
                .get(handlers::blobs::download_blob)
                .delete(handlers::blobs::delete_blob)
                .layer(DefaultBodyLimit::max(handlers::blobs::MAX_BLOB_BYTES + 64 * 1024)),
        )
        // Public sites
        .route("/u/:site_user", get(handlers::site::user_site_index))
        .route(
            "/u/:site_user/:workspace_slug",
            get(handlers::site::workspace_index),
        )
        .route(
            "/u/:site_user/:workspace_slug/*page_path",
            get(handlers::site::workspace_page),
        )
        // Frontend SPA - catch all other routes
        .fallback(serve_frontend)
        .with_state(state);

    // MCP server (Streamable HTTP) + OAuth discovery. MCP tools dispatch
    // in-process through a clone of the API router (see `mcp` module).
    let mcp = mcp::router(mcp::McpState {
        api: api.clone(),
        pool: pool_for_mcp,
        public_base_url: public_base_url_for_mcp,
    });

    let app = mcp.merge(api).layer(
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any),
    );

    (app, return_hub)
}

async fn serve_frontend(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    // Try to serve the exact file
    if let Some(file) = FrontendAssets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return (
            StatusCode::OK,
            [(header::CONTENT_TYPE, mime.as_ref())],
            file.data,
        )
            .into_response();
    }

    // For SPA: serve index.html for any path that doesn't match a static file
    if let Some(index) = FrontendAssets::get("index.html") {
        return Html(String::from_utf8_lossy(&index.data).to_string()).into_response();
    }

    StatusCode::NOT_FOUND.into_response()
}

#[cfg(test)]
mod tests {
    use super::util::*;

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
    fn hides_drafts_removed() {
        // normalize_status removed in migration 0005; is_published flag is used instead
    }

    #[test]
    fn slugifies_workspace_names() {
        assert_eq!(slugify("Research Notes"), "research-notes");
        assert_eq!(slugify("  !!!  "), "workspace");
        assert_eq!(slugify("Team / Docs"), "team-docs");
    }

    #[test]
    fn validates_workspace_roles() {
        assert_eq!(normalize_invite_role(None).unwrap(), "editor");
        assert_eq!(normalize_invite_role(Some("viewer")).unwrap(), "viewer");
        assert!(normalize_invite_role(Some("owner")).is_err());
    }

    #[test]
    fn merges_non_overlapping_line_edits() {
        let base = "one\ntwo\nthree";
        let local = "ONE\ntwo\nthree";
        let cloud = "one\ntwo\nTHREE";
        match smart_three_way_merge(base, local, cloud) {
            MergeResult::Merged(v) => assert_eq!(v, "ONE\ntwo\nTHREE"),
            MergeResult::Conflict { .. } => panic!("expected clean merge"),
        }
    }

    #[test]
    fn detects_overlapping_line_conflicts() {
        let base = "one\ntwo";
        let local = "ONE\ntwo";
        let cloud = "uno\ntwo";
        assert!(matches!(
            smart_three_way_merge(base, local, cloud),
            MergeResult::Conflict { .. }
        ));
    }

    #[test]
    fn merges_inserts_in_different_areas() {
        let base = "one\ntwo\nthree";
        let local = "one\ninsert-local\ntwo\nthree";
        let cloud = "one\ntwo\nthree\ninsert-cloud";
        match smart_three_way_merge(base, local, cloud) {
            MergeResult::Merged(v) => {
                assert!(v.contains("insert-local"));
                assert!(v.contains("insert-cloud"));
            }
            MergeResult::Conflict { .. } => {
                panic!("expected clean merge for non-overlapping inserts")
            }
        }
    }

    #[test]
    fn merges_different_region_edits_with_line_count_change() {
        let base = "a\nb\nc\nd";
        let local = "A\nb\nc\nd";
        let cloud = "a\nb\nC\nD\nd";
        match smart_three_way_merge(base, local, cloud) {
            MergeResult::Merged(v) => {
                assert!(v.contains("A"));
                assert!(v.contains("C"));
                assert!(v.contains("D"));
            }
            MergeResult::Conflict { .. } => {
                panic!("expected clean merge for non-overlapping edits")
            }
        }
    }
}
