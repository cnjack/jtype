//! Integration tests for email login: password login by email, and OTP login.
//!
//! OTP send/verify is exercised by reading the issued code directly out of the
//! `login_otp_tokens` table (sending requires a live SMTP server, which the
//! `build_router` test harness does not configure).

mod common;

use axum::http::StatusCode;
use jtype_web::util::sha256_hex;
use serde_json::json;

/// A verified user can sign in by typing their email in the username field.
#[tokio::test]
async fn login_by_email_password_succeeds_for_verified_user() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");

    // Register, then mark the email verified.
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    sqlx::query("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE username = ?")
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    // Login using the EMAIL in the username field.
    let (status, body) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &email, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "email login failed: {body}");
    // The response carries the username, not the email.
    assert_eq!(body["username"].as_str().unwrap(), username);
}

/// An unverified email cannot be used to log in (reverts to "unauthorized").
#[tokio::test]
async fn login_by_email_rejected_when_unverified() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    // email_verified_at stays NULL.
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &email, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

/// A wrong password with a valid email is still unauthorized (no enumeration).
#[tokio::test]
async fn login_by_email_wrong_password_unauthorized() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    sqlx::query("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE username = ?")
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    let (status, _body) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &email, "password": "WrongPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

/// OTP send is anti-enumeration: returns 204 for both known and unknown emails.
#[tokio::test]
async fn otp_send_is_anti_enumeration() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    sqlx::query("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE username = ?")
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    let (status_known, _) = common::req(
        app.clone(),
        "POST",
        "/api/auth/otp/send",
        None,
        Some(json!({ "email": &email })),
    )
    .await;
    let (status_unknown, _) = common::req(
        app,
        "POST",
        "/api/auth/otp/send",
        None,
        Some(json!({ "email": "nobody@nowhere.invalid" })),
    )
    .await;
    assert_eq!(status_known, StatusCode::NO_CONTENT);
    assert_eq!(status_unknown, StatusCode::NO_CONTENT);
}

/// Derive a deterministic-but-unique 6-digit code per username, so parallel
/// tests and re-runs never collide on the `login_otp_tokens` PRIMARY KEY
/// (the PK is sha256(code); a fixed code re-used across runs would clash with
/// leftover rows).
fn code_for(prefix: u8, username: &str) -> String {
    let h = sha256_hex(&format!("{prefix}-{username}"));
    // Take the last 6 hex digits and map to a 6-digit numeric code.
    let n = u32::from_str_radix(&h[h.len() - 6..], 16).unwrap_or(0) % 1_000_000;
    format!("{n:06}")
}

/// A correct OTP code logs the user in and the code becomes single-use.
#[tokio::test]
async fn otp_verify_correct_code_logs_in_and_consumes() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    sqlx::query("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE username = ?")
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    // Insert a known code deterministically (sending needs a live SMTP server,
    // which the test harness lacks). Code is unique per run to avoid PK clashes
    // with leftover rows from prior runs.
    let known_code = code_for(1, &username);
    let known_hash = sha256_hex(&known_code);
    let user_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM login_otp_tokens WHERE LOWER(email) = ?")
        .bind(&email)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO login_otp_tokens (token_hash, user_id, email) VALUES (?, ?, ?)")
        .bind(&known_hash)
        .bind(&user_id)
        .bind(&email)
        .execute(&pool)
        .await
        .unwrap();

    // Verify with the known code.
    let (status, body) = common::req(
        app.clone(),
        "POST",
        "/api/auth/otp/verify",
        None,
        Some(json!({ "email": &email, "code": known_code })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "otp verify failed: {body}");
    assert_eq!(body["username"].as_str().unwrap(), username);
    assert!(!body["token"].as_str().unwrap().is_empty());

    // Replaying the consumed code fails.
    let (replay_status, _) = common::req(
        app,
        "POST",
        "/api/auth/otp/verify",
        None,
        Some(json!({ "email": &email, "code": known_code })),
    )
    .await;
    assert_eq!(replay_status, StatusCode::BAD_REQUEST);
}

/// Wrong codes increment attempts; after the cap, the code is locked.
#[tokio::test]
async fn otp_verify_locks_after_max_attempts() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    sqlx::query("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE username = ?")
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    // Insert a known code (unique per run to avoid PK clashes with leftover rows).
    let known_code = code_for(2, &username);
    let user_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM login_otp_tokens WHERE LOWER(email) = ?")
        .bind(&email)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO login_otp_tokens (token_hash, user_id, email) VALUES (?, ?, ?)")
        .bind(sha256_hex(&known_code))
        .bind(&user_id)
        .bind(&email)
        .execute(&pool)
        .await
        .unwrap();

    // Burn 5 wrong attempts.
    for _ in 0..5 {
        let (status, _) = common::req(
            app.clone(),
            "POST",
            "/api/auth/otp/verify",
            None,
            Some(json!({ "email": &email, "code": "000000" })),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    // Now even the correct code is rejected (locked).
    let (status, _) = common::req(
        app,
        "POST",
        "/api/auth/otp/verify",
        None,
        Some(json!({ "email": &email, "code": known_code })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // And the attempt counter reached the cap.
    let attempts: i64 =
        sqlx::query_scalar("SELECT attempts FROM login_otp_tokens WHERE LOWER(email) = ?")
            .bind(&email)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(attempts, 5);
}
