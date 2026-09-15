mod common;

use axum::http::StatusCode;
use futures::future::join_all;
use serde_json::json;

fn card(board: &str, title: &str, status: &str, body: &str) -> String {
    format!("---\ntitle: {title}\nboard: {board}\nstatus: {status}\n---\n\n{body}\n")
}

async fn pull(
    app: axum::Router,
    token: &str,
    workspace_id: &str,
    board: &str,
    after_sequence: i64,
    limit: usize,
) -> (StatusCode, serde_json::Value) {
    common::req(
        app,
        "GET",
        &format!(
            "/api/v1/workspaces/{workspace_id}/boards/{board}/events/pull?afterSequence={after_sequence}&limit={limit}"
        ),
        Some(token),
        None,
    )
    .await
}

#[tokio::test]
async fn pull_returns_only_new_card_events_in_sequence_order() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // Non-card documents never enter the board event log.
    common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "notes/readme.md",
        "# Not a card",
    )
    .await;

    let created = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/alpha.md",
        &card("board-a", "Alpha", "todo", "first"),
    )
    .await;
    let created_sequence = created["updatedClock"]
        .as_i64()
        .expect("created document sequence");

    // An unchanged re-save is a no-op and must not duplicate the event.
    common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/alpha.md",
        &card("board-a", "Alpha", "todo", "first"),
    )
    .await;

    // A card on a different board must not leak into this board's feed.
    common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/other.md",
        &card("board-b", "Other", "todo", "other"),
    )
    .await;

    // Rebuild the app to prove replay comes from MySQL, not the in-process bus.
    let app = jtype_web::build_router(pool, "http://localhost:13345".to_string());
    let (status, body) = pull(app.clone(), &token, &workspace_id, "board-a", 0, 100).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["hasMore"], false);
    assert_eq!(body["nextSequence"], created_sequence);
    let events = body["events"].as_array().expect("events array");
    assert_eq!(events.len(), 1, "{body}");
    assert_eq!(events[0]["sequence"], created_sequence);
    assert_eq!(events[0]["updatedClock"], created_sequence);
    assert_eq!(events[0]["event"], "kanban:card-created");
    assert_eq!(events[0]["domainEvent"], "card.created");
    assert_eq!(events[0]["eventId"].as_str().unwrap().len(), 36);
    assert_eq!(events[0]["board"], "board-a");
    assert_eq!(events[0]["card"]["documentId"], created["documentId"]);
    assert_eq!(events[0]["card"]["path"], "cards/alpha.md");
    assert_eq!(events[0]["card"]["status"], "todo");
    assert_eq!(events[0]["actor"]["kind"], "user");
    assert_eq!(events[0]["client"]["kind"], "web");
    assert!(events[0]["changes"].as_array().is_some());

    let updated = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/alpha.md",
        &card("board-a", "Alpha", "done", "completed"),
    )
    .await;
    let updated_sequence = updated["updatedClock"]
        .as_i64()
        .expect("updated document sequence");
    assert!(updated_sequence > created_sequence);

    let (status, body) = pull(app, &token, &workspace_id, "board-a", created_sequence, 100).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["nextSequence"], updated_sequence);
    let events = body["events"].as_array().expect("events array");
    assert_eq!(events.len(), 1, "{body}");
    assert_eq!(events[0]["sequence"], updated_sequence);
    assert_eq!(events[0]["event"], "kanban:card-updated");
    assert_eq!(events[0]["domainEvent"], "card.updated");
    assert_eq!(events[0]["card"]["status"], "done");
}

#[tokio::test]
async fn changing_board_emits_remove_then_add_for_both_projections() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let created = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/moving.md",
        &card("board-old", "Moving", "todo", "before"),
    )
    .await;
    let created_sequence = created["updatedClock"].as_i64().unwrap();

    let moved = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/moving.md",
        &card("board-new", "Moving", "doing", "after"),
    )
    .await;
    let removal_sequence = moved["updatedClock"].as_i64().unwrap();

    let (status, old_feed) = pull(
        app.clone(),
        &token,
        &workspace_id,
        "board-old",
        created_sequence,
        100,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{old_feed}");
    assert_eq!(old_feed["events"].as_array().unwrap().len(), 1);
    assert_eq!(old_feed["events"][0]["sequence"], removal_sequence);
    assert_eq!(old_feed["events"][0]["event"], "kanban:card-deleted");
    assert_eq!(old_feed["events"][0]["domainEvent"], "card.deleted");
    assert_eq!(
        old_feed["events"][0]["changes"]
            .as_array()
            .unwrap()
            .iter()
            .find(|change| change["field"] == "board")
            .unwrap()["after"],
        "board-new"
    );

    let (status, new_feed) = pull(app, &token, &workspace_id, "board-new", 0, 100).await;
    assert_eq!(status, StatusCode::OK, "{new_feed}");
    assert_eq!(new_feed["events"].as_array().unwrap().len(), 1);
    assert_eq!(new_feed["events"][0]["event"], "kanban:card-created");
    assert_eq!(new_feed["events"][0]["domainEvent"], "card.created");
    assert!(new_feed["events"][0]["sequence"].as_i64().unwrap() > removal_sequence);
}

