mod common;

use axum::{
    body::Body,
    http::{header, Request, StatusCode},
    Router,
};
use serde_json::Value;
use tower::ServiceExt;

async fn get_json(app: Router, uri: &str) -> (StatusCode, String, Value) {
    let response = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let body = axum::body::to_bytes(response.into_body(), 1024 * 1024)
        .await
        .unwrap();
    (status, content_type, serde_json::from_slice(&body).unwrap())
}

#[tokio::test]
async fn association_endpoints_fail_closed_without_release_identity() {
    let (app, _pool) = common::setup().await;

    let (apple_status, apple_content_type, apple) =
        get_json(app.clone(), "/.well-known/apple-app-site-association").await;
    assert_eq!(apple_status, StatusCode::OK);
    assert_eq!(apple_content_type, "application/json");
    assert_eq!(apple["applinks"]["details"], serde_json::json!([]));

    let (android_status, android_content_type, android) =
        get_json(app, "/.well-known/assetlinks.json").await;
    assert_eq!(android_status, StatusCode::OK);
    assert_eq!(android_content_type, "application/json");
    assert_eq!(android, serde_json::json!([]));
}

#[tokio::test]
async fn configured_endpoints_authorize_only_the_jtype_native_identity() {
    let (_default_app, pool) = common::setup().await;
    let config = jtype_web::app_links::AppLinkConfig::new(
        Some("A1B2C3D4E5".to_string()),
        vec!["00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff".to_string()],
    );
    let (app, _hub) = jtype_web::build_app_with_app_links(
        pool,
        "https://jtype.nightc.com".to_string(),
        jtype_web::storage::in_memory(),
        None,
        config,
    );

    let (_, _, apple) = get_json(app.clone(), "/.well-known/apple-app-site-association").await;
    assert_eq!(
        apple["applinks"]["details"][0]["appIDs"][0],
        "A1B2C3D4E5.net.jcode.jtype"
    );
    assert_eq!(
        apple["applinks"]["details"][0]["components"][0]["/"],
        "/open/document"
    );

    let (_, _, android) = get_json(app, "/.well-known/assetlinks.json").await;
    assert_eq!(android[0]["target"]["package_name"], "net.jcode.jtype");
    assert_eq!(
        android[0]["target"]["sha256_cert_fingerprints"][0],
        "00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF"
    );
}
