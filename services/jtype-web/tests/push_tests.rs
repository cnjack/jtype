mod common;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::Row;

#[tokio::test]
async fn mobile_user_can_register_list_rotate_and_unregister_without_identifier_disclosure() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let device_id = format!("android-{}", common::uid());
    let first_identifier = format!("fid-first-{}", common::uid());

    let (status, body) = common::req_with_client_type(
        app.clone(),
        "PUT",
        "/api/me/push-registrations",
        Some(&token),
        Some(json!({
            "deviceId": device_id,
            "platform": "android",
            "provider": "fcm",
            "environment": "production",
            "identifierKind": "fid",
            "identifier": first_identifier,
            "appVersion": "0.1.0",
            "locale": "zh-CN"
        })),
        "mobile",
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["registered"], true);
    assert!(body.get("identifier").is_none());

    let (status, list) = common::req(
        app.clone(),
        "GET",
        "/api/me/push-registrations",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{list}");
    assert_eq!(list.as_array().unwrap().len(), 1);
    assert_eq!(list[0]["deviceId"], device_id);
    assert!(list[0].get("identifier").is_none());
    assert!(list[0].get("providerIdentifier").is_none());

    let rotated_identifier = format!("fid-rotated-{}", common::uid());
    let (status, body) = common::req_with_client_type(
        app.clone(),
        "PUT",
        "/api/me/push-registrations",
        Some(&token),
        Some(json!({
            "deviceId": device_id,
            "platform": "android",
            "provider": "fcm",
            "environment": "production",
            "identifierKind": "fid",
            "identifier": rotated_identifier
        })),
        "mobile",
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let rows = sqlx::query(
        "SELECT provider_identifier FROM mobile_push_registrations WHERE device_id = ? AND platform = 'android'",
    )
    .bind(&device_id)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(
        rows[0].try_get::<String, _>("provider_identifier").unwrap(),
        rotated_identifier
    );

    let (status, body) = common::req_with_client_type(
        app,
        "DELETE",
        &format!("/api/me/push-registrations/android/{device_id}"),
        Some(&token),
        None,
        "mobile",
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM mobile_push_registrations WHERE device_id = ?")
            .bind(device_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn registration_requires_mobile_header_and_matching_vendor_contract() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let payload = json!({
        "deviceId": "ios-device",
        "platform": "ios",
        "provider": "apns",
        "environment": "development",
        "identifierKind": "deviceToken",
        "identifier": "a".repeat(64)
    });

    let (status, _) = common::req(
        app.clone(),
        "PUT",
        "/api/me/push-registrations",
        Some(&token),
        Some(payload.clone()),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let mut invalid_provider = payload.clone();
    invalid_provider["provider"] = json!("fcm");
    let (status, _) = common::req_with_client_type(
        app.clone(),
        "PUT",
        "/api/me/push-registrations",
        Some(&token),
        Some(invalid_provider),
        "mobile",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let mut invalid_identifier = payload;
    invalid_identifier["identifier"] = json!("not-an-apns-device-token");
    let (status, _) = common::req_with_client_type(
        app,
        "PUT",
        "/api/me/push-registrations",
        Some(&token),
        Some(invalid_identifier),
        "mobile",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn one_provider_identifier_is_atomically_transferred_to_the_current_user() {
    let (app, pool) = common::setup().await;
    let (first_auth, _) = common::register_user(app.clone(), &common::uid()).await;
    let (second_auth, _) = common::register_user(app.clone(), &common::uid()).await;
    let provider_identifier = format!("fid-shared-installation-{}", common::uid());

    for (auth, device_id) in [
        (&first_auth, "first-device"),
        (&second_auth, "second-device"),
    ] {
        let (status, body) = common::req_with_client_type(
            app.clone(),
            "PUT",
            "/api/me/push-registrations",
            Some(auth),
            Some(json!({
                "deviceId": device_id,
                "platform": "android",
                "provider": "fcm",
                "environment": "production",
                "identifierKind": "fid",
                "identifier": provider_identifier
            })),
            "mobile",
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
    }

    let rows = sqlx::query(
        "SELECT device_id FROM mobile_push_registrations WHERE identifier_hash = SHA2(?, 256)",
    )
    .bind(provider_identifier)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(
        rows[0].try_get::<String, _>("device_id").unwrap(),
        "second-device"
    );
}

#[tokio::test]
async fn document_changes_enqueue_only_other_members_and_coalesce_pending_path_updates() {
    let (app, pool) = common::setup().await;
    let owner_name = common::uid();
    let member_name = common::uid();
    let (owner_auth, _) = common::register_user(app.clone(), &owner_name).await;
    let (member_auth, _) = common::register_user(app.clone(), &member_name).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_auth, &common::wname()).await;

    let (status, invite) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/invites"),
        Some(&owner_auth),
        Some(json!({ "role": "editor" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{invite}");
    let invite_token = invite["inviteToken"].as_str().unwrap();
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&member_auth),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");

    for (auth, device, identifier) in [
        (&owner_auth, "owner-android", "fid-owner-installation"),
        (&member_auth, "member-android", "fid-member-installation"),
    ] {
        let (status, body) = common::req_with_client_type(
            app.clone(),
            "PUT",
            "/api/me/push-registrations",
            Some(auth),
            Some(json!({
                "deviceId": device,
                "platform": "android",
                "provider": "fcm",
                "environment": "production",
                "identifierKind": "fid",
                "identifier": identifier
            })),
            "mobile",
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
    }

    common::save_doc(
        app.clone(),
        &owner_auth,
        &workspace_id,
        "shared/transport.md",
        "# First update",
    )
    .await;
    let latest = common::save_doc(
        app.clone(),
        &owner_auth,
        &workspace_id,
        "shared/transport.md",
        "# Latest update",
    )
    .await;

    let rows = sqlx::query(
        r#"SELECT r.device_id, d.relative_path, d.document_clock, d.status
           FROM mobile_push_deliveries d
           JOIN mobile_push_registrations r ON r.id = d.registration_id
           WHERE d.workspace_id = ?"#,
    )
    .bind(&workspace_id)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(rows.len(), 1, "only the other member's latest hint remains");
    assert_eq!(
        rows[0].try_get::<String, _>("device_id").unwrap(),
        "member-android"
    );
    assert_eq!(
        rows[0].try_get::<String, _>("relative_path").unwrap(),
        "shared/transport.md"
    );
    assert_eq!(
        rows[0].try_get::<i64, _>("document_clock").unwrap(),
        latest["updatedClock"].as_i64().unwrap()
    );
    assert_eq!(rows[0].try_get::<String, _>("status").unwrap(), "pending");

    sqlx::query(
        "UPDATE mobile_push_deliveries SET created_at = DATE_SUB(NOW(), INTERVAL 5 HOUR) WHERE workspace_id = ?",
    )
    .bind(&workspace_id)
    .execute(&pool)
    .await
    .unwrap();
    let maintenance = jtype_web::tasks::mobile_push_delivery::maintain_once(&pool)
        .await
        .unwrap();
    assert_eq!(maintenance.removed_expired, 1);
    let remaining: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM mobile_push_deliveries WHERE workspace_id = ?")
            .bind(&workspace_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(remaining, 0, "expired hints are removed without a provider");

    common::save_doc(
        app,
        &owner_auth,
        &workspace_id,
        "shared/transport.md",
        "# Membership changed",
    )
    .await;
    sqlx::query(
        r#"DELETE m FROM workspace_members m
           JOIN users u ON u.id = m.user_id
           WHERE m.workspace_id = ? AND u.username = ?"#,
    )
    .bind(&workspace_id)
    .bind(&member_name)
    .execute(&pool)
    .await
    .unwrap();
    let maintenance = jtype_web::tasks::mobile_push_delivery::maintain_once(&pool)
        .await
        .unwrap();
    assert_eq!(maintenance.removed_inactive, 1);
    let remaining: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM mobile_push_deliveries WHERE workspace_id = ?")
            .bind(&workspace_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(remaining, 0, "revoked members retain no queued routes");
}
