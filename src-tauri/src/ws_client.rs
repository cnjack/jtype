use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{self, Message},
};

#[derive(Deserialize)]
struct WsMessage {
    #[serde(rename = "type")]
    msg_type: String,
    /// Camel-case field present on document:changed events.
    #[serde(rename = "relativePath")]
    relative_path: Option<String>,
    /// The device ID that originated this change (if any).
    #[serde(rename = "deviceId")]
    device_id_field: Option<String>,
    /// The source platform ("desktop", "web", etc.).
    source: Option<String>,
    /// WS session ID assigned by the server on "connected" message.
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
}

/// Payload for the `cloud:ws-activity` frontend event.
/// Lets the app UI display live WS status without having to parse raw JSON.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WsActivity {
    msg_type: String,
    relative_path: Option<String>,
    at_ms: u64,
}

pub async fn start_ws_listener(
    app: AppHandle,
    server_url: String,
    token: String,
    workspace_id: String,
    device_id: String,
    client_type: String,
    outbox: tokio::sync::broadcast::Sender<String>,
) {
    let client_type = normalize_client_type(&client_type);
    let ws_url = build_ws_url(&server_url, &token, &workspace_id, &device_id, client_type);
    let mut backoff_secs = 1u64;
    const MAX_BACKOFF: u64 = 60;

    eprintln!("[ws_client] connecting to workspace {workspace_id}");

    loop {
        match connect_async(&ws_url).await {
            Ok((ws_stream, _)) => {
                let (mut write, mut read) = ws_stream.split();
                eprintln!("[ws_client] connected (workspace={workspace_id})");
                let _ = app.emit("cloud:ws-connected", ());
                backoff_secs = 1;

                // New receiver per connection attempt so old messages don't replay.
                let mut outbox_rx = outbox.subscribe();
                // Single interval lives here — no separate spawn, so aborting the
                // outer start_ws_listener task also cancels writes and reads together.
                let mut ping_interval = tokio::time::interval(std::time::Duration::from_secs(30));

                loop {
                    tokio::select! {
                        _ = ping_interval.tick() => {
                            if write
                                .send(Message::Text("{\"type\":\"ping\"}".into()))
                                .await
                                .is_err()
                            {
                                break;
                            }
                        }
                        Ok(msg) = outbox_rx.recv() => {
                            eprintln!("[ws_client] → SEND {}", &msg[..msg.len().min(200)]);
                            if write
                                .send(Message::Text(msg.into()))
                                .await
                                .is_err()
                            {
                                eprintln!("[ws_client] → SEND FAILED");
                                break;
                            }
                        }
                        item = read.next() => {
                            match item {
                                Some(Ok(Message::Text(text))) => {
                                    // Suppress pong noise in both logs and activity events.
                                    if text.contains("\"pong\"") {
                                        continue;
                                    }
                                    eprintln!("[ws_client] ← RECV text: {text}");
                                    if let Ok(parsed) = serde_json::from_str::<WsMessage>(&text) {
                                        // Emit activity for EVERY named message so the frontend can
                                        // observe WS liveness and debug missing notifications.
                                        let activity = WsActivity {
                                            msg_type: parsed.msg_type.clone(),
                                            relative_path: parsed.relative_path.clone(),
                                            at_ms: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap_or_default()
                                                .as_millis()
                                                as u64,
                                        };
                                        let _ = app.emit("cloud:ws-activity", &activity);

                                        match parsed.msg_type.as_str() {
                                            "document:changed" | "document:deleted"
                                            | "document:trashed" => {
                                                // Skip changes originated by this device to avoid
                                                // wasteful self-pulls and potential race conditions.
                                                let is_self = parsed.device_id_field.as_deref()
                                                    == Some(&device_id)
                                                    && parsed.source.as_deref() == Some(client_type);
                                                if is_self {
                                                    eprintln!(
                                                        "[ws_client] skipping self-change: {} {:?}",
                                                        parsed.msg_type, parsed.relative_path
                                                    );
                                                    continue;
                                                }
                                                eprintln!(
                                                    "[ws_client] remote change: {} {:?} (eventDeviceId={:?}, localDeviceId={}, eventSource={:?})",
                                                    parsed.msg_type, parsed.relative_path,
                                                    parsed.device_id_field, device_id, parsed.source
                                                );
                                                let _ = app.emit("cloud:remote-change", &text);
                                            }
                                            "workspace:deleted" => {
                                                eprintln!("[ws_client] workspace:deleted received — stopping listener");
                                                let _ = app.emit("cloud:workspace-gone", &workspace_id);
                                                return;
                                            }
                                            "member:removed" => {
                                                eprintln!("[ws_client] member:removed received — access revoked");
                                                let _ = app.emit("cloud:member-kicked", &workspace_id);
                                                return;
                                            }
                                            "sync:required" => {
                                                eprintln!("[ws_client] sync:required");
                                                let _ = app.emit("cloud:sync-required", ());
                                            }
                                            "connected" => {
                                                eprintln!("[ws_client] server confirmed connected");
                                                if let Some(sid) = &parsed.session_id {
                                                    let _ = app.emit("cloud:ws-session", sid.as_str());
                                                }
                                                let _ = app.emit("cloud:ws-connected", &text);
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                                Some(Ok(Message::Close(f))) => {
                                    eprintln!("[ws_client] ← RECV close frame: {f:?}");
                                    break;
                                }
                                Some(Err(e)) => {
                                    eprintln!("[ws_client] read error: {e}");
                                    break;
                                }
                                None => break,
                                Some(Ok(other)) => {
                                    eprintln!("[ws_client] ← RECV non-text frame: {other:?}");
                                }
                            }
                        }
                    }
                }

                eprintln!("[ws_client] disconnected (workspace={workspace_id}), retrying in {backoff_secs}s");
                let _ = app.emit("cloud:ws-disconnected", ());
            }
            Err(e) => {
                // If the server says the workspace is gone (404 / 410),
                // notify the frontend and stop reconnecting.
                if is_workspace_gone(&e) {
                    eprintln!("[ws_client] workspace {workspace_id} no longer exists, stopping");
                    let _ = app.emit("cloud:workspace-gone", &workspace_id);
                    return;
                }
                eprintln!("[ws_client] connect error: {e}, retrying in {backoff_secs}s");
                let _ = app.emit("cloud:ws-disconnected", ());
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(backoff_secs)).await;
        backoff_secs = (backoff_secs * 2).min(MAX_BACKOFF);
    }
}

fn normalize_client_type(client_type: &str) -> &'static str {
    match client_type {
        "mobile" => "mobile",
        _ => "desktop",
    }
}

fn build_ws_url(
    server_url: &str,
    token: &str,
    workspace_id: &str,
    device_id: &str,
    client_type: &str,
) -> String {
    let ws_base = if server_url.starts_with("https://") {
        server_url.replacen("https://", "wss://", 1)
    } else if server_url.starts_with("http://") {
        server_url.replacen("http://", "ws://", 1)
    } else {
        format!("wss://{}", server_url)
    };
    format!(
        "{}/api/v1/workspaces/{}/live?token={}&clientType={}&deviceId={}",
        ws_base, workspace_id, token, client_type, device_id
    )
}

/// Returns true when the WebSocket handshake was rejected with 404 or 410,
/// meaning the workspace has been deleted or the user was removed.
fn is_workspace_gone(err: &tungstenite::Error) -> bool {
    if let tungstenite::Error::Http(response) = err {
        let code = response.status().as_u16();
        return code == 404 || code == 410;
    }
    false
}

#[cfg(test)]
mod tests {
    use super::{build_ws_url, normalize_client_type};

    #[test]
    fn mobile_listener_identifies_itself_and_filters_as_mobile() {
        assert_eq!(normalize_client_type("mobile"), "mobile");
        assert_eq!(normalize_client_type("unexpected"), "desktop");
        assert_eq!(
            build_ws_url(
                "https://cloud.example",
                "token",
                "workspace",
                "device",
                "mobile",
            ),
            "wss://cloud.example/api/v1/workspaces/workspace/live?token=token&clientType=mobile&deviceId=device",
        );
    }
}
