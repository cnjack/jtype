mod common;

use axum::http::StatusCode;
use serde_json::json;

// ── Local helper ──────────────────────────────────────────────────────────────

async fn add_domain(
    app: axum::Router,
    token: &str,
    domain: &str,
) -> (String, serde_json::Value) {
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/domains",
        Some(token),
        Some(json!({ "domain": domain })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "add_domain failed: {body}");
    (body["id"].as_str().unwrap().to_string(), body)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn list_domains_empty() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, body) =
        common::req(app, "GET", "/api/v1/domains", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        body.as_array().unwrap().is_empty(),
        "expected empty domain list, got: {body}"
    );
}

#[tokio::test]
async fn add_domain_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain = format!("{}.example.com", common::uid());
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/domains",
        Some(&token),
        Some(json!({ "domain": domain })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "add domain failed: {body}");
    assert!(
        body["id"].as_str().is_some(),
        "expected id in response: {body}"
    );
    assert!(
        body["verificationToken"].as_str().is_some(),
        "expected verificationToken in response: {body}"
    );
    assert_eq!(body["domain"].as_str().unwrap(), domain);
}

#[tokio::test]
async fn add_domain_with_workspace() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let domain = format!("{}.example.com", common::uid());
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/domains",
        Some(&token),
        Some(json!({ "domain": domain, "workspaceId": ws_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "add domain with workspace failed: {body}");
    assert_eq!(
        body["workspaceId"].as_str().unwrap_or(""),
        ws_id,
        "workspaceId not set: {body}"
    );
}

#[tokio::test]
async fn add_domain_unauthorized() {
    let (app, _pool) = common::setup().await;
    let domain = format!("{}.example.com", common::uid());
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/v1/domains",
        None,
        Some(json!({ "domain": domain })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn add_domain_invalid_fqdn() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/domains",
        Some(&token),
        Some(json!({ "domain": "not a domain!!!" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "expected 400 for invalid FQDN: {body}");
}

#[tokio::test]
async fn get_domain_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain = format!("{}.example.com", common::uid());
    let (id, _) = add_domain(app.clone(), &token, &domain).await;
    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/domains/{id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "get domain failed: {body}");
    assert_eq!(body["id"].as_str().unwrap(), id);
    assert_eq!(body["domain"].as_str().unwrap(), domain);
}

#[tokio::test]
async fn get_domain_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, _body) = common::req(
        app,
        "GET",
        "/api/v1/domains/nonexistent-domain-id",
        Some(&token),
        None,
    )
    .await;
    assert!(
        status == StatusCode::NOT_FOUND || status == StatusCode::FORBIDDEN,
        "expected 404 or 403 for missing domain, got {status}"
    );
}

#[tokio::test]
async fn list_domains_shows_added() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain_a = format!("{}.example.com", common::uid());
    let domain_b = format!("{}.example.com", common::uid());
    add_domain(app.clone(), &token, &domain_a).await;
    add_domain(app.clone(), &token, &domain_b).await;
    let (status, body) =
        common::req(app, "GET", "/api/v1/domains", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    let arr = body.as_array().unwrap();
    let domains: Vec<&str> = arr
        .iter()
        .filter_map(|d| d["domain"].as_str())
        .collect();
    assert!(
        domains.contains(&domain_a.as_str()),
        "domain_a not in list: {body}"
    );
    assert!(
        domains.contains(&domain_b.as_str()),
        "domain_b not in list: {body}"
    );
}

#[tokio::test]
async fn bind_domain_to_workspace() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain = format!("{}.example.com", common::uid());
    let (id, _) = add_domain(app.clone(), &token, &domain).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/domains/{id}/binding"),
        Some(&token),
        Some(json!({ "workspaceId": ws_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "bind domain failed: {body}");
    assert_eq!(
        body["workspaceId"].as_str().unwrap_or(""),
        ws_id,
        "workspaceId not set after binding: {body}"
    );
}

#[tokio::test]
async fn bind_domain_unbind() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain = format!("{}.example.com", common::uid());
    let (id, _) = add_domain(app.clone(), &token, &domain).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    // First bind
    common::req(
        app.clone(),
        "PUT",
        &format!("/api/v1/domains/{id}/binding"),
        Some(&token),
        Some(json!({ "workspaceId": ws_id })),
    )
    .await;
    // Then unbind
    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/domains/{id}/binding"),
        Some(&token),
        Some(json!({ "workspaceId": null })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "unbind failed: {body}");
    assert!(
        body["workspaceId"].is_null(),
        "expected workspaceId to be null after unbind: {body}"
    );
}

#[tokio::test]
async fn verify_domain() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain = format!("{}.example.com", common::uid());
    let (id, _) = add_domain(app.clone(), &token, &domain).await;
    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/domains/{id}/verify"),
        Some(&token),
        None,
    )
    .await;
    // DNS lookup will fail in CI — any 2xx or 4xx is acceptable; 5xx is not.
    assert!(
        status.is_success() || status.is_client_error(),
        "verify returned unexpected server error {status}: {body}"
    );
}

#[tokio::test]
async fn upload_certificate_invalid_pem() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let domain = format!("{}.example.com", common::uid());
    let (id, _) = add_domain(app.clone(), &token, &domain).await;
    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/domains/{id}/certificate"),
        Some(&token),
        Some(json!({
            "certChainPem": "this is not valid PEM",
            "privateKeyPem": "neither is this"
        })),
    )
    .await;
    assert!(
        status == StatusCode::BAD_REQUEST || status == StatusCode::UNPROCESSABLE_ENTITY,
        "expected 400 or 422 for invalid PEM, got {status}: {body}"
    );
}
