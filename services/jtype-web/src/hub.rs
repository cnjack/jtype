use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum WorkspaceEvent {
    #[serde(rename = "document:changed", rename_all = "camelCase")]
    DocumentChanged {
        source_session_id: String,
        relative_path: String,
        content_hash: String,
        updated_clock: i64,
        edited_by: String,
        source: String,
        device_id: Option<String>,
    },
    #[serde(rename = "document:deleted", rename_all = "camelCase")]
    DocumentDeleted {
        source_session_id: String,
        relative_path: String,
        deleted_clock: i64,
    },
    #[serde(rename = "document:trashed", rename_all = "camelCase")]
    DocumentTrashed {
        source_session_id: String,
        relative_path: String,
        action: String,
    },
}

const CHANNEL_CAPACITY: usize = 256;

#[derive(Clone)]
pub struct NotificationHub {
    channels: Arc<RwLock<HashMap<String, broadcast::Sender<WorkspaceEvent>>>>,
}

impl NotificationHub {
    pub fn new() -> Self {
        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn publish(&self, workspace_id: &str, event: WorkspaceEvent) {
        let channels = self.channels.read().await;
        if let Some(tx) = channels.get(workspace_id) {
            let _ = tx.send(event);
        }
    }

    pub async fn subscribe(&self, workspace_id: &str) -> broadcast::Receiver<WorkspaceEvent> {
        {
            let channels = self.channels.read().await;
            if let Some(tx) = channels.get(workspace_id) {
                return tx.subscribe();
            }
        }
        let mut channels = self.channels.write().await;
        let tx = channels
            .entry(workspace_id.to_string())
            .or_insert_with(|| broadcast::channel(CHANNEL_CAPACITY).0);
        tx.subscribe()
    }

    pub async fn cleanup(&self) {
        let mut channels = self.channels.write().await;
        channels.retain(|_, tx| tx.receiver_count() > 0);
    }
}
