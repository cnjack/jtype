//! Integration tests for the asset (image) endpoints.
//! Uses the in-memory object store (the `build_router` default).

mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::Value;
use tower::ServiceExt;

/// Minimal byte sequence that `sniff_image` recognises as a PNG (signature +
/// padding to reach the 12-byte minimum).
fn png_bytes() -> Vec<u8> {
    let mut v = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    v.extend_from_slice(&[0, 0, 0, 0, 1, 2, 3, 4]);
    v
}

async fn upload(
    app: Router,
    token: Option<&str>,
    ws: &str,
    content_type: &str,
    body: Vec<u8>,
    filename: Option<&str>,
) -> (StatusCode, Value) {
    let mut b = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/workspaces/{ws}/assets"))
        .header("content-type", content_type);
    if let Some(t) = token {
        b = b.header("authorization", format!("Bearer {t}"));
    }
    if let Some(f) = filename {
        b = b.header("x-filename", f);
    }
    let res = app.oneshot(b.body(Body::from(body)).unwrap()).await.unwrap();
    let status = res.status();
    let bytes = axum::body::to_bytes(res.into_body(), 32 * 1024 * 1024)
        .await
        .unwrap();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    (status, json)
}

/// GET returning (status, content_type header, raw body bytes).
async fn get_raw(app: Router, uri: &str) -> (StatusCode, Option<String>, Vec<u8>) {
    let res = app
        .oneshot(Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = res.status();
    let ct = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(String::from);
    let bytes = axum::body::to_bytes(res.into_body(), 32 * 1024 * 1024)
        .await
        .unwrap()
        .to_vec();
    (status, ct, bytes)
}

// 1. Upload an image, fetch it back through the public proxy with correct type.
#[tokio::test]
async fn upload_and_serve_image() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = upload(
        app.clone(),
        Some(&token),
        &ws,
        "image/png",
        png_bytes(),
        Some("logo.png"),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "upload failed: {body}");
    assert_eq!(body["contentType"].as_str().unwrap(), "image/png");
    assert_eq!(body["byteSize"].as_i64().unwrap(), png_bytes().len() as i64);
    assert_eq!(body["originalName"].as_str().unwrap(), "logo.png");
    let url = body["url"].as_str().unwrap().to_string();
    assert!(url.starts_with(&format!("/assets/{ws}/")), "bad url: {url}");

    // Public proxy returns the exact bytes with the sniffed content-type.
    let (gs, ct, got) = get_raw(app, &url).await;
    assert_eq!(gs, StatusCode::OK);
    assert_eq!(ct.as_deref(), Some("image/png"));
    assert_eq!(got, png_bytes());
}

// 2. Listing returns uploaded assets.
#[tokio::test]
async fn list_assets_returns_uploads() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;
    upload(app.clone(), Some(&token), &ws, "image/png", png_bytes(), None).await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws}/assets"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let arr = body.as_array().unwrap();
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["contentType"].as_str().unwrap(), "image/png");
}

// 3. Identical bytes dedupe to the same asset id.
#[tokio::test]
async fn duplicate_upload_dedupes() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_, a) = upload(app.clone(), Some(&token), &ws, "image/png", png_bytes(), None).await;
    let (_, b) = upload(app.clone(), Some(&token), &ws, "image/png", png_bytes(), None).await;
    assert_eq!(a["id"], b["id"], "identical uploads should dedupe");

    let (_, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws}/assets"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(body.as_array().unwrap().len(), 1, "dedup should keep one row");
}

// 4. Non-image and SVG are rejected.
#[tokio::test]
async fn rejects_non_image_and_svg() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (text_status, _) = upload(
        app.clone(),
        Some(&token),
        &ws,
        "image/png",
        b"this is just plain text, not an image".to_vec(),
        None,
    )
    .await;
    assert_eq!(text_status, StatusCode::BAD_REQUEST);

    let svg = br#"<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>"#.to_vec();
    let (svg_status, _) = upload(app.clone(), Some(&token), &ws, "image/svg+xml", svg, None).await;
    assert_eq!(svg_status, StatusCode::BAD_REQUEST, "SVG must be rejected");

    let (empty_status, _) = upload(app, Some(&token), &ws, "image/png", vec![], None).await;
    assert_eq!(empty_status, StatusCode::BAD_REQUEST);
}

// 5. Oversize uploads are rejected.
#[tokio::test]
async fn rejects_oversize() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let mut big = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    big.resize(10 * 1024 * 1024 + 16, 0); // just over the 10 MB limit
    let (status, _) = upload(app, Some(&token), &ws, "image/png", big, None).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// 6. Auth: unauthorized and non-member cannot upload.
#[tokio::test]
async fn upload_requires_membership() {
    let (app, _pool) = common::setup().await;
    let (owner, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &owner, &common::wname()).await;
    let (outsider, _) = common::register_user(app.clone(), &common::uid()).await;

    let (no_auth, _) = upload(app.clone(), None, &ws, "image/png", png_bytes(), None).await;
    assert_eq!(no_auth, StatusCode::UNAUTHORIZED);

    // Non-members are denied — the API returns 404 (not 403) so it does not
    // leak whether the workspace exists.
    let (denied, _) = upload(app, Some(&outsider), &ws, "image/png", png_bytes(), None).await;
    assert!(
        denied == StatusCode::FORBIDDEN || denied == StatusCode::NOT_FOUND,
        "outsider upload should be denied, got {denied}"
    );
}

// 7. Delete removes the asset; the public proxy then 404s.
#[tokio::test]
async fn delete_asset_removes_it() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_, body) = upload(app.clone(), Some(&token), &ws, "image/png", png_bytes(), None).await;
    let id = body["id"].as_str().unwrap().to_string();
    let url = body["url"].as_str().unwrap().to_string();

    let (ds, _) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws}/assets/{id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(ds, StatusCode::NO_CONTENT);

    let (gs, _, _) = get_raw(app, &url).await;
    assert_eq!(gs, StatusCode::NOT_FOUND);
}
