//! Kanban end-to-end tests — multi-device realtime sync + the behaviours added
//! while hardening the module (deterministic restore, position compaction,
//! contract validation, the archive/trash list endpoint, force-override).
//!
//! These complement `kanban_tests.rs`: that file proves each endpoint in
//! isolation; this file proves cross-device propagation and the trickier
//! lifecycle/edge cases that a real client (web + desktop, multiple sessions)
//! exercises.
//!
//! Run with:
//!   cargo test --manifest-path services/jtype-web/Cargo.toml --test kanban_e2e_tests
//! Requires a running MySQL (see tests/common/mod.rs).

mod common;

use axum::http::StatusCode;
use axum::Router;
use jtype_web::hub::WorkspaceEvent;
use serde_json::{json, Value};
use sqlx::{MySql, Pool};
use std::time::Duration;

// ── helpers ──────────────────────────────────────────────────────────────────

/// Drain up to `max` events from a subscriber within a short window.
async fn drain(rx: &mut tokio::sync::mpsc::Receiver<WorkspaceEvent>, max: usize) -> Vec<Value> {
    let mut out = Vec::new();
    for _ in 0..max {
        match tokio::time::timeout(Duration::from_millis(500), rx.recv()).await {
            Ok(Some(ev)) => out.push(serde_json::to_value(&ev).unwrap()),
            _ => break,
        }
    }
    out
}

/// The `type` discriminator of each event.
fn types(events: &[Value]) -> Vec<String> {
    events
        .iter()
        .filter_map(|e| e["type"].as_str().map(str::to_string))
        .collect()
}

fn count_type(events: &[Value], t: &str) -> usize {
    types(events).iter().filter(|x| *x == t).count()
}

/// Create a board; return (board_id, [column_ids]).
async fn make_board(app: &Router, token: &str, ws_id: &str, name: &str) -> (String, Vec<String>) {
    let (status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(token),
        Some(json!({ "name": name })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "make_board failed: {board}");
    let bid = board["id"].as_str().unwrap().to_string();
    let cols = board["columns"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap().to_string())
        .collect();
    (bid, cols)
}

/// Create a card in a column; return its id.
async fn make_card(app: &Router, token: &str, ws_id: &str, board_id: &str, col_id: &str, title: &str) -> String {
    let (status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(token),
        Some(json!({ "columnId": col_id, "title": title })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "make_card failed: {card}");
    card["id"].as_str().unwrap().to_string()
}

/// List active cards in a column (id -> position), as an ordered Vec of ids.
async fn column_order(app: &Router, token: &str, ws_id: &str, board_id: &str, col_id: &str) -> Vec<String> {
    let (_s, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(token),
        None,
    )
    .await;
    let mut cards: Vec<(i64, String)> = list
        .as_array()
        .unwrap()
        .iter()
        .filter(|c| c["columnId"].as_str() == Some(col_id))
        .map(|c| (c["position"].as_i64().unwrap(), c["id"].as_str().unwrap().to_string()))
        .collect();
    cards.sort_by_key(|(p, _)| *p);
    cards.into_iter().map(|(_, id)| id).collect()
}

/// Insert a workspace member with the given role; return the user id.
async fn add_member(pool: &Pool<MySql>, ws_id: &str, username: &str, role: &str) -> String {
    let uid: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(username)
        .fetch_one(pool)
        .await
        .unwrap();
    sqlx::query(
        "INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at)
         VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)",
    )
    .bind(ws_id)
    .bind(&uid)
    .bind(role)
    .execute(pool)
    .await
    .unwrap();
    uid
}

// ── 1. Multi-device realtime sync ────────────────────────────────────────────

#[tokio::test]
async fn ws_board_create_propagates_board_and_three_columns() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // Two other devices watching the same workspace.
    let (_s1, mut dev1) = hub.subscribe_for_test(&ws_id).await;
    let (_s2, mut dev2) = hub.subscribe_for_test(&ws_id).await;

    let _ = make_board(&app, &token, &ws_id, "Sprint").await;

    for rx in [&mut dev1, &mut dev2] {
        let evs = drain(rx, 10).await;
        assert_eq!(count_type(&evs, "kanban:board-updated"), 1, "each device sees board-updated: {evs:?}");
        assert_eq!(count_type(&evs, "kanban:column-updated"), 3, "each device sees 3 seeded columns: {evs:?}");
    }
}

