//! OAuth 2.1 authorization server for the MCP resource, packaged on top of
//! jtype's existing auth. Supports two grants:
//!
//! - **Authorization Code + PKCE** (RFC 7636) with **Dynamic Client
//!   Registration** (RFC 7591) — the path Claude.ai / Cursor use for one-click
//!   "Add custom connector": no pasted token, browser consent.
//! - **Device Authorization Grant** (RFC 8628) — for clients / CLIs that can't
//!   pop a browser (e.g. the jtype CLI).
//!
//! Endpoints:
//! - `GET  /.well-known/oauth-protected-resource` — the `/mcp` resource server.
//! - `GET  /.well-known/oauth-authorization-server` — advertises both grants.
//! - `POST /oauth/register` — dynamic client registration.
//! - `GET  /oauth/authorize` — consent page (self-contained login + approve).
//! - `POST /api/oauth/authorize` — mint an auth code (bearer-authenticated).
//! - `POST /api/oauth/device_authorization` — start the device flow.
//! - `POST /api/oauth/token` — code or device grant → a scoped `mcp` token.
//!
//! Minted access tokens are scoped `mcp` and expire (90 days); they are barred
//! from admin endpoints (see `require_admin`).

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::Html,
    Form, Json,
};
use base64::Engine;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::Row;
use uuid::Uuid;

use crate::error::AppError;
use crate::handlers::auth::create_scoped_session;
use crate::middleware::auth::extract_user;
use crate::util::{random_token, sha256_hex, short_user_code};

use super::McpState;

const DEVICE_CODE_GRANT: &str = "urn:ietf:params:oauth:grant-type:device_code";
const MCP_TOKEN_TTL_SECS: i64 = 90 * 86_400;

// ── Discovery metadata ──────────────────────────────────────────────────────

pub async fn protected_resource_metadata(State(st): State<McpState>) -> Json<Value> {
    let base = st.public_base_url.trim_end_matches('/');
    Json(json!({
        "resource": format!("{base}/mcp"),
        "authorization_servers": [base],
        "bearer_methods_supported": ["header"],
        "resource_documentation": format!("{base}/")
    }))
}

pub async fn authorization_server_metadata(State(st): State<McpState>) -> Json<Value> {
    let base = st.public_base_url.trim_end_matches('/');
    Json(json!({
        "issuer": base,
        "authorization_endpoint": format!("{base}/oauth/authorize"),
        "token_endpoint": format!("{base}/api/oauth/token"),
        "registration_endpoint": format!("{base}/oauth/register"),
        "device_authorization_endpoint": format!("{base}/api/oauth/device_authorization"),
        "grant_types_supported": ["authorization_code", DEVICE_CODE_GRANT],
        "response_types_supported": ["code"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": ["mcp"]
    }))
}

// ── Dynamic Client Registration (RFC 7591) ──────────────────────────────────

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct RegisterClientRequest {
    pub client_name: Option<String>,
    pub redirect_uris: Vec<String>,
}

pub async fn register_client(
    State(st): State<McpState>,
    Json(req): Json<RegisterClientRequest>,
) -> Result<(axum::http::StatusCode, Json<Value>), AppError> {
    if req.redirect_uris.is_empty() {
        return Err(AppError::BadRequest("redirect_uris is required".into()));
    }
    let client_id = Uuid::new_v4().to_string();
    let client_name = req
        .client_name
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| "MCP client".to_string());
    let uris_json = serde_json::to_string(&req.redirect_uris).unwrap_or_else(|_| "[]".into());
    sqlx::query("INSERT INTO oauth_clients (client_id, client_name, redirect_uris) VALUES (?, ?, ?)")
        .bind(&client_id)
        .bind(&client_name)
        .bind(&uris_json)
        .execute(&st.pool)
        .await?;
    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({
            "client_id": client_id,
            "client_name": client_name,
            "redirect_uris": req.redirect_uris,
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code"],
            "response_types": ["code"]
        })),
    ))
}

