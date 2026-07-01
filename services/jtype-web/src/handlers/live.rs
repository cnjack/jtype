use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::{Path, Query, State},
    response::sse::{Event, KeepAlive, Sse},
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use serde::Deserialize;
use sqlx::Row;
use std::convert::Infallible;
use tokio::sync::broadcast::error::RecvError;
use uuid::Uuid;

use crate::db::models::{AuthUser, CloudSaveDocumentRequest, TrashOperation};
use crate::error::AppError;
use crate::handlers::document::{save_document_version, SaveDocumentOutcome};
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::util::sha256_hex;
use crate::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WsAuth {
    token: String,
    client_type: Option<String>,
    device_id: Option<String>,
}

#[derive(Deserialize)]
pub struct SseAuth {
    token: String,
}

/// `GET /api/v1/workspaces/:workspace_id/boards/:board_ref/events` — the SSE
/// "pull" feed for one board: streams `kanban:card-updated` events as they fire,
/// the live counterpart to outbound webhooks. Auth is via `?token=` because an
/// `EventSource` can't set an `Authorization` header (same pattern as the WS feed).
pub async fn board_events_stream(
    State(state): State<AppState>,
    Path((workspace_id, board_ref)): Path<(String, String)>,
    Query(auth): Query<SseAuth>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, AppError> {
    let user = validate_ws_token(&state.pool, &auth.token).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rx = crate::board_events::global().subscribe(&workspace_id, &board_ref);
    let stream = futures::stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(payload) => return Some((Ok(Event::default().data(payload)), rx)),
                // Slow consumer: some events were dropped. Skip and keep streaming.
                Err(RecvError::Lagged(_)) => continue,
                Err(RecvError::Closed) => return None,
            }
        }
    });
    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

pub async fn ws_upgrade(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(workspace_id): Path<String>,
    Query(auth): Query<WsAuth>,
) -> Result<impl IntoResponse, AppError> {
    let user = validate_ws_token(&state.pool, &auth.token).await?;
    let role = require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;
    let session_id = Uuid::new_v4().to_string();
    let client_type = auth.client_type.unwrap_or_else(|| "desktop".to_string());

    Ok(ws.on_upgrade(move |socket| {
        handle_ws(
            socket,
            state,
            workspace_id,
            user.id,
            user.username,
            session_id,
            client_type,
            auth.device_id,
            role,
        )
    }))
}

/// Per-user singleton WS endpoint: /api/v1/live
/// A single connection covers all workspaces the user belongs to.
pub async fn ws_upgrade_user(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(auth): Query<WsAuth>,
) -> Result<impl IntoResponse, AppError> {
    let user = validate_ws_token(&state.pool, &auth.token).await?;
    let session_id = Uuid::new_v4().to_string();
    let client_type = auth.client_type.unwrap_or_else(|| "desktop".to_string());

    Ok(ws.on_upgrade(move |socket| {
        handle_user_ws(
            socket,
            state,
            user.id,
            user.username,
            session_id,
            client_type,
            auth.device_id,
        )
    }))
}

/// Authenticates the live WS/SSE feeds (board pull-SSE, workspace WS, the
/// per-user WS). These are full-session features — presence, live document
/// pushes, the collaborative WS — never the surface a scoped MCP token should
/// reach, so unlike [`crate::middleware::auth::extract_user`] (which lets
/// `mcp`-scoped callers through for the REST/MCP-dispatch paths that expect
/// them) this rejects anything but `scope == "full"`.
async fn validate_ws_token(
    pool: &sqlx::Pool<sqlx::MySql>,
    token: &str,
) -> Result<AuthUser, AppError> {
    let token_hash = sha256_hex(token);
    let row = sqlx::query(
        r#"SELECT u.id, u.username, u.role, u.disabled_at, s.scope
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ?
             AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)"#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let disabled_at: Option<String> = row.try_get("disabled_at").unwrap_or(None);
    if disabled_at.is_some() {
        return Err(AppError::Forbidden);
    }

    // Fail closed: a scope read failure must deny, never escalate to `full`.
    let scope: String = row.try_get("scope")?;
    if scope != "full" {
        return Err(AppError::Forbidden);
    }

    Ok(AuthUser {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        role: row.try_get("role")?,
        scope,
    })
}

