//! Kanban integration tests — covers all 11 categories from the design doc.
//!
//! Run with:
//!   cargo test --manifest-path services/jtype-web/Cargo.toml --test kanban_tests
//!
//! Requires a running MySQL with `TEST_DATABASE_URL` set (see tests/common/mod.rs).
//! Each `#[tokio::test]` calls `common::setup().await`.

mod common;
use axum::http::StatusCode;
use serde_json::{json, Value};

// ── 1. Board CRUD ────────────────────────────────────────────────────────────

#[tokio::test]
async fn create_board_seeds_three_default_columns() {
    let (app, _pool) = common::setup().await;
    let (token, _user) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "Sprint 1" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "Sprint 1");
    assert_eq!(body["columns"].as_array().unwrap().len(), 3);
    let col_names: Vec<&str> = body["columns"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["name"].as_str().unwrap())
        .collect();
    assert!(col_names.contains(&"To do"));
    assert!(col_names.contains(&"Doing"));
    assert!(col_names.contains(&"Done"));
}

#[tokio::test]
async fn list_boards_excludes_none() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // Empty workspace
    let (status, body) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().unwrap().len(), 0);

    // After 2 creates
    for name in ["A", "B"] {
        let _ = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
            Some(&token),
            Some(json!({ "name": name })),
        )
        .await;
    }
    let (_status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(body.as_array().unwrap().len(), 2);
}

#[tokio::test]
async fn patch_board_updates_name() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "Old" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();

    let (status, body) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        Some(json!({ "name": "New" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "New");
}

#[tokio::test]
async fn delete_board_cascades_to_columns_and_cards_including_archived() {
    let (app, _pool) = common::setup().await;
    // The workspace creator has the implicit "owner" role (see
    // require_workspace_role: COALESCE(m.role, 'owner')), which satisfies the
    // admin+ gate on board delete — no separate promotion needed.
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "To Delete" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    // Create + archive a card
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "x" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;

    // Delete the board
    let (status, _body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify the board is gone
    let (status, _body) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Verify the archived card is also gone (cascade to trash)
    // We don't have a way to assert directly without listing trash, so we
    // assert the card endpoint is 404:
    let (status, _body) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "still here?" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn reorder_boards_atomic() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let mut board_ids = Vec::new();
    for name in ["A", "B", "C"] {
        let (_status, b) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
            Some(&token),
            Some(json!({ "name": name })),
        )
        .await;
        board_ids.push(b["id"].as_str().unwrap().to_string());
    }

    // Reverse
    let reversed: Vec<String> = board_ids.iter().rev().cloned().collect();
    let (status, _body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/reorder"),
        Some(&token),
        Some(json!({ "boardIds": reversed })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (_status, list) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        None,
    )
    .await;
    let got: Vec<String> = list
        .as_array()
        .unwrap()
        .iter()
        .map(|b| b["id"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(got, reversed);
}

// ── 2. Column CRUD ───────────────────────────────────────────────────────────

#[tokio::test]
async fn create_column_persists() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();

    let (status, col) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/columns"),
        Some(&token),
        Some(json!({ "name": "Review", "wipLimit": 5, "color": "#10b981" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(col["name"], "Review");
    assert_eq!(col["wipLimit"], 5);
    assert_eq!(col["color"], "#10b981");
}

#[tokio::test]
async fn patch_column_renames_and_repositions() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let _board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    let (status, col) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/columns/{col_id}"),
        Some(&token),
        Some(json!({ "name": "Renamed", "wipLimit": 10 })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(col["name"], "Renamed");
    assert_eq!(col["wipLimit"], 10);
}

#[tokio::test]
async fn reorder_columns_atomic() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let mut col_ids: Vec<String> = board["columns"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap().to_string())
        .collect();
    col_ids.reverse();

    let (status, _body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/columns/reorder"),
        Some(&token),
        Some(json!({ "boardId": board_id, "columnIds": col_ids })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (_status, board2) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        None,
    )
    .await;
    let got: Vec<String> = board2["columns"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(got, col_ids);
}

#[tokio::test]
async fn delete_column_merges_cards_into_fallback() {
    // Deleting a column moves its cards into the first remaining column (by
    // position) rather than cascade-deleting them.
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap().to_string();
    let col0 = board["columns"][0]["id"].as_str().unwrap().to_string();
    let col1 = board["columns"][1]["id"].as_str().unwrap().to_string();

    // Two cards in the column we will delete.
    for title in ["C1", "C2"] {
        let _ = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
            Some(&token),
            Some(json!({ "columnId": col0, "title": title })),
        )
        .await;
    }

    let (status, _body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/columns/{col0}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let (_status, board2) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}"),
        Some(&token),
        None,
    )
    .await;
    // Column is gone; the board now has 2 columns.
    let cols = board2["columns"].as_array().unwrap();
    assert_eq!(cols.len(), 2);
    assert!(cols.iter().all(|c| c["id"].as_str().unwrap() != col0));
    // Both cards survived and moved to the fallback (first remaining column).
    let cards = board2["cards"].as_array().unwrap();
    assert_eq!(cards.len(), 2);
    assert!(cards.iter().all(|c| c["columnId"].as_str().unwrap() == col1));
}

#[tokio::test]
async fn delete_last_column_is_refused() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let cols: Vec<String> = board["columns"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap().to_string())
        .collect();

    // Delete the first two — both succeed.
    for col in &cols[..2] {
        let (status, _b) = common::req(
            app.clone(),
            "DELETE",
            &format!("/api/v1/workspaces/{ws_id}/kanban/columns/{col}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::NO_CONTENT);
    }
    // The last column cannot be deleted.
    let (status, _b) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/columns/{}", cols[2]),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ── 3. Card CRUD + archive ──────────────────────────────────────────────────

#[tokio::test]
async fn create_card_persists_to_specified_column() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    let (status, card) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "Hello" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(card["title"], "Hello");
    assert_eq!(card["columnId"], col_id);
    assert_eq!(card["priority"], "none");
}

#[tokio::test]
async fn patch_card_updates_fields() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "Old" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (status, body) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "New", "priority": "high" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["title"], "New");
    assert_eq!(body["priority"], "high");
}

#[tokio::test]
async fn move_card_between_columns() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let cols = board["columns"].as_array().unwrap();
    let col_a = cols[0]["id"].as_str().unwrap();
    let col_b = cols[1]["id"].as_str().unwrap();

    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_a, "title": "Mover" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_id, "targetColumnId": col_b, "targetPosition": 0 })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["columnId"], col_b);
    assert_eq!(body["position"], 0);
}