#[tokio::test]
async fn ws_card_lifecycle_propagates_to_other_device() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;

    // Subscribe AFTER board setup so we only capture card lifecycle events.
    let (_s, mut dev) = hub.subscribe_for_test(&ws_id).await;

    // create
    let card_id = make_card(&app, &token, &ws_id, &board_id, &cols[0], "task").await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:card-updated".to_string()));

    // patch
    let _ = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "priority": "high" })),
    )
    .await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:card-updated".to_string()));

    // move
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_id, "targetColumnId": cols[1], "targetPosition": 0 })),
    )
    .await;
    let mv = drain(&mut dev, 5).await;
    assert!(types(&mv).contains(&"kanban:card-updated".to_string()));
    assert_eq!(mv.iter().find(|e| e["type"] == "kanban:card-updated").unwrap()["columnId"], cols[1]);

    // archive
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:card-archived".to_string()));

    // restore
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/restore"),
        Some(&token),
        None,
    )
    .await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:card-restored".to_string()));

    // hard delete
    let _ = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        None,
    )
    .await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:card-deleted".to_string()));
}

#[tokio::test]
async fn ws_label_changes_emit_label_changed_not_board_updated() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, _cols) = make_board(&app, &token, &ws_id, "B").await;

    let (_s, mut dev) = hub.subscribe_for_test(&ws_id).await;

    // create label
    let (_s1, label) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "bug", "color": "#ef4444" })),
    )
    .await;
    let label_id = label["id"].as_str().unwrap().to_string();
    let evs = drain(&mut dev, 5).await;
    assert!(types(&evs).contains(&"kanban:label-changed".to_string()), "got {evs:?}");
    assert!(!types(&evs).contains(&"kanban:board-updated".to_string()), "label edits must NOT masquerade as board renames");
    assert_eq!(evs[0]["boardId"], board_id);

    // patch + delete also emit label-changed
    let _ = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/labels/{label_id}"),
        Some(&token),
        Some(json!({ "name": "defect" })),
    )
    .await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:label-changed".to_string()));

    let _ = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/labels/{label_id}"),
        Some(&token),
        None,
    )
    .await;
    assert!(types(&drain(&mut dev, 5).await).contains(&"kanban:label-changed".to_string()));
}

#[tokio::test]
async fn ws_board_delete_propagates() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, _cols) = make_board(&app, &token, &ws_id, "B").await;

    let (_s, mut dev) = hub.subscribe_for_test(&ws_id).await;

    let (status, _b) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let evs = drain(&mut dev, 5).await;
    assert!(types(&evs).contains(&"kanban:board-deleted".to_string()), "got {evs:?}");
    assert_eq!(evs[0]["boardId"], board_id);
}

#[tokio::test]
async fn ws_originating_session_excluded_but_peer_receives() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // Device A is the originator (its session id is echoed via X-Session-Id),
    // device B is a passive peer.
    let (sess_a, mut dev_a) = hub.subscribe_for_test(&ws_id).await;
    let (_sess_b, mut dev_b) = hub.subscribe_for_test(&ws_id).await;

    let (status, _b) = common::req_with_session(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "Solo" })),
        Some(&sess_a),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // A excluded, B receives.
    assert!(drain(&mut dev_a, 5).await.is_empty(), "originating session must be excluded");
    assert!(!drain(&mut dev_b, 5).await.is_empty(), "peer device must receive the event");
}

// ── 2. Deterministic restore (multi-archive) ─────────────────────────────────

#[tokio::test]
async fn restore_after_archive_restore_archive_uses_latest_trash_row() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;
    let card_id = make_card(&app, &token, &ws_id, &board_id, &cols[0], "loop").await;

    let archive = |c: String| {
        let app = app.clone();
        let token = token.clone();
        let ws_id = ws_id.clone();
        async move {
            common::req(app, "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{c}/archive"), Some(&token), None).await
        }
    };
    let restore = |c: String| {
        let app = app.clone();
        let token = token.clone();
        let ws_id = ws_id.clone();
        async move {
            common::req(app, "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{c}/restore"), Some(&token), None).await
        }
    };

    // Cycle 1: archive then restore (leaves a restored trash row behind).
    assert_eq!(archive(card_id.clone()).await.0, StatusCode::OK);
    assert_eq!(restore(card_id.clone()).await.0, StatusCode::OK);

    // Move the card to a DIFFERENT column so the second archival captures col[1].
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_id, "targetColumnId": cols[1], "targetPosition": 0 })),
    )
    .await;

    // Cycle 2: archive (captures col[1]) then restore — must return to col[1],
    // NOT the stale col[0] recorded in the first (already-restored) trash row.
    assert_eq!(archive(card_id.clone()).await.0, StatusCode::OK);
    let (status, body) = restore(card_id.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["columnId"], cols[1], "restore must use the most recent archival's column");
    assert!(body["archivedAt"].is_null());
}