async fn handle_ws(
    socket: WebSocket,
    state: AppState,
    workspace_id: String,
    user_id: String,
    username: String,
    session_id: String,
    client_type: String,
    device_id: Option<String>,
    role: String,
) {
    let (mut sink, mut stream) = socket.split();

    let workspace_clock = fetch_workspace_clock(&state.pool, &workspace_id).await;

    let connected = serde_json::json!({
        "type": "connected",
        "sessionId": session_id,
        "workspaceClock": workspace_clock,
    });
    if sink
        .send(Message::Text(connected.to_string()))
        .await
        .is_err()
    {
        return;
    }

    let (out_tx, mut out_rx) = tokio::sync::mpsc::channel::<Message>(32);

    // Register session with hub (fixes B3: single write lock, no TOCTOU)
    let (hub_tx, mut hub_rx) = tokio::sync::mpsc::channel::<crate::hub::WorkspaceEvent>(256);
    state
        .hub
        .register(
            session_id.clone(),
            user_id.clone(),
            vec![workspace_id.clone()],
            hub_tx,
        )
        .await;

    let sink_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                event = hub_rx.recv() => {
                    match event {
                        Some(event) => {
                            if let Ok(json) = serde_json::to_string(&event) {
                                if sink.send(Message::Text(json)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        None => break,
                    }
                }
                outgoing = out_rx.recv() => {
                    match outgoing {
                        Some(msg) => {
                            if sink.send(msg).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    }
                }
            }
        }
    });

    let state_b = state.clone();
    let wid_b = workspace_id.clone();
    let uid = user_id.clone();
    let uname = username.clone();
    let sid = session_id.clone();
    let ct = client_type.clone();
    let did = device_id.clone();
    let r = role.clone();

    let stream_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = stream.next().await {
            match msg {
                Message::Text(text) => {
                    handle_ws_text(
                        &text, &state_b, &wid_b, &uid, &uname, &sid, &ct, &did, &r, &out_tx,
                    )
                    .await;
                }
                Message::Ping(data) => {
                    let _ = out_tx.send(Message::Pong(data)).await;
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    let sink_abort = sink_task.abort_handle();
    let stream_abort = stream_task.abort_handle();

    tokio::select! {
        _ = sink_task => { stream_abort.abort(); }
        _ = stream_task => { sink_abort.abort(); }
    }

    // Always unregister session on disconnect
    state.hub.unregister(&session_id).await;
}

async fn handle_ws_text(
    text: &str,
    state: &AppState,
    workspace_id: &str,
    user_id: &str,
    username: &str,
    session_id: &str,
    client_type: &str,
    device_id: &Option<String>,
    role: &str,
    sender: &tokio::sync::mpsc::Sender<Message>,
) {
    let parsed: serde_json::Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return,
    };
    let msg_type = match parsed.get("type").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return,
    };

    match msg_type {
        "document:save" => {
            handle_doc_save(
                parsed,
                state,
                workspace_id,
                user_id,
                username,
                session_id,
                client_type,
                device_id,
                role,
                sender,
            )
            .await;
        }
        "folder:created" => {
            let ref_id = parsed.get("ref").and_then(|v| v.as_str()).map(|s| s.to_string());
            if role == "viewer" {
                let _ = sender
                    .send(Message::Text(
                        serde_json::json!({
                            "type": "ack",
                            "ref": ref_id,
                            "ok": false,
                            "error": "read-only access",
                        })
                        .to_string(),
                    ))
                    .await;
                return;
            }
            let raw_path = parsed.get("relativePath").and_then(|v| v.as_str());
            let relative_path = match raw_path {
                Some(p) => p,
                None => {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": "relativePath is required",
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
            };
            {
                let mut tx = match state.pool.begin().await {
                    Ok(tx) => tx,
                    Err(_) => return,
                };
                if let Err(e) = crate::handlers::folder::upsert_folder_with_ancestors(
                    &mut tx,
                    workspace_id,
                    relative_path,
                )
                .await
                {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                if let Err(e) = tx.commit().await {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                state
                    .hub
                    .publish_to_workspace(
                        workspace_id,
                        WorkspaceEvent::SyncRequired {
                            workspace_id: workspace_id.to_string(),
                            reason: "folder-changed".to_string(),
                        },
                        Some(session_id),
                    )
                    .await;
                let _ = sender
                    .send(Message::Text(
                        serde_json::json!({
                            "type": "ack",
                            "ref": ref_id,
                            "ok": true,
                        })
                        .to_string(),
                    ))
                    .await;
            }
        }
        "folder:deleted" => {
            let ref_id = parsed.get("ref").and_then(|v| v.as_str()).map(|s| s.to_string());
            if role == "viewer" {
                let _ = sender
                    .send(Message::Text(
                        serde_json::json!({
                            "type": "ack",
                            "ref": ref_id,
                            "ok": false,
                            "error": "read-only access",
                        })
                        .to_string(),
                    ))
                    .await;
                return;
            }
            // Bug 1 fix: require and normalize the path before any DB operation
            let relative_path = match parsed.get("relativePath").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": "relativePath is required",
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
            };
            // Normalize/validate before touching the DB (guards against path traversal)
            let relative_path = match crate::util::normalize_folder_path(relative_path) {
                Ok(p) => p,
                Err(e) => {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
            };
            {
                let mut tx = match state.pool.begin().await {
                    Ok(tx) => tx,
                    Err(_) => return,
                };
                if let Err(e) = crate::handlers::folder::record_folder_deletion(
                    &mut tx,
                    workspace_id,
                    &relative_path,
                )
                .await
                {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                if let Err(e) = sqlx::query(
                    r#"DELETE FROM workspace_folders
                       WHERE workspace_id = ? AND (relative_path = ? OR relative_path LIKE ?)"#,
                )
                .bind(workspace_id)
                .bind(&relative_path)
                .bind(format!("{relative_path}/%"))
                .execute(&mut *tx)
                .await
                {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                if let Err(e) = tx.commit().await {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ref": ref_id,
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                state
                    .hub
                    .publish_to_workspace(
                        workspace_id,
                        WorkspaceEvent::SyncRequired {
                            workspace_id: workspace_id.to_string(),
                            reason: "folder-changed".to_string(),
                        },
                        Some(session_id),
                    )
                    .await;
                let _ = sender
                    .send(Message::Text(
                        serde_json::json!({
                            "type": "ack",
                            "ref": ref_id,
                            "ok": true,
                        })
                        .to_string(),
                    ))
                    .await;
            }
        }
        "trash:permanent_delete" | "trash:empty_trash" | "trash:restore" => {
            handle_trash_operation(
                parsed,
                state,
                workspace_id,
                user_id,
                username,
                session_id,
                device_id,
                role,
                sender,
            )
            .await;
        }
        "ping" => {
            let _ = sender
                .send(Message::Text(r#"{"type":"pong"}"#.to_string()))
                .await;
        }
        _ => {}
    }
}

async fn handle_doc_save(
    parsed: serde_json::Value,
    state: &AppState,
    workspace_id: &str,
    user_id: &str,
    username: &str,
    session_id: &str,
    client_type: &str,
    device_id: &Option<String>,
    role: &str,
    sender: &tokio::sync::mpsc::Sender<Message>,
) {
    let ref_id = parsed
        .get("ref")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if role == "viewer" {
        let ack = serde_json::json!({
            "type": "ack",
            "ref": ref_id,
            "ok": false,
            "error": "read-only access",
        });
        let _ = sender.send(Message::Text(ack.to_string())).await;
        return;
    }

    let payload = match serde_json::from_value::<CloudSaveDocumentRequest>(parsed) {
        Ok(p) => p,
        Err(e) => {
            let err = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": false,
                "error": e.to_string(),
            });
            let _ = sender.send(Message::Text(err.to_string())).await;
            return;
        }
    };

    let auth_user = AuthUser {
        id: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        scope: "full".to_string(),
    };

    match save_document_version(&state.pool, workspace_id, &auth_user, payload, client_type).await {
        Ok(SaveDocumentOutcome::Saved(doc, _, _)) => {
            state
                .hub
                .publish_to_workspace(
                    workspace_id,
                    WorkspaceEvent::DocumentChanged {
                        workspace_id: workspace_id.to_string(),
                        source_session_id: Some(session_id.to_string()),
                        relative_path: doc.relative_path.clone(),
                        content_hash: doc.content_hash.clone(),
                        updated_clock: doc.updated_clock,
                        edited_by: username.to_string(),
                        source: client_type.to_string(),
                        device_id: device_id.clone(),
                    },
                    Some(session_id),
                )
                .await;

            let ack = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": true,
                "relativePath": doc.relative_path,
                "contentHash": doc.content_hash,
                "updatedClock": doc.updated_clock,
                "document": {
                    "relativePath": doc.relative_path,
                    "contentHash": doc.content_hash,
                    "updatedClock": doc.updated_clock,
                },
            });
            let _ = sender.send(Message::Text(ack.to_string())).await;
        }
        Ok(SaveDocumentOutcome::Conflict(c)) => {
            let err = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": false,
                "error": "conflict",
                "conflictId": c.conflict_id,
                "relativePath": c.relative_path,
            });
            let _ = sender.send(Message::Text(err.to_string())).await;
        }
        Err(e) => {
            let err = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": false,
                "error": e.to_string(),
            });
            let _ = sender.send(Message::Text(err.to_string())).await;
        }
    }
}

async fn handle_trash_operation(
    parsed: serde_json::Value,
    state: &AppState,
    workspace_id: &str,
    user_id: &str,
    username: &str,
    session_id: &str,
    device_id: &Option<String>,
    role: &str,
    sender: &tokio::sync::mpsc::Sender<Message>,
) {
    let ref_id = parsed
        .get("ref")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if role == "viewer" {
        let ack = serde_json::json!({
            "type": "ack",
            "ref": ref_id,
            "ok": false,
            "error": "read-only access",
        });
        let _ = sender.send(Message::Text(ack.to_string())).await;
        return;
    }

    // Strip the "trash:" prefix from the type field so it matches TrashOperation variants
    let mut adjusted = parsed.clone();
    if let Some(serde_json::Value::String(t)) = adjusted.get("type") {
        let stripped = t.strip_prefix("trash:").unwrap_or(t);
        adjusted["type"] = serde_json::Value::String(stripped.to_string());
    }

    let operation = match serde_json::from_value::<TrashOperation>(adjusted) {
        Ok(op) => op,
        Err(e) => {
            let err = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": false,
                "error": e.to_string(),
            });
            let _ = sender.send(Message::Text(err.to_string())).await;
            return;
        }
    };

    let auth_user = AuthUser {
        id: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        scope: "full".to_string(),
    };

    match crate::handlers::sync::process_trash_operation(
        &state.pool,
        &state.hub,
        workspace_id,
        &auth_user,
        device_id.as_deref(),
        operation,
        Some(session_id),
    )
    .await
    {
        Ok(_) => {
            let ack = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": true,
            });
            let _ = sender.send(Message::Text(ack.to_string())).await;
        }
        Err(e) => {
            let err = serde_json::json!({
                "type": "ack",
                "ref": ref_id,
                "ok": false,
                "error": e.to_string(),
            });
            let _ = sender.send(Message::Text(err.to_string())).await;
        }
    }
}

