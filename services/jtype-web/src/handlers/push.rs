use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::{middleware::auth::extract_user, util::sha256_hex, AppError, AppState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterPushPayload {
    pub device_id: String,
    pub platform: String,
    pub provider: String,
    pub environment: String,
    pub identifier_kind: String,
    pub identifier: String,
    pub app_version: Option<String>,
    pub locale: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushRegistrationResponse {
    pub registered: bool,
    pub device_id: String,
    pub platform: String,
    pub provider: String,
    pub environment: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushRegistrationSummary {
    pub device_id: String,
    pub platform: String,
    pub provider: String,
    pub environment: String,
    pub app_version: Option<String>,
    pub locale: Option<String>,
    pub updated_at: String,
}

pub async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RegisterPushPayload>,
) -> Result<Json<PushRegistrationResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_full_mobile_session(&user.scope, &headers)?;
    let registration = validate(payload)?;
    let identifier_hash = sha256_hex(&registration.identifier);
    let mut transaction = state.pool.begin().await?;

    // A provider identifier names one current app installation. Rotation or a
    // different signed-in user must atomically transfer it, never fan it out.
    sqlx::query(
        r#"DELETE FROM mobile_push_registrations
           WHERE identifier_hash = ?
             AND NOT (user_id = ? AND device_id = ? AND platform = ?)"#,
    )
    .bind(&identifier_hash)
    .bind(&user.id)
    .bind(&registration.device_id)
    .bind(&registration.platform)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"INSERT INTO mobile_push_registrations
             (id, user_id, device_id, platform, provider, environment, identifier_kind,
              identifier_hash, provider_identifier, app_version, locale)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             provider = VALUES(provider), environment = VALUES(environment),
             identifier_kind = VALUES(identifier_kind),
             identifier_hash = VALUES(identifier_hash),
             provider_identifier = VALUES(provider_identifier),
             app_version = VALUES(app_version), locale = VALUES(locale),
             updated_at = CURRENT_TIMESTAMP"#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&user.id)
    .bind(&registration.device_id)
    .bind(&registration.platform)
    .bind(&registration.provider)
    .bind(&registration.environment)
    .bind(&registration.identifier_kind)
    .bind(identifier_hash)
    .bind(&registration.identifier)
    .bind(&registration.app_version)
    .bind(&registration.locale)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(Json(PushRegistrationResponse {
        registered: true,
        device_id: registration.device_id,
        platform: registration.platform,
        provider: registration.provider,
        environment: registration.environment,
    }))
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<PushRegistrationSummary>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    if user.scope != "full" {
        return Err(AppError::Forbidden);
    }
    let rows = sqlx::query(
        r#"SELECT device_id, platform, provider, environment, app_version, locale,
                  CAST(updated_at AS CHAR) AS updated_at
           FROM mobile_push_registrations
           WHERE user_id = ?
           ORDER BY updated_at DESC, device_id ASC"#,
    )
    .bind(&user.id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(
        rows.into_iter()
            .map(|row| PushRegistrationSummary {
                device_id: row.try_get("device_id").unwrap_or_default(),
                platform: row.try_get("platform").unwrap_or_default(),
                provider: row.try_get("provider").unwrap_or_default(),
                environment: row.try_get("environment").unwrap_or_default(),
                app_version: row.try_get("app_version").unwrap_or(None),
                locale: row.try_get("locale").unwrap_or(None),
                updated_at: row.try_get("updated_at").unwrap_or_default(),
            })
            .collect(),
    ))
}

pub async fn unregister(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((platform, device_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_full_mobile_session(&user.scope, &headers)?;
    let platform = normalize_platform(&platform)?;
    let device_id = bounded_field(&device_id, 128, "deviceId")?;
    sqlx::query(
        "DELETE FROM mobile_push_registrations WHERE user_id = ? AND device_id = ? AND platform = ?",
    )
    .bind(&user.id)
    .bind(device_id)
    .bind(platform)
    .execute(&state.pool)
    .await?;
    Ok(Json(serde_json::json!({ "unregistered": true })))
}

fn require_full_mobile_session(scope: &str, headers: &HeaderMap) -> Result<(), AppError> {
    if scope != "full" {
        return Err(AppError::Forbidden);
    }
    let mobile = headers
        .get("x-client-type")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("mobile"));
    if !mobile {
        return Err(AppError::BadRequest(
            "push registration requires x-client-type: mobile".to_string(),
        ));
    }
    Ok(())
}

fn validate(payload: RegisterPushPayload) -> Result<RegisterPushPayload, AppError> {
    let device_id = bounded_field(&payload.device_id, 128, "deviceId")?;
    let platform = normalize_platform(&payload.platform)?;
    let provider = payload.provider.trim().to_ascii_lowercase();
    let expected_provider = if platform == "android" { "fcm" } else { "apns" };
    if provider != expected_provider {
        return Err(AppError::BadRequest(format!(
            "{platform} push registrations must use {expected_provider}"
        )));
    }
    let environment = payload.environment.trim().to_ascii_lowercase();
    let valid_environment = match platform.as_str() {
        "android" => environment == "production",
        "ios" => matches!(environment.as_str(), "development" | "production"),
        _ => false,
    };
    if !valid_environment {
        return Err(AppError::BadRequest("invalid push environment".to_string()));
    }
    let identifier_kind = payload.identifier_kind.trim().to_string();
    let expected_identifier_kind = if platform == "android" {
        "fid"
    } else {
        "deviceToken"
    };
    if identifier_kind != expected_identifier_kind {
        return Err(AppError::BadRequest(format!(
            "{platform} push registrations must use {expected_identifier_kind}"
        )));
    }
    let identifier = payload.identifier.trim().to_string();
    let identifier_valid = if platform == "ios" {
        identifier.len() == 64 && identifier.bytes().all(|value| value.is_ascii_hexdigit())
    } else {
        (16..=256).contains(&identifier.len())
            && identifier
                .chars()
                .all(|value| !value.is_whitespace() && !value.is_control())
    };
    if !identifier_valid {
        return Err(AppError::BadRequest(
            "invalid push provider identifier".to_string(),
        ));
    }
    let normalized_identifier = if platform == "ios" {
        identifier.to_ascii_lowercase()
    } else {
        identifier
    };
    Ok(RegisterPushPayload {
        device_id,
        platform,
        provider,
        environment,
        identifier_kind,
        identifier: normalized_identifier,
        app_version: optional_bounded(payload.app_version, 64, "appVersion")?,
        locale: optional_bounded(payload.locale, 32, "locale")?,
    })
}

fn normalize_platform(value: &str) -> Result<String, AppError> {
    match value.trim().to_ascii_lowercase().as_str() {
        "android" => Ok("android".to_string()),
        "ios" => Ok("ios".to_string()),
        _ => Err(AppError::BadRequest("invalid push platform".to_string())),
    }
}

fn bounded_field(value: &str, max: usize, name: &str) -> Result<String, AppError> {
    let value = value.trim();
    if value.is_empty() || value.len() > max || value.chars().any(char::is_control) {
        return Err(AppError::BadRequest(format!("invalid {name}")));
    }
    Ok(value.to_string())
}

fn optional_bounded(
    value: Option<String>,
    max: usize,
    name: &str,
) -> Result<Option<String>, AppError> {
    value
        .map(|value| bounded_field(&value, max, name))
        .transpose()
}