#[tokio::test]
async fn concurrent_card_saves_commit_events_without_sequence_gaps_or_reordering() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let saves = join_all((0..8).map(|index| {
        let app = app.clone();
        let token = token.clone();
        let workspace_id = workspace_id.clone();
        async move {
            let content = card(
                "board-concurrent",
                &format!("Card {index}"),
                "todo",
                "concurrent",
            );
            common::save_doc(
                app,
                &token,
                &workspace_id,
                &format!("cards/concurrent-{index}.md"),
                &content,
            )
            .await
        }
    }))
    .await;
    let mut saved_clocks: Vec<i64> = saves
        .iter()
        .map(|saved| saved["updatedClock"].as_i64().unwrap())
        .collect();
    saved_clocks.sort_unstable();

    let (status, body) = pull(app, &token, &workspace_id, "board-concurrent", 0, 100).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let event_sequences: Vec<i64> = body["events"]
        .as_array()
        .unwrap()
        .iter()
        .map(|event| event["sequence"].as_i64().unwrap())
        .collect();
    assert_eq!(event_sequences, saved_clocks);
}

#[tokio::test]
async fn pull_paginates_without_advancing_past_an_unreturned_event() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    for (path, title) in [("cards/one.md", "One"), ("cards/two.md", "Two")] {
        common::save_doc(
            app.clone(),
            &token,
            &workspace_id,
            path,
            &card("board-page", title, "todo", title),
        )
        .await;
    }

    let (status, first) = pull(app.clone(), &token, &workspace_id, "board-page", 0, 1).await;
    assert_eq!(status, StatusCode::OK, "{first}");
    assert_eq!(first["hasMore"], true);
    assert_eq!(first["events"].as_array().unwrap().len(), 1);
    let cursor = first["nextSequence"].as_i64().expect("first cursor");
    assert_eq!(first["events"][0]["sequence"], cursor);

    let (status, second) = pull(app, &token, &workspace_id, "board-page", cursor, 1).await;
    assert_eq!(status, StatusCode::OK, "{second}");
    assert_eq!(second["hasMore"], false);
    assert_eq!(second["events"].as_array().unwrap().len(), 1);
    assert!(second["nextSequence"].as_i64().unwrap() > cursor);
}

#[tokio::test]
async fn pull_rejects_invalid_cursor_and_page_size() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = pull(
        app.clone(),
        &token,
        &workspace_id,
        "board-validation",
        -1,
        100,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");

    let (status, body) = pull(app, &token, &workspace_id, "board-validation", 0, 1_001).await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
}

#[tokio::test]
async fn board_scoped_mcp_token_cannot_call_pull_rest_api() {
    let (app, _pool) = common::setup().await;
    let (owner_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (outsider_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "agent.board",
        &json!({
            "id": "board-agent",
            "title": "Agent",
            "columns": [{ "key": "todo", "name": "Todo" }]
        })
        .to_string(),
    )
    .await;
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "cards/agent.md",
        &card("board-agent", "Agent", "todo", "agent"),
    )
    .await;

    let (mint_status, minted) = common::req(
        app.clone(),
        "POST",
        "/api/v1/mcp-token",
        Some(&owner_token),
        Some(json!({ "workspaceId": workspace_id, "boardId": "board-agent" })),
    )
    .await;
    assert_eq!(mint_status, StatusCode::OK, "{minted}");
    let mcp_token = minted["token"].as_str().expect("mcp token");

    let (status, body) = pull(app.clone(), mcp_token, &workspace_id, "board-agent", 0, 100).await;
    assert_eq!(status, StatusCode::FORBIDDEN, "{body}");

    let (status, _) = pull(app, &outsider_token, &workspace_id, "board-agent", 0, 100).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