#[tokio::test]
async fn move_card_within_column() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    // Create 3 cards in same column
    let mut card_ids = Vec::new();
    for i in 0..3 {
        let (_status, c) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
            Some(&token),
            Some(json!({ "columnId": col_id, "title": format!("c{}", i) })),
        )
        .await;
        card_ids.push(c["id"].as_str().unwrap().to_string());
    }

    // Move first card to position 2 (last)
    let (status, _body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_ids[0], "targetColumnId": col_id, "targetPosition": 2 })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // List cards in column — should be in new order
    let (_status, cards) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        None,
    )
    .await;
    let got: Vec<String> = cards
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(got[0], card_ids[1]);
    assert_eq!(got[1], card_ids[2]);
    assert_eq!(got[2], card_ids[0]);
}

#[tokio::test]
async fn archive_card_soft_deletes() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "To archive" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (status, _body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Default list excludes archived
    let (_status, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list.as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn restore_card_returns_to_original_column_with_labels() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    // Create label
    let (_status, label) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "bug", "color": "#ef4444" })),
    )
    .await;
    let label_id = label["id"].as_str().unwrap();

    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "Tagged", "labelIds": [label_id] })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    // Archive
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;

    // Restore
    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/restore"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["columnId"], col_id);
    assert!(body["archivedAt"].is_null() || body["archivedAt"] == Value::Null);
    let label_ids: Vec<&str> = body["labelIds"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert!(label_ids.contains(&label_id));
}

#[tokio::test]
async fn hard_delete_card_removes_physically() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "Bye" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (status, _body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Patch should 404
    let (status, _body) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "still here?" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn list_cards_excludes_archived_by_default() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    for title in ["a", "b", "c"] {
        let (_status, c) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
            Some(&token),
            Some(json!({ "columnId": col_id, "title": title })),
        )
        .await;
        if title == "b" {
            let _ = common::req(
                app.clone(),
                "POST",
                &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{}/archive", c["id"].as_str().unwrap()),
                Some(&token),
                None,
            )
            .await;
        }
    }

    let (_status, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list.as_array().unwrap().len(), 2);

    let (_status, list) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards?includeArchived=true"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list.as_array().unwrap().len(), 3);
}

