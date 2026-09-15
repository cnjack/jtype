mod common;

use axum::http::StatusCode;
use serde_json::{json, Value};

fn card(board: &str, title: &str, body: &str) -> String {
    format!("---\ntitle: {title}\nboard: {board}\nstatus: todo\n---\n\n{body}\n")
}

async fn board_cards(
    app: axum::Router,
    token: Option<&str>,
    workspace_id: &str,
    board_ref: &str,
) -> (StatusCode, Value) {
    common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/boards/{board_ref}/cards"),
        token,
        None,
    )
    .await
}

#[tokio::test]
async fn board_cards_match_exact_logical_board_across_directories() {
    let (app, _pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;

    let second = card("delivery-board", "Second Card", "second body");
    let first = card("delivery-board", "First Card", "first body");
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "zeta/second.md",
        &second,
    )
    .await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "alpha/deep/first.md",
        &first,
    )
    .await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "alpha/other.md",
        &card("other-board", "Other Card", "other body"),
    )
    .await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "alpha/similar.md",
        &card("delivery-board-extra", "Similar Board", "similar body"),
    )
    .await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "alpha/plain.md",
        "# Plain Markdown\n\nNo board frontmatter.\n",
    )
    .await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "alpha/not-markdown.board",
        &card("delivery-board", "Not Markdown", "excluded by extension"),
    )
    .await;

    let (status, body) =
        board_cards(app, Some(&owner_token), &workspace_id, "delivery-board").await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let cards = body.as_array().expect("response must be CloudDocument[]");
    assert_eq!(cards.len(), 2, "{body}");
    assert_eq!(cards[0]["relativePath"], "alpha/deep/first.md");
    assert_eq!(cards[1]["relativePath"], "zeta/second.md");
    assert_eq!(cards[0]["title"], "alpha/deep/first");
    assert_eq!(cards[0]["content"], first);
    assert_eq!(cards[1]["content"], second);

    for document in cards {
        assert!(document["documentId"].as_str().is_some(), "{document}");
        assert!(document["contentHash"].as_str().is_some(), "{document}");
        assert!(document["versionId"].as_str().is_some(), "{document}");
        assert!(document["updatedClock"].as_i64().is_some(), "{document}");
        assert!(document["isPublished"].is_boolean(), "{document}");
    }
}

