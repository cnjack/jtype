//! Email-based flows: password reset and email verification.
//!
//! Both use single-use, SHA-256-hashed tokens (matching the session /
//! oauth_device_codes pattern) written to `password_reset_tokens` /
//! `email_verification_tokens` (migration 0014). Password reset is
//! anti-enumeration: a forgot-password request always returns the same
//! "if the email exists, a link was sent" response whether or not the address
//! is known, so an attacker can't probe which emails are registered.

use axum::{extract::State, http::HeaderMap, http::StatusCode, Json};
use serde::Deserialize;
use sqlx::Row;

use crate::error::AppError;
use crate::handlers::auth::create_session;
use crate::mail;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;
use crate::db::models::AuthResponse;

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordRequest {
    pub token: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OtpSendRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OtpVerifyRequest {
    pub email: String,
    pub code: String,
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/// POST /api/auth/forgot-password
///
/// Always returns 204, regardless of whether the email exists, is verified, or
/// SMTP is configured — to prevent account enumeration. Sends a reset link only
/// when an SMTP mailer is available AND the user has a verified email.
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<StatusCode, AppError> {
    let email = payload.email.trim().to_ascii_lowercase();

    // Look up a user with this email whose address is verified. No row → silent
    // no-op (still 204) so the response is indistinguishable from success.
    let row = sqlx::query(
        r#"SELECT id, username FROM users
           WHERE LOWER(email) = ? AND email_verified_at IS NOT NULL
             AND disabled_at IS NULL"#,
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(row) = row {
        let user_id: String = row.try_get("id")?;
        let username: String = row.try_get("username")?;

        // Snapshot the mailer (None when SMTP unconfigured) — no lock held across await.
        if let Some(mailer) = state.mailer_snapshot() {
            let token = random_token();
            let token_hash = sha256_hex(&token);
            sqlx::query(
                r#"INSERT INTO password_reset_tokens (token_hash, user_id)
                   VALUES (?, ?)"#,
            )
            .bind(&token_hash)
            .bind(&user_id)
            .execute(&state.pool)
            .await?;

            let reset_url = format!(
                "{}/reset-password?token={}",
                state.public_base_url.trim_end_matches('/'),
                token
            );
            let email_msg = mail::render_email(
                "Reset your password",
                &[
                    &format!("Hi {username},"),
                    "We received a request to reset your JType password.",
                    "Click the button below to choose a new one. This link expires in 10 minutes.",
                    "If you didn't request this, you can safely ignore this email.",
                ],
                Some("Reset password"),
                Some(&reset_url),
                None,
            );
            // Best-effort send: a failure here must NOT surface to the caller
            // (it would leak whether SMTP / the account works). Log + move on.
            if let Err(e) = mailer.send(&email, email_msg).await {
                eprintln!("[mail] password-reset send to {email} failed: {e}");
            }
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/auth/reset-password
///
/// Atomically claims the token (approved + unexpired + unconsumed), validates
/// the new password, and updates it. Single-use: the claim marks it consumed so
/// a replay fails.
pub async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<StatusCode, AppError> {
    validate_password(&payload.password)?;
    let token_hash = sha256_hex(payload.token.trim());

    // Atomic claim: only succeeds for an unexpired, unconsumed token.
    let claim = sqlx::query(
        r#"UPDATE password_reset_tokens SET consumed_at = CURRENT_TIMESTAMP
           WHERE token_hash = ? AND consumed_at IS NULL
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(&token_hash)
    .execute(&state.pool)
    .await?;

    if claim.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "reset link is invalid or expired".to_string(),
        ));
    }

    let user_id: String = sqlx::query("SELECT user_id FROM password_reset_tokens WHERE token_hash = ?")
        .bind(&token_hash)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::BadRequest("reset link is invalid or expired".to_string()))?
        .try_get("user_id")?;

    let password_hash = hash_password(&payload.password)?;
    let result = sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(password_hash)
        .bind(&user_id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // Invalidate all existing sessions for this user (force re-login).
    let _ = sqlx::query("DELETE FROM sessions WHERE user_id = ?")
        .bind(&user_id)
        .execute(&state.pool)
        .await;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/// POST /api/me/send-email-verification
///
/// Requires login. Generates a verification token for the caller's email and
/// sends a verification link. Fails if the user has no email or SMTP is down.
pub async fn send_email_verification(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;

    let row = sqlx::query("SELECT email, username FROM users WHERE id = ?")
        .bind(&user.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let email: Option<String> = row.try_get("email")?;
    let username: String = row.try_get("username")?;
    let email = email.ok_or_else(|| {
        AppError::BadRequest("set an email in your profile first".to_string())
    })?;

    let mailer = state.mailer_snapshot().ok_or_else(|| {
        AppError::Server("email is not configured on this server".to_string())
    })?;

    let token = random_token();
    let token_hash = sha256_hex(&token);
    sqlx::query(
        r#"INSERT INTO email_verification_tokens (token_hash, user_id, email)
           VALUES (?, ?, ?)"#,
    )
    .bind(&token_hash)
    .bind(&user.id)
    .bind(&email)
    .execute(&state.pool)
    .await?;

    let verify_url = format!(
        "{}/verify-email?token={}",
        state.public_base_url.trim_end_matches('/'),
        token
    );
    let email_msg = mail::render_email(
        "Verify your email",
        &[
            &format!("Hi {username},"),
            "Confirm this email address for your JType account.",
            "Click below to verify. This link expires in 24 hours.",
        ],
        Some("Verify email"),
        Some(&verify_url),
        None,
    );
    mailer.send(&email, email_msg).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/auth/verify-email
///
/// Atomically claims the verification token and marks the user's email
/// verified. The token carries the email, so it verifies the address bound at
/// issue time (a concurrent change invalidates it via the cleared email column
/// check below).
pub async fn verify_email(
    State(state): State<AppState>,
    Json(payload): Json<VerifyEmailRequest>,
) -> Result<StatusCode, AppError> {
    let token_hash = sha256_hex(payload.token.trim());

    // Atomic claim for an unexpired, unconsumed token.
    let claim = sqlx::query(
        r#"UPDATE email_verification_tokens SET consumed_at = CURRENT_TIMESTAMP
           WHERE token_hash = ? AND consumed_at IS NULL
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(&token_hash)
    .execute(&state.pool)
    .await?;
    if claim.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "verification link is invalid or expired".to_string(),
        ));
    }

    let row = sqlx::query(
        r#"SELECT user_id, email FROM email_verification_tokens WHERE token_hash = ?"#,
    )
    .bind(&token_hash)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::BadRequest("verification link is invalid or expired".to_string()))?;
    let user_id: String = row.try_get("user_id")?;
    let token_email: String = row.try_get("email")?;

    // Only verify if the user's current email still matches the one the token
    // was issued for (a change in between invalidates this link).
    let result = sqlx::query(
        r#"UPDATE users SET email_verified_at = CURRENT_TIMESTAMP
           WHERE id = ? AND LOWER(email) = LOWER(?)"#,
    )
    .bind(&user_id)
    .bind(&token_email)
    .execute(&state.pool)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "this link no longer matches your current email".to_string(),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// Email OTP login
//
// Two-step passwordless login: send a 6-digit code to a verified email, then
// verify it to mint a session. The code is SHA-256-hashed at rest (like the
// other token tables). Brute force is blunted by an attempt cap (5 wrong tries
// locks the code) plus the 10-minute expiry. `otp_send` is anti-enumeration:
// it returns 204 whether or not the email is registered/verified, so an
// attacker can't probe addresses. `otp_verify` surfaces a concrete error so a
// legitimate user knows to retry / request a new code.
// ---------------------------------------------------------------------------

/// Maximum wrong-code attempts before an OTP code is locked.
const OTP_MAX_ATTEMPTS: i64 = 5;

/// POST /api/auth/otp/send
///
/// Generates a 6-digit code and emails it to the verified owner of `email`.
/// Always returns 204 (anti-enumeration): an unknown / unverified email or a
/// server without SMTP simply does nothing. Requires SMTP to be configured for
/// any mail to actually leave.
pub async fn otp_send(
    State(state): State<AppState>,
    Json(payload): Json<OtpSendRequest>,
) -> Result<StatusCode, AppError> {
    let email = payload.email.trim().to_ascii_lowercase();

    // Look up a verified, enabled user for this email. No row → silent no-op.
    let row = sqlx::query(
        r#"SELECT id, username FROM users
           WHERE LOWER(email) = ? AND email_verified_at IS NOT NULL
             AND disabled_at IS NULL"#,
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(row) = row {
        let user_id: String = row.try_get("id")?;
        let username: String = row.try_get("username")?;

        if let Some(mailer) = state.mailer_snapshot() {
            let code = short_user_code();
            let token_hash = sha256_hex(&code);
            sqlx::query(
                r#"INSERT INTO login_otp_tokens (token_hash, user_id, email)
                   VALUES (?, ?, ?)"#,
            )
            .bind(&token_hash)
            .bind(&user_id)
            .bind(&email)
            .execute(&state.pool)
            .await?;

            let email_msg = mail::render_email(
                "Your JType login code",
                &[
                    &format!("Hi {username},"),
                    "Use this 6-digit code to sign in to your JType account.",
                    "The code expires in 10 minutes. If you didn't request it, you can ignore this email.",
                ],
                None,
                None,
                Some(&code),
            );
            if let Err(e) = mailer.send(&email, email_msg).await {
                eprintln!("[mail] otp send to {email} failed: {e}");
            }
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/auth/otp/verify
///
/// Verifies the 6-digit code for `email` and, on success, mints a full-scope
/// session. Attempt tracking is per-email (not per-code-hash): a wrong code
/// still matches the latest unconsumed code row for the email, which lets us
/// increment its `attempts` counter. After [`OTP_MAX_ATTEMPTS`] wrong tries
/// (or on expiry) the row is rejected and the user must request a new code.
pub async fn otp_verify(
    State(state): State<AppState>,
    Json(payload): Json<OtpVerifyRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let email = payload.email.trim().to_ascii_lowercase();
    let submitted_hash = sha256_hex(payload.code.trim());

    // The latest unconsumed code for this email — regardless of whether the
    // submitted code matches. This lets us count wrong attempts against the
    // same issued code, so a brute-force across requests is bounded.
    let row = sqlx::query(
        r#"SELECT token_hash, user_id, attempts,
                  (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) AS not_expired
           FROM login_otp_tokens
           WHERE LOWER(email) = ? AND consumed_at IS NULL
           ORDER BY created_at DESC LIMIT 1"#,
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::BadRequest("request a login code first".to_string()))?;

    let stored_hash: String = row.try_get("token_hash")?;
    let user_id: String = row.try_get("user_id")?;
    let attempts: i64 = row.try_get("attempts").unwrap_or(0);
    let not_expired: i64 = row.try_get("not_expired").unwrap_or(0);

    if not_expired == 0 {
        return Err(AppError::BadRequest("code expired, request a new one".to_string()));
    }
    if attempts >= OTP_MAX_ATTEMPTS {
        return Err(AppError::BadRequest("too many wrong attempts, request a new code".to_string()));
    }

    if stored_hash != submitted_hash {
        // Wrong code: bump the attempt counter on this issued code.
        sqlx::query("UPDATE login_otp_tokens SET attempts = attempts + 1 WHERE token_hash = ?")
            .bind(&stored_hash)
            .execute(&state.pool)
            .await?;
        return Err(AppError::BadRequest("wrong code".to_string()));
    }

    // Correct code: consume it atomically (single-use).
    let claim = sqlx::query(
        r#"UPDATE login_otp_tokens SET consumed_at = CURRENT_TIMESTAMP
           WHERE token_hash = ? AND consumed_at IS NULL"#,
    )
    .bind(&stored_hash)
    .execute(&state.pool)
    .await?;
    if claim.rows_affected() == 0 {
        // Consumed concurrently between our SELECT and UPDATE.
        return Err(AppError::BadRequest("invalid or expired code".to_string()));
    }

    // Mint a session and resolve username/role for the response.
    let token = create_session(&state.pool, &user_id).await?;
    let urow = sqlx::query(r#"SELECT username, role FROM users WHERE id = ?"#)
        .bind(&user_id)
        .fetch_one(&state.pool)
        .await?;
    let username: String = urow.try_get("username")?;
    let role: String = urow.try_get("role")?;
    let site = crate::util::site_url(&state.public_base_url, &username);
    Ok(Json(AuthResponse {
        token,
        username,
        site_url: site,
        role,
    }))
}
