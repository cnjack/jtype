use axum::{extract::State, http::HeaderMap, Json};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;

pub async fn register(
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

    let existing_users: i64 = sqlx::query("SELECT COUNT(*) AS count FROM users")
        .fetch_one(&state.pool)
        .await?
        .try_get("count")?;
    let role = if existing_users == 0 { "admin" } else { "user" };

    sqlx::query(
        r#"INSERT INTO users (id, username, password_hash, site_title, role)
           VALUES (?, ?, ?, ?, ?)"#,
    )
    .bind(&user_id)
    .bind(&username)
    .bind(password_hash)
    .bind(&site_title)
    .bind(role)
    .execute(&state.pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            AppError::BadRequest("username already exists".to_string())
        }
        other => AppError::Database(other),
    })?;

    let token = create_session(&state.pool, &user_id).await?;
    let site = site_url(&state.public_base_url, &username);
    Ok(Json(AuthResponse {
        token,
        username,
        site_url: site,
        role: role.to_string(),
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let username = normalize_username(&payload.username)?;
    let row =
        sqlx::query("SELECT id, password_hash, role, disabled_at FROM users WHERE username = ?")
            .bind(&username)
            .fetch_optional(&state.pool)
            .await?
            .ok_or(AppError::Unauthorized)?;

    let disabled_at: Option<String> = row.try_get("disabled_at").unwrap_or(None);
    if disabled_at.is_some() {
        return Err(AppError::Forbidden);
    }

    let user_id: String = row.try_get("id")?;
    let pw_hash: String = row.try_get("password_hash")?;
    let role: String = row.try_get("role")?;
    verify_password(&payload.password, &pw_hash)?;

    let token = create_session(&state.pool, &user_id).await?;
    let site = site_url(&state.public_base_url, &username);
    Ok(Json(AuthResponse {
        token,
        username,
        site_url: site,
        role,
    }))
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    Ok(Json(AuthResponse {
        token: String::new(),
        username: user.username.clone(),
        site_url: site_url(&state.public_base_url, &user.username),
        role: user.role,
    }))
}

pub async fn create_session(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
) -> Result<String, AppError> {
    let token = random_token();
    let token_hash = sha256_hex(&token);
    sqlx::query("INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)")
        .bind(token_hash)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(token)
}
