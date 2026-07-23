//! Central authorization boundary between external REST requests and scoped
//! agent credentials.
//!
//! MCP tools call the same Axum API router in process. They attach
//! [`InternalMcpDispatch`] directly to the request extensions after the MCP
//! endpoint has validated its own authority. HTTP clients cannot create request
//! extensions, so the bypass is not representable on the wire.

use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use sqlx::{MySql, Pool};

use crate::{error::AppError, util::sha256_hex};

/// Capability marker for a request dispatched internally by an authenticated
/// MCP tool. This is crate-private by design: never derive it from a header.
#[derive(Clone, Copy, Debug)]
pub(crate) struct InternalMcpDispatch;

/// Require a `full` session for external `/api/**` requests.
///
/// Anonymous requests and unknown/expired credentials continue to the target
/// handler so its existing authentication/public-route semantics remain
/// authoritative. A known active scoped credential is rejected centrally.
pub async fn require_full_scope(
    State(pool): State<Pool<MySql>>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    if !request.uri().path().starts_with("/api/") {
        return Ok(next.run(request).await);
    }

    if request.extensions().get::<InternalMcpDispatch>().is_some() {
        return Ok(next.run(request).await);
    }

    let Some(raw_token) = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(next.run(request).await);
    };

    let scope = sqlx::query_scalar::<_, String>(
        r#"SELECT scope
           FROM sessions
           WHERE token_hash = ?
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(sha256_hex(raw_token))
    .fetch_optional(&pool)
    .await?;

    if scope.as_deref().is_some_and(|scope| scope != "full") {
        return Err(AppError::Forbidden);
    }

    Ok(next.run(request).await)
}
