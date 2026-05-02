use axum::{extract::State, http::HeaderMap, Json};
use sqlx::Row;

use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::auth::create_session;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;
use axum::http::StatusCode;

pub async fn start(
    State(state): State<AppState>,
    Json(payload): Json<DeviceOAuthStartRequest>,
) -> Result<Json<DeviceOAuthStartResponse>, AppError> {
    let _device_id = payload.device_id.unwrap_or_else(|| "desktop".to_string());
    let device_code = random_token();
    let user_code = short_user_code();
    let device_code_hash = sha256_hex(&device_code);
    sqlx::query(
        r#"INSERT INTO oauth_device_codes (device_code_hash, user_code, expires_at)
           VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))"#,
    )
    .bind(device_code_hash)
    .bind(&user_code)
    .execute(&state.pool)
    .await?;
    Ok(Json(DeviceOAuthStartResponse {
        device_code,
        verification_url: format!(
            "{}/oauth/device?code={}",
            state.public_base_url.trim_end_matches('/'),
            user_code
        ),
        user_code,
    }))
}

pub async fn approve(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<DeviceOAuthApproveRequest>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let user_code = payload.user_code.trim().to_ascii_uppercase();
    let result = sqlx::query(
        r#"UPDATE oauth_device_codes SET user_id = ?, approved_at = CURRENT_TIMESTAMP
           WHERE user_code = ? AND approved_at IS NULL AND consumed_at IS NULL
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(&user.id)
    .bind(user_code)
    .execute(&state.pool)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn poll(
    State(state): State<AppState>,
    Json(payload): Json<DeviceOAuthPollRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let device_code_hash = sha256_hex(&payload.device_code);
    let row = sqlx::query(
        r#"SELECT d.user_id, u.username, u.role
           FROM oauth_device_codes d
           LEFT JOIN users u ON u.id = d.user_id
           WHERE d.device_code_hash = ? AND d.consumed_at IS NULL
             AND (d.expires_at IS NULL OR d.expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(&device_code_hash)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let user_id: Option<String> = row.try_get("user_id")?;
    let username: Option<String> = row.try_get("username")?;
    let role: Option<String> = row.try_get("role")?;
    let Some(user_id) = user_id else {
        return Err(AppError::BadRequest("authorization pending".to_string()));
    };
    let username = username.ok_or(AppError::Unauthorized)?;
    let role = role.ok_or(AppError::Unauthorized)?;
    sqlx::query("UPDATE oauth_device_codes SET consumed_at = CURRENT_TIMESTAMP WHERE device_code_hash = ?")
        .bind(device_code_hash)
        .execute(&state.pool)
        .await?;
    let token = create_session(&state.pool, &user_id).await?;
    Ok(Json(AuthResponse {
        token,
        username: username.clone(),
        site_url: site_url(&state.public_base_url, &username),
        role,
    }))
}