// ── 4. Label CRUD ───────────────────────────────────────────────────────────

#[tokio::test]
async fn create_label_with_valid_hex() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();

    let (status, label) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "feat", "color": "#10b981" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(label["color"], "#10b981");
}

#[tokio::test]
async fn create_label_rejects_invalid_hex() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();

    for bad in ["10b981", "#abc", "#xyz123", "red"] {
        let (status, _body) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
            Some(&token),
            Some(json!({ "name": "L", "color": bad })),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "expected 400 for color={}", bad);
    }
}

#[tokio::test]
async fn create_label_enforces_50_per_board() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();

    for i in 0..50 {
        let (status, _body) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
            Some(&token),
            Some(json!({ "name": format!("L{}", i), "color": "#10b981" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "label #{} should succeed", i);
    }
    // 51st should fail
    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "L50", "color": "#10b981" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn create_label_rejects_duplicate_name() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();

    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "dup", "color": "#10b981" })),
    )
    .await;
    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "dup", "color": "#ef4444" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn patch_label_updates_fields() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let (_status, label) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "old", "color": "#10b981" })),
    )
    .await;
    let label_id = label["id"].as_str().unwrap();

    let (status, body) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/labels/{label_id}"),
        Some(&token),
        Some(json!({ "name": "new", "color": "#ef4444" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "new");
    assert_eq!(body["color"], "#ef4444");
}

#[tokio::test]
async fn delete_label_cascades_to_card_labels() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, label) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/labels"),
        Some(&token),
        Some(json!({ "name": "tag", "color": "#10b981" })),
    )
    .await;
    let label_id = label["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "x", "labelIds": [label_id] })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (status, _body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/kanban/labels/{label_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Card should still exist but with no labels
    let (_status, body) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "still" })),
    )
    .await;
    assert_eq!(body["labelIds"].as_array().unwrap().len(), 0);
}

// ── 5. Priority 枚举 ───────────────────────────────────────────────────────

#[tokio::test]
async fn priority_accepts_all_five_values() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    for p in ["none", "low", "medium", "high", "urgent"] {
        let (status, body) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
            Some(&token),
            Some(json!({ "columnId": col_id, "title": p, "priority": p })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "priority={} should succeed", p);
        assert_eq!(body["priority"], p);
    }
}

#[tokio::test]
async fn priority_rejects_unknown_value() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "x", "priority": "banana" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ── 6. 30 天自动清理 ────────────────────────────────────────────────────────

#[tokio::test]
async fn cleanup_removes_expired_kanban_trash() {
    use jtype_web::tasks::cleanup_trash;
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "to be purged" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;

    // Force-expire the row
    sqlx::query("UPDATE kanban_card_trash SET expires_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY) WHERE card_id = ?")
        .bind(card_id)
        .execute(&pool)
        .await
        .unwrap();

    let (_kanban, _docs) = cleanup_trash::run_once(&pool).await.unwrap();

    // The card should be hard-gone (trash row was deleted; the kanban_cards
    // row was already marked archived_at, so the card itself is also gone
    // because kanban_card_trash CASCADE-fk-deletes it... no wait, we keep
    // the kanban_cards row even when archived. So the card is still findable
    // but PATCH should still work. The trash row, however, should be gone.)
    let trash_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM kanban_card_trash WHERE card_id = ?")
        .bind(card_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(trash_count, 0, "expired trash row should be purged");
    let _ = app; // silence unused
}

#[tokio::test]
async fn cleanup_preserves_non_expired_trash() {
    use jtype_web::tasks::cleanup_trash;
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "alive" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;

    let _ = cleanup_trash::run_once(&pool).await.unwrap();

    let trash_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM kanban_card_trash WHERE card_id = ?")
        .bind(card_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(trash_count, 1, "non-expired trash row should be kept");
    let _ = app;
}

#[tokio::test]
async fn cleanup_runs_against_both_document_and_kanban_trash() {
    use jtype_web::tasks::cleanup_trash;
    let (app, pool) = common::setup().await;
    // Insert a fake expired document_trash row
    let user_id = common::uid();
    let (token, _uname) = common::register_user(app.clone(), &user_id).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let _ = sqlx::query(
        r#"INSERT INTO document_trash (id, workspace_id, document_id, relative_path, title, content,
           content_hash, version_id, deleted_by_user_id, expires_at)
           VALUES (?, ?, ?, 'x.md', 'x', '', 'h', ?, ?,
                   DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY))"#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&ws_id)
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&user_id)
    .execute(&pool)
    .await
    .unwrap();

    let (docs, _kanban) = cleanup_trash::run_once(&pool).await.unwrap();
    assert!(docs >= 1, "expired document_trash row should be purged");
    let _ = app;
}

