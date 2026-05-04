use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;

pub async fn add(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<AddDomainRequest>,
) -> Result<Json<DomainResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let domain = payload.domain.trim().to_ascii_lowercase();
    if domain.is_empty() || domain.len() > 253 || !domain.contains('.') {
        return Err(AppError::BadRequest("invalid domain name".to_string()));
    }
    if let Some(workspace_id) = payload.workspace_id.as_deref() {
        require_workspace_role(&state.pool, workspace_id, &user.id, &["owner", "admin"]).await?;
    }
    let id = Uuid::new_v4().to_string();
    let verification_token = random_token();
    sqlx::query(
        r#"INSERT INTO custom_domains (id, user_id, workspace_id, domain, verification_token) VALUES (?, ?, ?, ?, ?)"#,
    )
    .bind(&id)
    .bind(&user.id)
    .bind(&payload.workspace_id)
    .bind(&domain)
    .bind(&verification_token)
    .execute(&state.pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db) if db.is_unique_violation() => {
            AppError::BadRequest("domain already registered".to_string())
        }
        other => AppError::Database(other),
    })?;
    Ok(Json(
        load_domain_response(&state.pool, &user.id, &id).await?,
    ))
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<DomainResponse>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let rows = sqlx::query(
        r#"SELECT d.id, d.domain, d.workspace_id, w.name AS workspace_name,
                  d.verification_token, d.status, d.verified_at,
                  c.status AS ssl_status, c.not_after AS ssl_expires_at
           FROM custom_domains d
           LEFT JOIN workspaces w ON w.id = d.workspace_id
           LEFT JOIN ssl_certificates c ON c.domain_id = d.id AND c.status = 'active'
           WHERE d.user_id = ?
           ORDER BY d.created_at ASC"#,
    )
    .bind(&user.id)
    .fetch_all(&state.pool)
    .await?;
    let domains = rows
        .into_iter()
        .map(|row| {
            let vt: String = row.try_get("verification_token").unwrap_or_default();
            DomainResponse {
                id: row.try_get("id").unwrap_or_default(),
                domain: row.try_get("domain").unwrap_or_default(),
                workspace_id: row
                    .try_get::<Option<String>, _>("workspace_id")
                    .unwrap_or(None),
                workspace_name: row
                    .try_get::<Option<String>, _>("workspace_name")
                    .unwrap_or(None),
                dns_txt_record: format!("jtype-verify={}", vt),
                verification_token: vt,
                status: row.try_get("status").unwrap_or_default(),
                verified_at: row
                    .try_get::<Option<String>, _>("verified_at")
                    .unwrap_or(None),
                ssl_status: row
                    .try_get::<Option<String>, _>("ssl_status")
                    .unwrap_or(None),
                ssl_expires_at: row
                    .try_get::<Option<String>, _>("ssl_expires_at")
                    .unwrap_or(None),
            }
        })
        .collect();
    Ok(Json(domains))
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(domain_id): Path<String>,
) -> Result<Json<DomainResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let row = sqlx::query(
        r#"SELECT d.id, d.domain, d.workspace_id, w.name AS workspace_name,
                  d.verification_token, d.status, d.verified_at,
                  c.status AS ssl_status, c.not_after AS ssl_expires_at
           FROM custom_domains d
           LEFT JOIN workspaces w ON w.id = d.workspace_id
           LEFT JOIN ssl_certificates c ON c.domain_id = d.id AND c.status = 'active'
           WHERE d.id = ? AND d.user_id = ?"#,
    )
    .bind(&domain_id)
    .bind(&user.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let vt: String = row.try_get("verification_token")?;
    Ok(Json(DomainResponse {
        id: row.try_get("id")?,
        domain: row.try_get("domain")?,
        workspace_id: row
            .try_get::<Option<String>, _>("workspace_id")
            .unwrap_or(None),
        workspace_name: row
            .try_get::<Option<String>, _>("workspace_name")
            .unwrap_or(None),
        dns_txt_record: format!("jtype-verify={}", vt),
        verification_token: vt,
        status: row.try_get("status")?,
        verified_at: row
            .try_get::<Option<String>, _>("verified_at")
            .unwrap_or(None),
        ssl_status: row
            .try_get::<Option<String>, _>("ssl_status")
            .unwrap_or(None),
        ssl_expires_at: row
            .try_get::<Option<String>, _>("ssl_expires_at")
            .unwrap_or(None),
    }))
}