#[tokio::test]
async fn board_membership_tracks_save_move_delete_and_restore_atomically() {
    let (app, pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    let path = "cards/lifecycle.md";

    let created = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        path,
        &card("Lifecycle-Old", "Lifecycle", "created"),
    )
    .await;
    let document_id = created["documentId"].as_str().unwrap().to_string();

    let projected_board: String = sqlx::query_scalar(
        "SELECT CAST(board_ref AS CHAR CHARACTER SET utf8mb4) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(projected_board, "Lifecycle-Old");

    let (old_status, old_cards) = board_cards(
        app.clone(),
        Some(&owner_token),
        &workspace_id,
        "Lifecycle-Old",
    )
    .await;
    assert_eq!(old_status, StatusCode::OK, "{old_cards}");
    assert_eq!(old_cards.as_array().map(Vec::len), Some(1));

    // The projection column uses binary collation, preserving the prior exact
    // Rust-string semantics instead of MySQL's default case folding.
    let (_, wrong_case) = board_cards(
        app.clone(),
        Some(&owner_token),
        &workspace_id,
        "lifecycle-old",
    )
    .await;
    assert_eq!(wrong_case.as_array().map(Vec::len), Some(0));

    let moved = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        path,
        &card("Lifecycle-New", "Lifecycle", "moved"),
    )
    .await;
    assert_eq!(moved["documentId"], document_id);
    let (_, old_cards) = board_cards(
        app.clone(),
        Some(&owner_token),
        &workspace_id,
        "Lifecycle-Old",
    )
    .await;
    let (_, new_cards) = board_cards(
        app.clone(),
        Some(&owner_token),
        &workspace_id,
        "Lifecycle-New",
    )
    .await;
    assert_eq!(old_cards.as_array().map(Vec::len), Some(0));
    assert_eq!(new_cards.as_array().map(Vec::len), Some(1));

    let (delete_status, delete_body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(delete_status, StatusCode::NO_CONTENT, "{delete_body}");
    let membership_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(membership_count, 0);
    let (_, deleted_cards) = board_cards(
        app.clone(),
        Some(&owner_token),
        &workspace_id,
        "Lifecycle-New",
    )
    .await;
    assert_eq!(deleted_cards.as_array().map(Vec::len), Some(0));

    let (trash_status, trash) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/trash"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(trash_status, StatusCode::OK, "{trash}");
    let trash_id = trash
        .as_array()
        .and_then(|items| {
            items
                .iter()
                .find(|item| item["relativePath"].as_str() == Some(path))
        })
        .and_then(|item| item["id"].as_str())
        .unwrap();
    let (restore_status, restored) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/trash/{trash_id}/restore"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(restore_status, StatusCode::OK, "{restored}");
    let restored_id = restored["documentId"].as_str().unwrap();
    let restored_board: String = sqlx::query_scalar(
        "SELECT CAST(board_ref AS CHAR CHARACTER SET utf8mb4) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&workspace_id)
    .bind(restored_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(restored_board, "Lifecycle-New");
    let (_, restored_cards) =
        board_cards(app, Some(&owner_token), &workspace_id, "Lifecycle-New").await;
    assert_eq!(restored_cards.as_array().map(Vec::len), Some(1));
}

#[tokio::test]
async fn restore_path_conflict_preserves_current_document_history_and_trash() {
    let (app, pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    let path = "cards/restore-conflict.md";

    let deleted = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        path,
        &card("Archived-Board", "Archived", "content in trash"),
    )
    .await;
    let deleted_id = deleted["documentId"].as_str().unwrap();
    let (delete_status, delete_body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{deleted_id}"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(delete_status, StatusCode::NO_CONTENT, "{delete_body}");

    let replacement = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        path,
        &card("Current-Board", "Current", "replacement v1"),
    )
    .await;
    let replacement_id = replacement["documentId"].as_str().unwrap().to_string();
    let replacement_content = card("Current-Board", "Current", "replacement v2");
    let updated = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        path,
        &replacement_content,
    )
    .await;
    assert_eq!(updated["documentId"], replacement_id);

    let (comment_status, comment) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{replacement_id}/comments"),
        Some(&owner_token),
        Some(json!({ "body": "must survive restore conflict" })),
    )
    .await;
    assert_eq!(comment_status, StatusCode::OK, "{comment}");

    let (trash_status, trash) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/trash"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(trash_status, StatusCode::OK, "{trash}");
    let trash_id = trash
        .as_array()
        .and_then(|items| {
            items
                .iter()
                .find(|item| item["relativePath"].as_str() == Some(path))
        })
        .and_then(|item| item["id"].as_str())
        .unwrap()
        .to_string();

    let clock_before: i64 = sqlx::query_scalar("SELECT sync_clock FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    let versions_before: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM document_versions WHERE document_id = ?")
            .bind(&replacement_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let comments_before: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM card_comments WHERE document_id = ?")
            .bind(&replacement_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let events_before: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM kanban_events WHERE document_id = ?")
            .bind(&replacement_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(versions_before >= 2);
    assert_eq!(comments_before, 1);
    assert!(events_before >= 2);

    let (restore_status, restore_error) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/trash/{trash_id}/restore"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(restore_status, StatusCode::CONFLICT, "{restore_error}");
    assert!(
        restore_error["error"]
            .as_str()
            .is_some_and(|message| message.contains("already exists")),
        "{restore_error}"
    );

    let current: (String, String) = sqlx::query_as(
        "SELECT id, content FROM documents WHERE workspace_id = ? AND relative_path = ?",
    )
    .bind(&workspace_id)
    .bind(path)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(current.0, replacement_id);
    assert_eq!(current.1, replacement_content);
    let clock_after: i64 = sqlx::query_scalar("SELECT sync_clock FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    let versions_after: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM document_versions WHERE document_id = ?")
            .bind(&replacement_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let comments_after: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM card_comments WHERE document_id = ?")
            .bind(&replacement_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let events_after: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM kanban_events WHERE document_id = ?")
            .bind(&replacement_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let trash_still_open: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM document_trash WHERE id = ? AND restored_at IS NULL AND restored_clock IS NULL",
    )
    .bind(&trash_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(clock_after, clock_before);
    assert_eq!(versions_after, versions_before);
    assert_eq!(comments_after, comments_before);
    assert_eq!(events_after, events_before);
    assert_eq!(trash_still_open, 1);

    let (_, current_cards) =
        board_cards(app, Some(&owner_token), &workspace_id, "Current-Board").await;
    assert_eq!(current_cards.as_array().map(Vec::len), Some(1));
    assert_eq!(current_cards[0]["documentId"], replacement_id);
}

#[tokio::test]
async fn legacy_document_writes_are_durably_reconciled_during_rollout() {
    let (app, pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    let document_id = uuid::Uuid::new_v4().to_string();
    let initial = card("Legacy-Old", "Legacy", "written by an old instance");

    // Establish the empty workspace watermark as a new instance would.
    let (empty_status, empty_cards) =
        board_cards(app.clone(), Some(&owner_token), &workspace_id, "Legacy-Old").await;
    assert_eq!(empty_status, StatusCode::OK, "{empty_cards}");
    assert_eq!(empty_cards.as_array().map(Vec::len), Some(0));

    // Simulate a pre-0030 instance: it writes documents but knows nothing about
    // the projection state. Its existing write contract does advance and lock
    // workspace.sync_clock before inserting the document.
    let mut legacy_insert = pool.begin().await.unwrap();
    sqlx::query(
        r#"UPDATE workspaces
           SET sync_clock = LAST_INSERT_ID(sync_clock + 1), updated_at = updated_at
           WHERE id = ?"#,
    )
    .bind(&workspace_id)
    .execute(&mut *legacy_insert)
    .await
    .unwrap();
    let insert_clock: i64 = sqlx::query_scalar("SELECT CAST(LAST_INSERT_ID() AS SIGNED)")
        .fetch_one(&mut *legacy_insert)
        .await
        .unwrap();
    sqlx::query(
        r#"INSERT INTO documents
           (id, workspace_id, relative_path, title, content_hash, content, updated_clock)
           VALUES (?, ?, 'cards/legacy.md', 'Legacy', ?, ?, ?)"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .bind("a".repeat(64))
    .bind(&initial)
    .bind(insert_clock)
    .execute(&mut *legacy_insert)
    .await
    .unwrap();
    legacy_insert.commit().await.unwrap();

    let watermark_before_read: i64 = sqlx::query_scalar(
        "SELECT reconciled_clock FROM board_membership_projection_state WHERE workspace_id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    let projected_before_read: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(watermark_before_read < insert_clock);
    assert_eq!(projected_before_read, 0);

    let (old_status, old_cards) =
        board_cards(app.clone(), Some(&owner_token), &workspace_id, "Legacy-Old").await;
    assert_eq!(old_status, StatusCode::OK, "{old_cards}");
    assert_eq!(old_cards.as_array().map(Vec::len), Some(1));
    let watermark_after_read: i64 = sqlx::query_scalar(
        "SELECT reconciled_clock FROM board_membership_projection_state WHERE workspace_id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(watermark_after_read, insert_clock);

    let moved = card("Legacy-New", "Legacy", "updated by an old instance");
    let mut legacy_update = pool.begin().await.unwrap();
    sqlx::query(
        r#"UPDATE workspaces
           SET sync_clock = LAST_INSERT_ID(sync_clock + 1), updated_at = updated_at
           WHERE id = ?"#,
    )
    .bind(&workspace_id)
    .execute(&mut *legacy_update)
    .await
    .unwrap();
    let update_clock: i64 = sqlx::query_scalar("SELECT CAST(LAST_INSERT_ID() AS SIGNED)")
        .fetch_one(&mut *legacy_update)
        .await
        .unwrap();
    sqlx::query(
        "UPDATE documents SET content = ?, content_hash = ?, updated_clock = ? WHERE workspace_id = ? AND id = ?",
    )
    .bind(&moved)
    .bind("b".repeat(64))
    .bind(update_clock)
    .bind(&workspace_id)
    .bind(&document_id)
    .execute(&mut *legacy_update)
    .await
    .unwrap();
    legacy_update.commit().await.unwrap();

    let watermark_before_move_read: i64 = sqlx::query_scalar(
        "SELECT reconciled_clock FROM board_membership_projection_state WHERE workspace_id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(watermark_before_move_read, insert_clock);
    assert!(watermark_before_move_read < update_clock);

    let (_, old_cards) =
        board_cards(app.clone(), Some(&owner_token), &workspace_id, "Legacy-Old").await;
    let (_, new_cards) = board_cards(app, Some(&owner_token), &workspace_id, "Legacy-New").await;
    assert_eq!(old_cards.as_array().map(Vec::len), Some(0));
    assert_eq!(new_cards.as_array().map(Vec::len), Some(1));
    assert_eq!(new_cards[0]["documentId"], document_id);

    let watermark_final: i64 = sqlx::query_scalar(
        "SELECT reconciled_clock FROM board_membership_projection_state WHERE workspace_id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(watermark_final, update_clock);
}

#[tokio::test]
async fn projection_repair_survives_mixed_version_lock_order() {
    let (app, pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    let path = "cards/mixed-lock-order.md";
    let plain = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        path,
        "# Not a Card yet\n",
    )
    .await;
    let document_id = plain["documentId"].as_str().unwrap().to_string();

    // Establish a watermark before simulating an old instance's Card write.
    let (_, empty) = board_cards(
        app.clone(),
        Some(&owner_token),
        &workspace_id,
        "Mixed-Lock-Board",
    )
    .await;
    assert_eq!(empty.as_array().map(Vec::len), Some(0));

    let card_content = card("Mixed-Lock-Board", "Mixed lock order", "legacy Card write");
    let mut legacy_write = pool.begin().await.unwrap();
    sqlx::query(
        r#"UPDATE workspaces
           SET sync_clock = LAST_INSERT_ID(sync_clock + 1), updated_at = updated_at
           WHERE id = ?"#,
    )
    .bind(&workspace_id)
    .execute(&mut *legacy_write)
    .await
    .unwrap();
    let legacy_clock: i64 = sqlx::query_scalar("SELECT CAST(LAST_INSERT_ID() AS SIGNED)")
        .fetch_one(&mut *legacy_write)
        .await
        .unwrap();
    sqlx::query(
        "UPDATE documents SET content = ?, content_hash = ?, updated_clock = ? WHERE workspace_id = ? AND id = ?",
    )
    .bind(&card_content)
    .bind("c".repeat(64))
    .bind(legacy_clock)
    .bind(&workspace_id)
    .bind(&document_id)
    .execute(&mut *legacy_write)
    .await
    .unwrap();
    legacy_write.commit().await.unwrap();

    // Reproduce the mixed-version order: an old transaction owns the document
    // row first, while reconciliation takes the workspace clock first and then
    // needs the document for a membership FK. NOWAIT must roll back that repair
    // attempt promptly, releasing the clock so the old transaction can finish;
    // the bounded whole-transaction retry then observes its final clock.
    let mut old_delete_order = pool.begin().await.unwrap();
    sqlx::query(
        "UPDATE documents SET is_published = NOT is_published WHERE workspace_id = ? AND id = ?",
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .execute(&mut *old_delete_order)
    .await
    .unwrap();

    let repair_pool = pool.clone();
    let repair_workspace = workspace_id.clone();
    let repair = tokio::spawn(async move {
        jtype_web::db::board_memberships::reconcile_workspace(&repair_pool, &repair_workspace).await
    });
    tokio::time::sleep(std::time::Duration::from_millis(2)).await;

    let old_clock_result = sqlx::query(
        r#"UPDATE workspaces
           SET sync_clock = LAST_INSERT_ID(sync_clock + 1), updated_at = updated_at
           WHERE id = ?"#,
    )
    .bind(&workspace_id)
    .execute(&mut *old_delete_order)
    .await;
    match old_clock_result {
        Ok(_) => old_delete_order.commit().await.unwrap(),
        Err(error) => {
            let number = error.as_database_error().and_then(|error| {
                error
                    .try_downcast_ref::<sqlx::mysql::MySqlDatabaseError>()
                    .map(|error| error.number())
            });
            assert!(matches!(number, Some(1205 | 1213)), "{error}");
            let _ = old_delete_order.rollback().await;
        }
    }

    let repaired = tokio::time::timeout(std::time::Duration::from_secs(5), repair)
        .await
        .expect("projection repair must not remain blocked")
        .expect("projection repair task must not panic")
        .expect("projection repair must retry a deadlock");
    assert!(repaired >= 1);

    let (_, cards) = board_cards(app, Some(&owner_token), &workspace_id, "Mixed-Lock-Board").await;
    assert_eq!(cards.as_array().map(Vec::len), Some(1));
    assert_eq!(cards[0]["documentId"], document_id);
}

#[tokio::test]
async fn conflict_resolution_updates_board_membership_with_the_accepted_markdown() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "cards/conflict-move.md";

    let created = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        path,
        &card("Conflict-Old", "Conflict", "base"),
    )
    .await;
    let document_id = created["documentId"].as_str().unwrap();
    let base_hash = created["contentHash"].as_str().unwrap();

    common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        path,
        &card("Conflict-Old", "Conflict", "cloud edit"),
    )
    .await;
    let (conflict_status, conflict) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        Some(&token),
        Some(json!({
            "documentId": document_id,
            "relativePath": path,
            "content": card("Conflict-New", "Conflict", "local edit"),
            "baseContentHash": base_hash,
        })),
    )
    .await;
    assert_eq!(conflict_status, StatusCode::CONFLICT, "{conflict}");

    let conflict_id = conflict["conflictId"].as_str().unwrap();
    let (resolve_status, resolved) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/conflicts/{conflict_id}/resolve"),
        Some(&token),
        Some(json!({ "resolution": "accept_local" })),
    )
    .await;
    assert_eq!(resolve_status, StatusCode::OK, "{resolved}");

    let projected_board: String = sqlx::query_scalar(
        "SELECT CAST(board_ref AS CHAR CHARACTER SET utf8mb4) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&workspace_id)
    .bind(document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(projected_board, "Conflict-New");
    let (_, old_cards) =
        board_cards(app.clone(), Some(&token), &workspace_id, "Conflict-Old").await;
    let (_, new_cards) = board_cards(app, Some(&token), &workspace_id, "Conflict-New").await;
    assert_eq!(old_cards.as_array().map(Vec::len), Some(0));
    assert_eq!(new_cards.as_array().map(Vec::len), Some(1));
}

#[tokio::test]
async fn board_cards_allow_viewers_and_require_authentication() {
    let (app, _pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (viewer_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (outsider_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;

    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "cards/viewable.md",
        &card("viewer-board", "Viewable", "viewer body"),
    )
    .await;

    let (invite_status, invite) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/invites"),
        Some(&owner_token),
        Some(json!({ "role": "viewer" })),
    )
    .await;
    assert_eq!(invite_status, StatusCode::OK, "{invite}");
    let invite_token = invite["inviteToken"].as_str().unwrap();
    let (accept_status, accept_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&viewer_token),
        None,
    )
    .await;
    assert_eq!(accept_status, StatusCode::OK, "{accept_body}");

    let (viewer_status, viewer_body) = board_cards(
        app.clone(),
        Some(&viewer_token),
        &workspace_id,
        "viewer-board",
    )
    .await;
    assert_eq!(viewer_status, StatusCode::OK, "{viewer_body}");
    assert_eq!(viewer_body.as_array().map(Vec::len), Some(1));

    let (outsider_status, outsider_body) = board_cards(
        app.clone(),
        Some(&outsider_token),
        &workspace_id,
        "viewer-board",
    )
    .await;
    assert_eq!(outsider_status, StatusCode::NOT_FOUND, "{outsider_body}");

    let (unauthorized_status, unauthorized_body) =
        board_cards(app, None, &workspace_id, "viewer-board").await;
    assert_eq!(
        unauthorized_status,
        StatusCode::UNAUTHORIZED,
        "{unauthorized_body}"
    );
}