// ── 7. 权限 ──────────────────────────────────────────────────────────────────

#[tokio::test]
async fn viewer_cannot_create_board() {
    let (app, pool) = common::setup().await;
    // Owner creates workspace
    let (owner_token, _owner_name) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    // Register viewer and add as member
    let (viewer_token, viewer_name) = common::register_user(app.clone(), &common::uid()).await;
    let viewer_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&viewer_name)
        .fetch_one(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at) VALUES (?, ?, 'viewer', 'active', CURRENT_TIMESTAMP)")
        .bind(&ws_id)
        .bind(&viewer_id)
        .execute(&pool)
        .await
        .unwrap();

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&viewer_token),
        Some(json!({ "name": "X" })),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn priority_default_is_none() {
    // Smoke test: when priority is omitted, it defaults to "none"
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "x" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["priority"], "none");
}

// ── 10. Archive 列表默认行为 ────────────────────────────────────────────────
// Covered by list_cards_excludes_archived_by_default

// ── 11. 跨列移动 + position 重排 ────────────────────────────────────────────
// Covered by move_card_between_columns and move_card_within_column

// ── 8. WS 事件投递 ───────────────────────────────────────────────────────────

#[tokio::test]
async fn ws_broadcasts_board_updated_on_create() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_session_id, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Receive events
    let event = tokio::time::timeout(std::time::Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout waiting for board-updated event")
        .expect("hub channel closed");
    let json: serde_json::Value = serde_json::to_value(&event).unwrap();
    assert_eq!(json["type"], "kanban:board-updated");
    assert!(json["boardId"].is_string());
}

#[tokio::test]
async fn ws_broadcasts_card_archived_on_archive() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "x" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (_session_id, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let _ = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;

    let event = tokio::time::timeout(std::time::Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout")
        .expect("closed");
    let json: serde_json::Value = serde_json::to_value(&event).unwrap();
    assert_eq!(json["type"], "kanban:card-archived");
    assert_eq!(json["cardId"], card_id);
}

#[tokio::test]
async fn ws_broadcasts_card_moved_on_move() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_a = board["columns"][0]["id"].as_str().unwrap();
    let col_b = board["columns"][1]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_a, "title": "M" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();

    let (_session_id, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let _ = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_id, "targetColumnId": col_b, "targetPosition": 0 })),
    )
    .await;

    let event = tokio::time::timeout(std::time::Duration::from_secs(2), rx.recv())
        .await
        .expect("timeout")
        .expect("closed");
    let json: serde_json::Value = serde_json::to_value(&event).unwrap();
    assert_eq!(json["type"], "kanban:card-updated");
    assert_eq!(json["cardId"], card_id);
    assert_eq!(json["columnId"], col_b);
}

#[tokio::test]
async fn ws_excludes_source_session() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (session_id, mut rx) = hub.subscribe_for_test(&ws_id).await;

    // Simulate a request that includes X-Session-Id matching the subscriber
    let (status, _body) = common::req_with_session(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "X" })),
        Some(&session_id),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Subscriber should NOT receive the event (sender is excluded)
    let got = tokio::time::timeout(
        std::time::Duration::from_millis(500),
        rx.recv(),
    )
    .await;
    assert!(got.is_err(), "source session should be excluded; got event");
}

#[tokio::test]
async fn ws_delivers_to_multiple_subscribers() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_s1, mut rx1) = hub.subscribe_for_test(&ws_id).await;
    let (_s2, mut rx2) = hub.subscribe_for_test(&ws_id).await;

    let _ = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "X" })),
    )
    .await;

    let e1 = tokio::time::timeout(std::time::Duration::from_secs(2), rx1.recv())
        .await
        .expect("rx1 timeout")
        .expect("rx1 closed");
    let e2 = tokio::time::timeout(std::time::Duration::from_secs(2), rx2.recv())
        .await
        .expect("rx2 timeout")
        .expect("rx2 closed");
    let j1: serde_json::Value = serde_json::to_value(&e1).unwrap();
    let j2: serde_json::Value = serde_json::to_value(&e2).unwrap();
    assert_eq!(j1["type"], "kanban:board-updated");
    assert_eq!(j2["type"], "kanban:board-updated");
}