// ── Authorization endpoint (consent) ────────────────────────────────────────

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct AuthorizeParams {
    pub response_type: Option<String>,
    pub client_id: Option<String>,
    pub redirect_uri: Option<String>,
    pub code_challenge: Option<String>,
    pub code_challenge_method: Option<String>,
    pub scope: Option<String>,
    pub state: Option<String>,
}

/// `GET /oauth/authorize` — validate the request, then serve a self-contained
/// consent page (inline login + approve/deny). The page reads the user's token
/// from `localStorage` (same origin as the SPA) and calls `POST /api/oauth/authorize`.
pub async fn authorize_page(
    State(st): State<McpState>,
    Query(p): Query<AuthorizeParams>,
) -> Result<Html<String>, AppError> {
    if p.response_type.as_deref() != Some("code") {
        return Err(AppError::BadRequest("response_type must be 'code'".into()));
    }
    let client_id = p.client_id.clone().ok_or_else(|| AppError::BadRequest("client_id required".into()))?;
    let redirect_uri = p
        .redirect_uri
        .clone()
        .ok_or_else(|| AppError::BadRequest("redirect_uri required".into()))?;
    if p.code_challenge.as_deref().unwrap_or("").is_empty() {
        return Err(AppError::BadRequest("code_challenge (PKCE) required".into()));
    }
    let client_name = lookup_client(&st, &client_id, &redirect_uri).await?;

    let cfg = json!({
        "base": st.public_base_url.trim_end_matches('/'),
        "client_name": client_name,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": p.code_challenge,
        "code_challenge_method": p.code_challenge_method.unwrap_or_else(|| "S256".into()),
        "scope": p.scope.unwrap_or_else(|| "mcp".into()),
        "state": p.state,
    });
    // Escape `<` so a hostile client_name can't break out of the <script> block.
    let cfg_json = serde_json::to_string(&cfg).unwrap_or_else(|_| "{}".into()).replace('<', "\\u003c");
    Ok(Html(CONSENT_TEMPLATE.replace("__CFG__", &cfg_json)))
}

#[derive(Deserialize)]
pub struct AuthorizeApproveRequest {
    pub client_id: String,
    pub redirect_uri: String,
    pub code_challenge: String,
    pub code_challenge_method: Option<String>,
    pub scope: Option<String>,
    pub state: Option<String>,
}

/// `POST /api/oauth/authorize` — the consent page calls this with the user's
/// bearer to mint an authorization code, returning the redirect URL.
pub async fn authorize_approve(
    State(st): State<McpState>,
    headers: HeaderMap,
    Json(req): Json<AuthorizeApproveRequest>,
) -> Result<Json<Value>, AppError> {
    let user = extract_user(&st.pool, &headers).await?;
    lookup_client(&st, &req.client_id, &req.redirect_uri).await?;
    if req.code_challenge_method.as_deref().unwrap_or("S256") != "S256" {
        return Err(AppError::BadRequest("only S256 PKCE is supported".into()));
    }
    if req.code_challenge.is_empty() {
        return Err(AppError::BadRequest("code_challenge required".into()));
    }
    let scope = req.scope.clone().filter(|s| !s.is_empty()).unwrap_or_else(|| "mcp".into());

    let code = random_token();
    let code_hash = sha256_hex(&code);
    sqlx::query(
        r#"INSERT INTO oauth_auth_codes
           (code_hash, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))"#,
    )
    .bind(&code_hash)
    .bind(&req.client_id)
    .bind(&user.id)
    .bind(&req.redirect_uri)
    .bind(&req.code_challenge)
    .bind("S256")
    .bind(&scope)
    .execute(&st.pool)
    .await?;

    let sep = if req.redirect_uri.contains('?') { '&' } else { '?' };
    let mut redirect = format!("{}{}code={}", req.redirect_uri, sep, pct(&code));
    if let Some(s) = req.state.as_deref().filter(|s| !s.is_empty()) {
        redirect.push_str(&format!("&state={}", pct(s)));
    }
    Ok(Json(json!({ "redirect": redirect })))
}

