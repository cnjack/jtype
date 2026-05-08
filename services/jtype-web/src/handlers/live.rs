use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::{Path, Query, State},
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use serde::Deserialize;
use sqlx::Row;
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

async fn validate_ws_token(
    pool: &sqlx::Pool<sqlx::MySql>,
    token: &str,
) -> Result<AuthUser, AppError> {
    let token_hash = sha256_hex(token);
    let row = sqlx::query(
        r#"SELECT u.id, u.username, u.role, u.disabled_at
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ?"#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let disabled_at: Option<String> = row.try_get("disabled_at").unwrap_or(None);
    if disabled_at.is_some() {
        return Err(AppError::Forbidden);
    }

    Ok(AuthUser {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        role: row.try_get("role")?,
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

    let hub = state.hub.clone();
    let wid_a = workspace_id.clone();

    let sink_task = tokio::spawn(async move {
        let mut hub_rx = hub.subscribe(&wid_a).await;
        loop {
            tokio::select! {
                event = hub_rx.recv() => {
                    match event {
                        Ok(event) => {
                            if let Ok(json) = serde_json::to_string(&event) {
                                if sink.send(Message::Text(json)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                            let lagged = serde_json::json!({
                                "type": "sync:required",
                                "reason": "lagged",
                                "missedEvents": n,
                            });
                            if sink.send(Message::Text(lagged.to_string())).await.is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
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
            if role == "viewer" {
                let _ = sender
                    .send(Message::Text(
                        r#"{"type":"ack","ok":false,"error":"read-only access"}"#.to_string(),
                    ))
                    .await;
                return;
            }
            if let Some(relative_path) = parsed.get("relativePath").and_then(|v| v.as_str()) {
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
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                if let Err(_) = tx.commit().await {
                    return;
                }
                state
                    .hub
                    .publish(
                        workspace_id,
                        WorkspaceEvent::SyncRequired {
                            reason: "folder-changed".to_string(),
                        },
                    )
                    .await;
            }
        }
        "folder:deleted" => {
            if role == "viewer" {
                let _ = sender
                    .send(Message::Text(
                        r#"{"type":"ack","ok":false,"error":"read-only access"}"#.to_string(),
                    ))
                    .await;
                return;
            }
            if let Some(relative_path) = parsed.get("relativePath").and_then(|v| v.as_str()) {
                let mut tx = match state.pool.begin().await {
                    Ok(tx) => tx,
                    Err(_) => return,
                };
                if let Err(e) = crate::handlers::folder::record_folder_deletion(
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
                .bind(relative_path)
                .bind(format!("{relative_path}/%"))
                .execute(&mut *tx)
                .await
                {
                    let _ = sender
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "ack",
                                "ok": false,
                                "error": e.to_string(),
                            })
                            .to_string(),
                        ))
                        .await;
                    return;
                }
                if let Err(_) = tx.commit().await {
                    return;
                }
                state
                    .hub
                    .publish(
                        workspace_id,
                        WorkspaceEvent::SyncRequired {
                            reason: "folder-changed".to_string(),
                        },
                    )
                    .await;
            }
        }
        "folder:changed" => {
            // Legacy fallback: just broadcast sync required without persisting.
            state
                .hub
                .publish(
                    workspace_id,
                    WorkspaceEvent::SyncRequired {
                        reason: "folder-changed".to_string(),
                    },
                )
                .await;
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
    };

    match save_document_version(&state.pool, workspace_id, &auth_user, payload, client_type).await {
        Ok(SaveDocumentOutcome::Saved(doc, _)) => {
            state
                .hub
                .publish(
                    workspace_id,
                    WorkspaceEvent::DocumentChanged {
                        source_session_id: session_id.to_string(),
                        relative_path: doc.relative_path.clone(),
                        content_hash: doc.content_hash.clone(),
                        updated_clock: doc.updated_clock,
                        edited_by: username.to_string(),
                        source: client_type.to_string(),
                        device_id: device_id.clone(),
                    },
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
    _session_id: &str,
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
    };

    match crate::handlers::sync::process_trash_operation(
        &state.pool,
        &state.hub,
        workspace_id,
        &auth_user,
        device_id.as_deref(),
        operation,
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
    sqlx::query(
        r#"SELECT GREATEST(
                COALESCE((SELECT MAX(updated_clock) FROM documents WHERE workspace_id = ?), 0),
                COALESCE((SELECT MAX(deleted_clock) FROM document_trash WHERE workspace_id = ?), 0),
                COALESCE((SELECT MAX(updated_clock) FROM workspace_folders WHERE workspace_id = ?), 0),
                COALESCE((SELECT MAX(deleted_clock) FROM workspace_folder_deletions WHERE workspace_id = ?), 0)
            ) AS workspace_clock"#,
    )
    .bind(workspace_id)
    .bind(workspace_id)
    .bind(workspace_id)
    .bind(workspace_id)
    .fetch_one(pool)
    .await
    .ok()
    .and_then(|r| r.try_get("workspace_clock").ok())
    .unwrap_or(0)
}