pub async fn bind_workspace(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(domain_id): Path<String>,
    Json(payload): Json<BindDomainRequest>,
) -> Result<Json<DomainResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    if let Some(workspace_id) = payload.workspace_id.as_deref() {
        require_workspace_role(&state.pool, workspace_id, &user.id, &["owner", "admin"]).await?;
    }
    let result =
        sqlx::query("UPDATE custom_domains SET workspace_id = ? WHERE id = ? AND user_id = ?")
            .bind(&payload.workspace_id)
            .bind(&domain_id)
            .bind(&user.id)
            .execute(&state.pool)
            .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(
        load_domain_response(&state.pool, &user.id, &domain_id).await?,
    ))
}

pub async fn verify(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(domain_id): Path<String>,
) -> Result<Json<DomainResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let row = sqlx::query("SELECT id, domain, verification_token, status FROM custom_domains WHERE id = ? AND user_id = ?")
        .bind(&domain_id)
        .bind(&user.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let status: String = row.try_get("status")?;
    if status == "verified" {
        return Err(AppError::BadRequest(
            "domain is already verified".to_string(),
        ));
    }
    sqlx::query("UPDATE custom_domains SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&domain_id)
        .execute(&state.pool)
        .await?;
    Ok(Json(
        load_domain_response(&state.pool, &user.id, &domain_id).await?,
    ))
}

pub async fn upload_certificate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(domain_id): Path<String>,
    Json(payload): Json<UploadCertificateRequest>,
) -> Result<Json<DomainResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let row = sqlx::query("SELECT id, domain, verification_token, status FROM custom_domains WHERE id = ? AND user_id = ?")
        .bind(&domain_id)
        .bind(&user.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let domain_status: String = row.try_get("status")?;
    if domain_status != "verified" {
        return Err(AppError::BadRequest(
            "domain must be verified before uploading a certificate".to_string(),
        ));
    }
    let cert_pem = payload.cert_chain_pem.trim().to_string();
    let key_pem = payload.private_key_pem.trim().to_string();
    if !cert_pem.starts_with("-----BEGIN CERTIFICATE-----") {
        return Err(AppError::BadRequest(
            "cert_chain_pem must be a PEM-encoded certificate".to_string(),
        ));
    }
    if !key_pem.starts_with("-----BEGIN") || !key_pem.contains("PRIVATE KEY") {
        return Err(AppError::BadRequest(
            "private_key_pem must be a PEM-encoded private key".to_string(),
        ));
    }
    let private_key_hash = sha256_hex(&key_pem);
    sqlx::query(
        "UPDATE ssl_certificates SET status = 'revoked' WHERE domain_id = ? AND status = 'active'",
    )
    .bind(&domain_id)
    .execute(&state.pool)
    .await?;
    let cert_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO ssl_certificates (id, domain_id, cert_chain_pem, private_key_hash, status) VALUES (?, ?, ?, ?, 'active')"#,
    )
    .bind(&cert_id)
    .bind(&domain_id)
    .bind(&cert_pem)
    .bind(&private_key_hash)
    .execute(&state.pool)
    .await?;
    Ok(Json(
        load_domain_response(&state.pool, &user.id, &domain_id).await?,
    ))
}

async fn load_domain_response(
    pool: &sqlx::Pool<sqlx::MySql>,
    user_id: &str,
    domain_id: &str,
) -> Result<DomainResponse, AppError> {
    let row = sqlx::query(
        r#"SELECT d.id, d.domain, d.workspace_id, w.name AS workspace_name,
                  d.verification_token, d.status, d.verified_at,
                  c.status AS ssl_status, c.not_after AS ssl_expires_at
           FROM custom_domains d
           LEFT JOIN workspaces w ON w.id = d.workspace_id
           LEFT JOIN ssl_certificates c ON c.domain_id = d.id AND c.status = 'active'
           WHERE d.id = ? AND d.user_id = ?"#,
    )
    .bind(domain_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let vt: String = row.try_get("verification_token")?;
    Ok(DomainResponse {
        id: row.try_get("id")?,
        domain: row.try_get("domain")?,
        workspace_id: row
            .try_get::<Option<String>, _>("workspace_id")
            .unwrap_or(None),
        workspace_name: row
            .try_get::<Option<String>, _>("workspace_name")
            .unwrap_or(None),
        verification_token: vt.clone(),
        dns_txt_record: format!("jtype-verify={}", vt),
        status: row.try_get("status")?,
        verified_at: row
            .try_get::<Option<String>, _>("verified_at")
            .unwrap_or(None),
        ssl_status: row
            .try_get::<Option<String>, _>("ssl_status")
            .unwrap_or(None),
        ssl_expires_at: row
            .try_get::<Option<String>, _>("ssl_expires_at")
            .unwrap_or(None),
    })
}