#[tokio::test]
async fn restore_non_archived_card_is_404() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;
    let card_id = make_card(&app, &token, &ws_id, &board_id, &cols[0], "active").await;

    let (status, _b) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/restore"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn restore_appends_to_end_of_column() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;

    let a = make_card(&app, &token, &ws_id, &board_id, &cols[0], "A").await;
    let _b = make_card(&app, &token, &ws_id, &board_id, &cols[0], "B").await;

    // Archive A → column compacts to [B@0].
    let _ = common::req(app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{a}/archive"), Some(&token), None).await;
    // Add C → [B@0, C@1].
    let c = make_card(&app, &token, &ws_id, &board_id, &cols[0], "C").await;
    // Restore A → should append at the end (position 2), not collide.
    let _ = common::req(app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{a}/restore"), Some(&token), None).await;

    let order = column_order(&app, &token, &ws_id, &board_id, &cols[0]).await;
    assert_eq!(order.len(), 3);
    assert_eq!(order[2], a, "restored card should be appended at the end: {order:?}");
    assert_eq!(order[1], c);
}

// ── 3. Archive compaction ────────────────────────────────────────────────────

#[tokio::test]
async fn archive_compacts_source_column_positions() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;

    let a = make_card(&app, &token, &ws_id, &board_id, &cols[0], "A").await;
    let b = make_card(&app, &token, &ws_id, &board_id, &cols[0], "B").await;
    let c = make_card(&app, &token, &ws_id, &board_id, &cols[0], "C").await;

    // Archive the middle card.
    let _ = common::req(app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{b}/archive"), Some(&token), None).await;

    let order = column_order(&app, &token, &ws_id, &board_id, &cols[0]).await;
    assert_eq!(order, vec![a, c], "remaining cards compacted with no gap");
}

// ── 4. Contract validation ───────────────────────────────────────────────────

#[tokio::test]
async fn duplicate_board_name_returns_400_not_500() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let _ = make_board(&app, &token, &ws_id, "Dup").await;

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "Dup" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "got {body}");
}

#[tokio::test]
async fn duplicate_column_name_returns_400_not_500() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, _cols) = make_board(&app, &token, &ws_id, "B").await;

    // Default columns include "To do"; creating another "To do" collides.
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/columns"),
        Some(&token),
        Some(json!({ "name": "To do" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "got {body}");
}

#[tokio::test]
async fn assignee_must_be_workspace_member() {
    let (app, pool) = common::setup().await;
    let (owner_token, _o) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &owner_token, &ws_id, "B").await;

    // A user that exists but is NOT a member of this workspace.
    let (_outsider_token, outsider_name) = common::register_user(app.clone(), &common::uid()).await;
    let outsider_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&outsider_name)
        .fetch_one(&pool)
        .await
        .unwrap();

    // Assigning to the outsider is rejected with 400 (not an opaque FK 500).
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&owner_token),
        Some(json!({ "columnId": cols[0], "title": "x", "assigneeUserId": outsider_id })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "outsider assignee should be rejected: {body}");

    // Add an editor member, then assigning to them succeeds.
    let (_e_token, editor_name) = common::register_user(app.clone(), &common::uid()).await;
    let editor_id = add_member(&pool, &ws_id, &editor_name, "editor").await;
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&owner_token),
        Some(json!({ "columnId": cols[0], "title": "y", "assigneeUserId": editor_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "member assignee should be accepted: {body}");
    assert_eq!(body["assigneeUserId"], editor_id);
}

#[tokio::test]
async fn due_at_accepts_iso8601_and_rejects_garbage() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;

    // ISO-8601 with T/Z is normalized and stored.
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": cols[0], "title": "due", "dueAt": "2026-12-31T23:59:59Z" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "ISO-8601 dueAt should be accepted: {body}");
    assert_eq!(body["dueAt"], "2026-12-31 23:59:59");

    // Garbage is a clean 400, not a DB 500.
    let (status, _b) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": cols[0], "title": "bad", "dueAt": "next tuesday" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ── 5. Archive/trash list endpoint ───────────────────────────────────────────

#[tokio::test]
async fn trash_list_shows_archived_cards_with_metadata() {
    let (app, _pool) = common::setup().await;
    let (token, uname) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;
    let _ = uname;

    let c1 = make_card(&app, &token, &ws_id, &board_id, &cols[0], "one").await;
    let c2 = make_card(&app, &token, &ws_id, &board_id, &cols[0], "two").await;
    for c in [&c1, &c2] {
        let _ = common::req(app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{c}/archive"), Some(&token), None).await;
    }

    let (status, trash) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/trash"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let arr = trash.as_array().unwrap();
    assert_eq!(arr.len(), 2, "both archived cards listed: {trash}");
    // Audit metadata is present.
    for item in arr {
        assert!(item["archivedByUserId"].is_string());
        assert!(item["expiresAt"].is_string());
        assert!(item["archivedAt"].is_string());
        assert!(item["restoredAt"].is_null());
    }

    // Restoring one removes it from the (un-restored) trash list.
    let _ = common::req(app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{c1}/restore"), Some(&token), None).await;
    let (_s, trash2) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/trash"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(trash2.as_array().unwrap().len(), 1);
    assert_eq!(trash2[0]["cardId"], c2);
}

// ── 5b. Client-supplied ids (local↔cloud convergence, design §11.11) ─────────

#[tokio::test]
async fn create_honors_client_supplied_ids() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // Board + its three seeded columns with client-generated ids.
    let bid = uuid::Uuid::new_v4().to_string();
    let cols = [
        uuid::Uuid::new_v4().to_string(),
        uuid::Uuid::new_v4().to_string(),
        uuid::Uuid::new_v4().to_string(),
    ];
    let (status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "id": bid, "name": "Local Board", "columnIds": cols })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{board}");
    assert_eq!(board["id"], bid, "board keeps client id");
    let got_cols: Vec<&str> = board["columns"].as_array().unwrap().iter().map(|c| c["id"].as_str().unwrap()).collect();
    for c in &cols {
        assert!(got_cols.contains(&c.as_str()), "seeded column keeps client id {c}");
    }

    // Card with a client id into the first client-id column.
    let cid = uuid::Uuid::new_v4().to_string();
    let (status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{bid}/cards"),
        Some(&token),
        Some(json!({ "id": cid, "columnId": cols[0], "title": "from desktop" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{card}");
    assert_eq!(card["id"], cid, "card keeps client id");

    // Malformed id is rejected with 400 (not a junk PK).
    let (status, _b) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "id": "not-a-uuid", "name": "Bad" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Wrong column-id count is rejected.
    let (status, _b) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "TwoCols", "columnIds": [uuid::Uuid::new_v4().to_string(), uuid::Uuid::new_v4().to_string()] })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ── 6. Optimistic-lock force override ────────────────────────────────────────

#[tokio::test]
async fn patch_with_force_overrides_stale_clock() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;

    let (_s, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": cols[0], "title": "v" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap().to_string();
    let base = card["updatedClock"].as_i64().unwrap();

    // Advance the clock once.
    let _ = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "v2", "baseUpdatedClock": base })),
    )
    .await;

    // Stale write WITHOUT force → 409.
    let (status, _b) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "v3", "baseUpdatedClock": base })),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);

    // Same stale base WITH force → 200, write applied.
    let (status, body) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "forced", "baseUpdatedClock": base, "force": true })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "force should override conflict: {body}");
    assert_eq!(body["title"], "forced");
}