// ── 9. 409 冲突 ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn concurrent_card_patch_returns_409_for_stale_writer() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "Original" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();
    let base_clock = card["updatedClock"].as_i64().unwrap();

    // First writer updates
    let (status, _body) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "By A", "baseUpdatedClock": base_clock })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Stale writer (B) tries with old base_clock
    let (status, body) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "By B", "baseUpdatedClock": base_clock })),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(body["error"], "conflict");
    assert_eq!(body["cardId"], card_id);
    assert!(body["latest"].is_object());
}

#[tokio::test]
async fn concurrent_card_move_returns_409_for_stale_writer() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let cols = board["columns"].as_array().unwrap();
    let col_a = cols[0]["id"].as_str().unwrap();
    let col_b = cols[1]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_a, "title": "M" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();
    let base_clock = card["updatedClock"].as_i64().unwrap();

    // First move (consumes clock)
    let (status, _body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_id, "targetColumnId": col_b, "targetPosition": 0, "baseUpdatedClock": base_clock })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Stale move
    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards/move"),
        Some(&token),
        Some(json!({ "cardId": card_id, "targetColumnId": col_a, "targetPosition": 0, "baseUpdatedClock": base_clock })),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(body["error"], "conflict");
}

#[tokio::test]
async fn conflict_response_includes_latest_card_snapshot() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap();
    let col_id = board["columns"][0]["id"].as_str().unwrap();
    let (_status, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col_id, "title": "snap" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap();
    let base_clock = card["updatedClock"].as_i64().unwrap();

    // First writer updates title
    let _ = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "Latest", "baseUpdatedClock": base_clock })),
    )
    .await;

    // Stale writer receives snapshot
    let (_status, body) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}"),
        Some(&token),
        Some(json!({ "title": "Stale", "baseUpdatedClock": base_clock })),
    )
    .await;
    assert_eq!(body["latest"]["title"], "Latest");
    assert!(body["latest"]["updatedClock"].as_i64().unwrap() > base_clock);
    assert_eq!(body["baseUpdatedClock"], base_clock);
}

#[tokio::test]
async fn card_activity_reports_created_and_archived() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_s, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap().to_string();
    let col = board["columns"][0]["id"].as_str().unwrap().to_string();
    let (_s, card) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token),
        Some(json!({ "columnId": col, "title": "X" })),
    )
    .await;
    let card_id = card["id"].as_str().unwrap().to_string();

    // After create: a "created" event carrying the creator's username.
    let (status, acts) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/activity"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let created = acts.as_array().unwrap().iter().find(|e| e["kind"] == "created").expect("created event");
    assert!(created["by"].is_string());

    // After archive: an "archived" event appears.
    let _ = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token),
        None,
    )
    .await;
    let (_s, acts2) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/activity"),
        Some(&token),
        None,
    )
    .await;
    assert!(acts2.as_array().unwrap().iter().any(|e| e["kind"] == "archived"));
}

#[tokio::test]
async fn delete_column_keeps_archived_cards_restorable() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (_s, board) = common::req(
        app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/boards"),
        Some(&token), Some(json!({ "name": "B" })),
    ).await;
    let board_id = board["id"].as_str().unwrap().to_string();
    let col0 = board["columns"][0]["id"].as_str().unwrap().to_string();
    let col1 = board["columns"][1]["id"].as_str().unwrap().to_string();

    // card in col0, then archive it
    let (_s, card) = common::req(
        app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/boards/{board_id}/cards"),
        Some(&token), Some(json!({ "columnId": col0, "title": "X" })),
    ).await;
    let card_id = card["id"].as_str().unwrap().to_string();
    let _ = common::req(
        app.clone(), "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/archive"),
        Some(&token), None,
    ).await;

    // delete the archived card's column
    let (status, _) = common::req(
        app.clone(), "DELETE", &format!("/api/v1/workspaces/{ws_id}/kanban/columns/{col0}"),
        Some(&token), None,
    ).await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // the archived card must still be restorable — into the fallback column
    let (status, restored) = common::req(
        app, "POST", &format!("/api/v1/workspaces/{ws_id}/kanban/cards/{card_id}/restore"),
        Some(&token), None,
    ).await;
    assert_eq!(status, StatusCode::OK, "archived card should still restore after column delete");
    assert_eq!(restored["columnId"].as_str().unwrap(), col1, "restored into the fallback column");
}