/// Look up a client and verify the redirect_uri is registered. Returns the name.
async fn lookup_client(st: &McpState, client_id: &str, redirect_uri: &str) -> Result<String, AppError> {
    let row = sqlx::query("SELECT client_name, redirect_uris FROM oauth_clients WHERE client_id = ?")
        .bind(client_id)
        .fetch_optional(&st.pool)
        .await?
        .ok_or_else(|| AppError::BadRequest("unknown client_id".into()))?;
    let uris: Vec<String> =
        serde_json::from_str(&row.try_get::<String, _>("redirect_uris")?).unwrap_or_default();
    if !uris.iter().any(|u| u == redirect_uri) {
        return Err(AppError::BadRequest("redirect_uri not registered for this client".into()));
    }
    Ok(row.try_get("client_name")?)
}

// ── Device Authorization Grant (RFC 8628) ───────────────────────────────────

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct DeviceAuthorizationRequest {
    pub client_id: Option<String>,
    pub scope: Option<String>,
}

pub async fn device_authorization(
    State(st): State<McpState>,
    Form(_req): Form<DeviceAuthorizationRequest>,
) -> Result<Json<Value>, AppError> {
    let device_code = random_token();
    let user_code = short_user_code();
    let device_code_hash = sha256_hex(&device_code);
    sqlx::query(
        r#"INSERT INTO oauth_device_codes (device_code_hash, user_code, expires_at)
           VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))"#,
    )
    .bind(device_code_hash)
    .bind(&user_code)
    .execute(&st.pool)
    .await?;

    let base = st.public_base_url.trim_end_matches('/');
    let verification_uri = format!("{base}/oauth/device");
    Ok(Json(json!({
        "device_code": device_code,
        "user_code": user_code,
        "verification_uri": verification_uri,
        "verification_uri_complete": format!("{verification_uri}?code={user_code}"),
        "expires_in": 600,
        "interval": 2
    })))
}

// ── Token endpoint (both grants) ────────────────────────────────────────────

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct TokenRequest {
    pub grant_type: Option<String>,
    // device grant
    pub device_code: Option<String>,
    // authorization_code grant
    pub code: Option<String>,
    pub redirect_uri: Option<String>,
    pub code_verifier: Option<String>,
    pub client_id: Option<String>,
}

pub async fn token(
    State(st): State<McpState>,
    Form(req): Form<TokenRequest>,
) -> Result<Json<Value>, AppError> {
    match req.grant_type.as_deref() {
        Some(DEVICE_CODE_GRANT) => token_device(&st, req).await,
        Some("authorization_code") => token_authcode(&st, req).await,
        _ => Err(oauth_error("unsupported_grant_type")),
    }
}

fn token_response(access_token: String, scope: &str) -> Json<Value> {
    Json(json!({
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": MCP_TOKEN_TTL_SECS,
        "scope": scope
    }))
}