// ── 7. N+1 batch label loading correctness ───────────────────────────────────

#[tokio::test]
async fn get_board_returns_correct_labels_per_card() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (board_id, cols) = make_board(&app, &token, &ws_id, "B").await;

    let mk_label = |name: &'static str, color: &'static str| {
        let app = app.clone();
        let token = token.clone();
        let ws_id = ws_id.clone();
        let board_id = board_id.clone();
        async move {
            let (_s, l) = common::req(
                app,
                "POST",
                &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
                Some(&token),
                Some(json!({ "name": name, "color": color })),
            )
            .await;
            l["id"].as_str().unwrap().to_string()
        }
    };
    let l1 = mk_label("a", "#111111").await;
    let l2 = mk_label("b", "#222222").await;
    let l3 = mk_label("c", "#333333").await;

    // card1 -> {l1,l2}, card2 -> {l3}, card3 -> {}
    let (_s, c1) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": cols[0], "title": "c1", "labelIds": [l1, l2] })),
    )
    .await;
    let (_s, c2) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": cols[0], "title": "c2", "labelIds": [l3] })),
    )
    .await;
    let _ = make_card(&app, &token, &ws_id, &board_id, &cols[0], "c3").await;
    let c1_id = c1["id"].as_str().unwrap();
    let c2_id = c2["id"].as_str().unwrap();

    let (status, board) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let cards = board["cards"].as_array().unwrap();
    let labels_of = |id: &str| -> Vec<String> {
        let card = cards.iter().find(|c| c["id"].as_str() == Some(id)).unwrap();
        let mut v: Vec<String> = card["labelIds"].as_array().unwrap().iter().map(|x| x.as_str().unwrap().to_string()).collect();
        v.sort();
        v
    };
    assert_eq!(labels_of(c1_id).len(), 2, "card1 keeps both labels (batch load correct)");
    assert_eq!(labels_of(c2_id).len(), 1, "card2 keeps its single label");
}
