//! Integration tests for email-related flows: register-with-email, password
//! reset (anti-enumeration + token claim), email uniqueness, and SMTP admin
//! settings access control / secret redaction.
//!
//! SMTP is unconfigured under `build_router` (mailer = None), so
//! forgot-password never actually sends mail here — it must still return 204 to
//! avoid account enumeration. Reset-password is exercised by inserting a token
//! row directly (simulating "the email was sent"), since sending requires a
//! live SMTP server.

mod common;

use axum::http::StatusCode;
use jtype_web::util::{random_token, sha256_hex};
use serde_json::json;

/// Register with an optional email stores it (lowercased) on the user.
#[tokio::test]
async fn register_with_email_persists_email() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");
    let (status, body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!", "email": &email })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "register failed: {body}");

    let stored: String = sqlx::query_scalar("SELECT email FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(stored, email);
}

/// A second registration with an already-used email is rejected.
#[tokio::test]
async fn register_duplicate_email_rejected() {
    let (app, _pool) = common::setup().await;
    let email = format!("{}@example.com", common::uid());
    let u1 = common::uid();
    common::req(
        app.clone(),
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &u1, "password": "TestPass1!", "email": &email })),
    )
    .await;
    let u2 = common::uid();
    let (status, body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &u2, "password": "TestPass1!", "email": &email })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "expected conflict: {body}");
}

/// forgot-password returns the same 204 whether the email is known or not —
/// the core anti-enumeration guarantee. SMTP is unconfigured, so no mail sends.
#[tokio::test]
async fn forgot_password_is_anti_enumeration() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let email = format!("{username}@example.com");

    // Register + verify the email so the account is "resettable".
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

    // Known, verified email → 204.
    let (status_known, _) = common::req(
        app.clone(),
        "POST",
        "/api/auth/forgot-password",
        None,
        Some(json!({ "email": &email })),
    )
    .await;
    // Unknown email → also 204 (indistinguishable).
    let (status_unknown, _) = common::req(
        app,
        "POST",
        "/api/auth/forgot-password",
        None,
        Some(json!({ "email": "definitely-nobody-" })),
    )
    .await;
    assert_eq!(status_known, StatusCode::NO_CONTENT);
    assert_eq!(status_unknown, StatusCode::NO_CONTENT);
}

/// A valid reset token changes the password and is single-use; the old password
/// stops working and the token can't be replayed.
#[tokio::test]
async fn reset_password_consumes_token_and_changes_password() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    common::register_user(app.clone(), &username).await;

    // Fetch the user id.
    let user_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();

    // Simulate a sent reset email by inserting the token row directly.
    let token = random_token();
    let token_hash = sha256_hex(&token);
    sqlx::query("INSERT INTO password_reset_tokens (token_hash, user_id) VALUES (?, ?)")
        .bind(&token_hash)
        .bind(&user_id)
        .execute(&pool)
        .await
        .unwrap();

    // Reset with a new password.
    let (status, _body) = common::req(
        app.clone(),
        "POST",
        "/api/auth/reset-password",
        None,
        Some(json!({ "token": &token, "password": "BrandNewPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT, "reset failed");

    // Old password no longer works.
    let (old_status, _) = common::req(
        app.clone(),
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!" })),
    )
    .await;
    assert!(old_status == StatusCode::UNAUTHORIZED || old_status == StatusCode::FORBIDDEN);

    // New password works.
    let (new_status, _body) = common::req(
        app.clone(),
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &username, "password": "BrandNewPass1!" })),
    )
    .await;
    assert_eq!(new_status, StatusCode::OK);

    // Replaying the token fails.
    let (replay_status, _) = common::req(
        app,
        "POST",
        "/api/auth/reset-password",
        None,
        Some(json!({ "token": &token, "password": "AnotherNew1!" })),
    )
    .await;
    assert_eq!(replay_status, StatusCode::BAD_REQUEST);
}

/// A reset with a bogus token is rejected.
#[tokio::test]
async fn reset_password_rejects_unknown_token() {
    let (app, _pool) = common::setup().await;
    let (status, _) = common::req(
        app,
        "POST",
        "/api/auth/reset-password",
        None,
        Some(json!({ "token": "nonexistent-token", "password": "SomeNewPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// SMTP settings require a full-scope admin session.
#[tokio::test]
async fn smtp_settings_require_admin() {
    let (app, _pool) = common::setup().await;
    // No token at all → 401.
    let (status, _) = common::req(
        app.clone(),
        "GET",
        "/api/admin/settings/smtp",
        None,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // A regular (non-admin) user → 403.
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, _) = common::req(
        app,
        "GET",
        "/api/admin/settings/smtp",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// SMTP settings response never echoes the password, only `passwordSet`.
#[tokio::test]
async fn smtp_settings_redact_password() {
    let (app, pool) = common::setup().await;
    // Promote the first registered user to admin via SQL (matches AGENTS.md pattern).
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    sqlx::query("UPDATE users SET role = 'admin' WHERE username = ?")
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    let (status, body) = common::req(
        app,
        "GET",
        "/api/admin/settings/smtp",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    // No `password` field is present at all.
    assert!(body.get("password").is_none());
    // Only the boolean flag.
    assert!(body.get("passwordSet").is_some());
}

/// Updating the email clears email verification (must re-verify).
#[tokio::test]
async fn changing_email_clears_verification() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    // Set + verify an email directly.
    let email = format!("{username}@example.com");
    sqlx::query("UPDATE users SET email = ?, email_verified_at = CURRENT_TIMESTAMP WHERE username = ?")
        .bind(&email)
        .bind(&username)
        .execute(&pool)
        .await
        .unwrap();

    // Change the email via the profile API.
    let new_email = format!("{username}@new.example.com");
    let (status, body) = common::req(
        app,
        "PUT",
        "/api/me/profile",
        Some(&token),
        Some(json!({ "email": &new_email })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "profile update failed: {body}");

    // emailVerified must now be false.
    assert_eq!(body["emailVerified"], json!(false));

    // And the stored email_verified_at is NULL again.
    let verified: Option<String> =
        sqlx::query_scalar("SELECT email_verified_at FROM users WHERE username = ?")
            .bind(&username)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(verified.is_none());
}