async fn token_device(st: &McpState, req: TokenRequest) -> Result<Json<Value>, AppError> {
    let Some(device_code) = req.device_code.filter(|c| !c.is_empty()) else {
        return Err(oauth_error("invalid_request"));
    };
    let device_code_hash = sha256_hex(&device_code);

    // Atomic claim: consume only an approved, unexpired, unconsumed code (closes
    // the TOCTOU window where two concurrent polls could each mint a token).
    let claim = sqlx::query(
        r#"UPDATE oauth_device_codes SET consumed_at = CURRENT_TIMESTAMP
           WHERE device_code_hash = ? AND consumed_at IS NULL AND user_id IS NOT NULL
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(&device_code_hash)
    .execute(&st.pool)
    .await?;

    if claim.rows_affected() == 1 {
        let user_id: String =
            sqlx::query_scalar("SELECT user_id FROM oauth_device_codes WHERE device_code_hash = ?")
                .bind(&device_code_hash)
                .fetch_one(&st.pool)
                .await?;
        let token = create_scoped_session(
            &st.pool,
            &user_id,
            "mcp",
            Some(MCP_TOKEN_TTL_SECS),
            Some("MCP (device)"),
        )
        .await?;
        return Ok(token_response(token, "mcp"));
    }

    // Not claimed — report why.
    let row = sqlx::query(
        r#"SELECT user_id,
                  (expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP) AS expired,
                  (consumed_at IS NOT NULL) AS consumed
           FROM oauth_device_codes WHERE device_code_hash = ?"#,
    )
    .bind(&device_code_hash)
    .fetch_optional(&st.pool)
    .await?;
    let Some(row) = row else {
        return Err(oauth_error("invalid_grant"));
    };
    if row.try_get::<i64, _>("consumed").unwrap_or(0) != 0 {
        return Err(oauth_error("invalid_grant"));
    }
    if row.try_get::<i64, _>("expired").unwrap_or(0) != 0 {
        return Err(oauth_error("expired_token"));
    }
    if row.try_get::<Option<String>, _>("user_id").unwrap_or(None).is_none() {
        return Err(oauth_error("authorization_pending"));
    }
    Err(oauth_error("invalid_grant"))
}

async fn token_authcode(st: &McpState, req: TokenRequest) -> Result<Json<Value>, AppError> {
    let Some(code) = req.code.filter(|c| !c.is_empty()) else {
        return Err(oauth_error("invalid_request"));
    };
    let Some(verifier) = req.code_verifier.filter(|c| !c.is_empty()) else {
        return Err(oauth_error("invalid_request"));
    };
    let code_hash = sha256_hex(&code);

    // Atomically consume the one-time code.
    let claim = sqlx::query(
        r#"UPDATE oauth_auth_codes SET consumed_at = CURRENT_TIMESTAMP
           WHERE code_hash = ? AND consumed_at IS NULL
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(&code_hash)
    .execute(&st.pool)
    .await?;
    if claim.rows_affected() != 1 {
        return Err(oauth_error("invalid_grant"));
    }

    let row = sqlx::query(
        "SELECT user_id, client_id, redirect_uri, code_challenge, scope FROM oauth_auth_codes WHERE code_hash = ?",
    )
    .bind(&code_hash)
    .fetch_one(&st.pool)
    .await?;
    let user_id: String = row.try_get("user_id")?;
    let stored_client: String = row.try_get("client_id")?;
    let stored_redirect: String = row.try_get("redirect_uri")?;
    let challenge: String = row.try_get("code_challenge")?;
    let scope: String = row.try_get("scope").unwrap_or_else(|_| "mcp".into());

    // client_id / redirect_uri must match what the code was issued for.
    if let Some(c) = req.client_id.as_deref() {
        if c != stored_client {
            return Err(oauth_error("invalid_grant"));
        }
    }
    if let Some(r) = req.redirect_uri.as_deref() {
        if r != stored_redirect {
            return Err(oauth_error("invalid_grant"));
        }
    }
    // PKCE: base64url(sha256(verifier)) must equal the stored challenge.
    let computed = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    if computed != challenge {
        return Err(oauth_error("invalid_grant"));
    }

    let token = create_scoped_session(
        &st.pool,
        &user_id,
        &scope,
        Some(MCP_TOKEN_TTL_SECS),
        Some("MCP (OAuth)"),
    )
    .await?;
    Ok(token_response(token, &scope))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/// OAuth error → `400 { "error": code }` (AppError::BadRequest serializes that way).
fn oauth_error(code: &str) -> AppError {
    AppError::BadRequest(code.to_string())
}

/// Percent-encode a query-string value (RFC 3986 unreserved kept verbatim).
fn pct(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

const CONSENT_TEMPLATE: &str = r#"<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize · JType</title>
<style>
  :root{color-scheme:light dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f6faf7;font:15px/1.5 -apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif;color:#101816}
  .card{width:380px;max-width:92vw;background:#fff;border:1px solid #e7e5e4;border-radius:16px;
    padding:28px 26px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
  .brand{font-weight:800;letter-spacing:-.02em;color:#008884;font-size:20px;margin-bottom:18px}
  h1{font-size:20px;margin:0 0 6px;letter-spacing:-.01em}
  .muted{color:#5b716c;margin:0 0 16px}
  .scopes{margin:0 0 18px;padding-left:18px;color:#3c4a47}
  .scopes li{margin:4px 0}
  input{width:100%;padding:11px 12px;margin:0 0 10px;border:1px solid #d6dbd8;border-radius:10px;font-size:15px}
  input:focus{outline:2px solid #00888433;border-color:#008884}
  button{font:inherit;font-weight:600;cursor:pointer;border-radius:10px}
  .primary{width:100%;padding:11px;background:#008884;color:#fff;border:0;margin-top:4px}
  .primary:hover{background:#006f6b}
  .row{display:flex;gap:10px;align-items:center}
  .row .primary{flex:1}
  .link{background:none;border:0;color:#5b716c;padding:11px;text-decoration:underline}
  .err{color:#c0392b;margin:0 0 12px;font-size:14px}
</style></head><body>
<div class="card"><div class="brand">JType</div><div id="view"></div></div>
<script>
const CFG=__CFG__;const base=CFG.base;const view=document.getElementById('view');
function esc(s){const d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
function denyUrl(){const sep=CFG.redirect_uri.includes('?')?'&':'?';let u=CFG.redirect_uri+sep+'error=access_denied';if(CFG.state)u+='&state='+encodeURIComponent(CFG.state);return u}
function showLogin(msg){
 view.innerHTML='<h1>Sign in to continue</h1><p class="muted">to authorize <b>'+esc(CFG.client_name)+'</b></p>'+(msg?'<p class="err">'+esc(msg)+'</p>':'')+'<form id="lf"><input id="u" placeholder="Username" autocomplete="username"><input id="p" type="password" placeholder="Password" autocomplete="current-password"><button class="primary" type="submit">Sign in</button></form><button class="link" id="deny">Cancel</button>';
 document.getElementById('deny').onclick=function(){location.href=denyUrl()};
 document.getElementById('lf').onsubmit=async function(e){e.preventDefault();
  const r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:document.getElementById('u').value,password:document.getElementById('p').value})});
  if(!r.ok){showLogin('Invalid username or password');return}
  const d=await r.json();localStorage.setItem('jtype.token',d.token);if(d.username)localStorage.setItem('jtype.username',d.username);showConsent()};
}
function showConsent(){
 const who=localStorage.getItem('jtype.username')||'your account';
 view.innerHTML='<h1>Authorize access</h1><p class="muted"><b>'+esc(CFG.client_name)+'</b> wants to access your JType notes &amp; kanban as <b>'+esc(who)+'</b>.</p><ul class="scopes"><li>Read &amp; manage your documents</li><li>Read &amp; manage your kanban boards</li></ul><div class="row"><button class="primary" id="ap">Approve</button><button class="link" id="dn">Deny</button></div>';
 document.getElementById('dn').onclick=function(){location.href=denyUrl()};
 document.getElementById('ap').onclick=async function(){
  const tok=localStorage.getItem('jtype.token');
  const r=await fetch(base+'/api/oauth/authorize',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+tok},body:JSON.stringify({client_id:CFG.client_id,redirect_uri:CFG.redirect_uri,code_challenge:CFG.code_challenge,code_challenge_method:CFG.code_challenge_method,scope:CFG.scope,state:CFG.state})});
  if(r.status===401){localStorage.removeItem('jtype.token');showLogin('Your session expired — sign in again');return}
  if(!r.ok){let e={};try{e=await r.json()}catch(_){}view.innerHTML='<p class="err">'+esc(e.error||'Authorization failed')+'</p>';return}
  const d=await r.json();location.href=d.redirect};
}
if(localStorage.getItem('jtype.token'))showConsent();else showLogin();
</script></body></html>"#;
