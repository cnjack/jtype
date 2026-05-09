use axum::http::{header, HeaderMap};
use sqlx::{MySql, Pool, Row};

use crate::db::models::AuthUser;
use crate::error::AppError;
use crate::util::sha256_hex;

pub async fn extract_user(pool: &Pool<MySql>, headers: &HeaderMap) -> Result<AuthUser, AppError> {
    let token = bearer_token(headers)?;
    let token_hash = sha256_hex(token);
    let row = sqlx::query(
        r#"SELECT u.id, u.username, u.role, u.disabled_at
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ?
             AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let disabled_at: Option<String> = row.try_get("disabled_at").unwrap_or(None);
    if disabled_at.is_some() {
        return Err(AppError::Forbidden);
    }

    Ok(AuthUser {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        role: row.try_get("role")?,
    })
}

pub fn require_admin(user: &AuthUser) -> Result<(), AppError> {
    if user.role == "admin" {
        Ok(())
    } else {
        Err(AppError::Forbidden)
    }
}

fn bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    let value = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;
    value
        .strip_prefix("Bearer ")
        .filter(|t| !t.trim().is_empty())
        .ok_or(AppError::Unauthorized)
}