async fn fetch_workspace_clock(pool: &sqlx::Pool<sqlx::MySql>, workspace_id: &str) -> i64 {
    sqlx::query("SELECT sync_clock AS workspace_clock FROM workspaces WHERE id = ?")
        .bind(workspace_id)
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get("workspace_clock").ok())
        .unwrap_or(0)
}

// ── Per-user singleton WS handler (/api/v1/live) ─────────────────────────────

/// Fetch all workspace IDs the user is an active member of (or owns).
async fn fetch_user_workspace_ids(pool: &sqlx::Pool<sqlx::MySql>, user_id: &str) -> Vec<String> {
    sqlx::query_scalar(
        r#"SELECT w.id FROM workspaces w
           LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
           WHERE m.user_id IS NOT NULL OR w.user_id = ? OR w.owner_user_id = ?"#,
    )
    .bind(user_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
}

async fn handle_user_ws(
    socket: axum::extract::ws::WebSocket,
    state: AppState,
    user_id: String,
    username: String,
    session_id: String,
    client_type: String,
    device_id: Option<String>,
) {
    use futures::{SinkExt, StreamExt};
    let (mut sink, mut stream) = socket.split();

    // Query all workspace IDs the user belongs to
    let workspace_ids = fetch_user_workspace_ids(&state.pool, &user_id).await;

    // Create mpsc channel and register session in hub
    let (hub_tx, mut hub_rx) =
        tokio::sync::mpsc::channel::<crate::hub::WorkspaceEvent>(256);
    state
        .hub
        .register(
            session_id.clone(),
            user_id.clone(),
            workspace_ids.clone(),
            hub_tx,
        )
        .await;

    // Send `connected` with full workspace list
    let connected = serde_json::json!({
        "type": "connected",
        "sessionId": session_id,
        "workspaces": workspace_ids,
    });
    if sink.send(Message::Text(connected.to_string())).await.is_err() {
        state.hub.unregister(&session_id).await;
        return;
    }

    let (out_tx, mut out_rx) = tokio::sync::mpsc::channel::<Message>(32);

    let sink_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                event = hub_rx.recv() => {
                    match event {
                        Some(event) => {
                            if let Ok(json) = serde_json::to_string(&event) {
                                if sink.send(Message::Text(json)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        None => break,
                    }
                }
                outgoing = out_rx.recv() => {
                    match outgoing {
                        Some(msg) => {
                            if sink.send(msg).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    }
                }
            }
        }
    });

    let state_b = state.clone();
    let uid = user_id.clone();
    let uname = username.clone();
    let sid = session_id.clone();
    let ct = client_type.clone();
    let did = device_id.clone();

    let stream_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = stream.next().await {
            match msg {
                Message::Text(text) => {
                    handle_user_ws_text(
                        &text, &state_b, &uid, &uname, &sid, &ct, &did, &out_tx,
                    )
                    .await;
                }
                Message::Ping(data) => {
                    let _ = out_tx.send(Message::Pong(data)).await;
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    let sink_abort = sink_task.abort_handle();
    let stream_abort = stream_task.abort_handle();

    tokio::select! {
        _ = sink_task => { stream_abort.abort(); }
        _ = stream_task => { sink_abort.abort(); }
    }

    // Always unregister on disconnect
    state.hub.unregister(&session_id).await;
}

/// Handle a WS text message on the per-user connection.
/// Messages must carry `workspaceId`; membership is re-checked on each call
/// (fixes frozen-permission issue from the per-workspace handler).
async fn handle_user_ws_text(
    text: &str,
    state: &AppState,
    user_id: &str,
    username: &str,
    session_id: &str,
    client_type: &str,
    device_id: &Option<String>,
    sender: &tokio::sync::mpsc::Sender<Message>,
) {
    let parsed: serde_json::Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return,
    };

    let msg_type = match parsed.get("type").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return,
    };

    if msg_type == "ping" {
        let _ = sender
            .send(Message::Text(r#"{"type":"pong"}"#.to_string()))
            .await;
        return;
    }

    // All non-ping messages require workspaceId
    let workspace_id = match parsed.get("workspaceId").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => return,
    };

    // Re-check membership each message (dynamic permissions)
    let role = match require_workspace_role(
        &state.pool,
        &workspace_id,
        user_id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await
    {
        Ok(r) => r,
        Err(_) => {
            let ref_id = parsed.get("ref").and_then(|v| v.as_str()).map(|s| s.to_string());
            let _ = sender
                .send(Message::Text(
                    serde_json::json!({
                        "type": "ack",
                        "ref": ref_id,
                        "ok": false,
                        "error": "not a workspace member",
                    })
                    .to_string(),
                ))
                .await;
            return;
        }
    };

    handle_ws_text(
        text, state, &workspace_id, user_id, username, session_id, client_type, device_id,
        &role, sender,
    )
    .await;
}
