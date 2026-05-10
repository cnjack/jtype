use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum WorkspaceEvent {
    #[serde(rename = "document:changed", rename_all = "camelCase")]
    DocumentChanged {
        workspace_id: String,
        source_session_id: Option<String>,
        relative_path: String,
        content_hash: String,
        updated_clock: i64,
        edited_by: String,
        source: String,
        device_id: Option<String>,
    },
    #[serde(rename = "document:deleted", rename_all = "camelCase")]
    DocumentDeleted {
        workspace_id: String,
        source_session_id: Option<String>,
        relative_path: String,
        deleted_clock: i64,
    },
    #[serde(rename = "document:trashed", rename_all = "camelCase")]
    DocumentTrashed {
        workspace_id: String,
        source_session_id: Option<String>,
        relative_path: String,
        action: String,
        event_clock: i64,
    },
    #[serde(rename = "sync:required", rename_all = "camelCase")]
    SyncRequired {
        workspace_id: String,
        reason: String,
    },
    #[serde(rename = "workspace:updated", rename_all = "camelCase")]
    WorkspaceUpdated {
        workspace_id: String,
        name: String,
        slug: String,
        publish_title: String,
    },
    #[serde(rename = "workspace:deleted", rename_all = "camelCase")]
    WorkspaceDeleted { workspace_id: String },
    #[serde(rename = "workspace:invited", rename_all = "camelCase")]
    WorkspaceInvited {
        workspace_id: String,
        workspace_name: String,
        role: String,
        invited_by_username: String,
    },
    #[serde(rename = "member:joined", rename_all = "camelCase")]
    MemberJoined {
        workspace_id: String,
        user_id: String,
        username: String,
        role: String,
    },
    #[serde(rename = "member:removed", rename_all = "camelCase")]
    MemberRemoved {
        workspace_id: String,
        user_id: String,
        username: String,
        removed_by_user_id: String,
    },
    #[serde(rename = "member:left", rename_all = "camelCase")]
    MemberLeft {
        workspace_id: String,
        user_id: String,
        username: String,
    },
    #[serde(rename = "member:role-changed", rename_all = "camelCase")]
    MemberRoleChanged {
        workspace_id: String,
        user_id: String,
        username: String,
        previous_role: String,
        new_role: String,
    },
    #[serde(rename = "document:status-changed", rename_all = "camelCase")]
    DocumentStatusChanged {
        workspace_id: String,
        source_session_id: Option<String>,
        relative_path: String,
        document_id: String,
        status: String,
        previous_status: String,
    },
}

#[allow(dead_code)]
const CHANNEL_CAPACITY: usize = 256;

struct SessionEntry {
    user_id: String,
    sender: mpsc::Sender<WorkspaceEvent>,
    workspaces: HashSet<String>,
}

struct HubInner {
    sessions: HashMap<String, SessionEntry>,
    user_sessions: HashMap<String, HashSet<String>>,
    workspace_sessions: HashMap<String, HashSet<String>>,
}

/// Per-session / per-user / per-workspace connection hub.
///
/// All index updates happen inside a single `write()` lock to eliminate the
/// TOCTOU race that existed in the old broadcast-channel design (B3 fix).
#[derive(Clone)]
pub struct ConnectionHub {
    inner: Arc<RwLock<HubInner>>,
}

impl ConnectionHub {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HubInner {
                sessions: HashMap::new(),
                user_sessions: HashMap::new(),
                workspace_sessions: HashMap::new(),
            })),
        }
    }

    /// Register a new WS session with its workspace subscriptions.
    pub async fn register(
        &self,
        session_id: String,
        user_id: String,
        workspace_ids: Vec<String>,
        sender: mpsc::Sender<WorkspaceEvent>,
    ) {
        let mut inner = self.inner.write().await;
        let workspaces: HashSet<String> = workspace_ids.iter().cloned().collect();
        inner
            .user_sessions
            .entry(user_id.clone())
            .or_default()
            .insert(session_id.clone());
        for ws_id in &workspace_ids {
            inner
                .workspace_sessions
                .entry(ws_id.clone())
                .or_default()
                .insert(session_id.clone());
        }
        inner.sessions.insert(
            session_id,
            SessionEntry {
                user_id,
                sender,
                workspaces,
            },
        );
    }

    /// Unregister a session and clean up all indexes.
    pub async fn unregister(&self, session_id: &str) {
        let mut inner = self.inner.write().await;
        if let Some(entry) = inner.sessions.remove(session_id) {
            if let Some(sids) = inner.user_sessions.get_mut(&entry.user_id) {
                sids.remove(session_id);
                if sids.is_empty() {
                    inner.user_sessions.remove(&entry.user_id);
                }
            }
            for ws_id in &entry.workspaces {
                if let Some(sids) = inner.workspace_sessions.get_mut(ws_id) {
                    sids.remove(session_id);
                    if sids.is_empty() {
                        inner.workspace_sessions.remove(ws_id);
                    }
                }
            }
        }
    }

    /// Add a workspace subscription to all active sessions of a user (e.g. invite accepted).
    pub async fn add_workspace_to_user(&self, user_id: &str, workspace_id: &str) {
        let mut inner = self.inner.write().await;
        let sids: Vec<String> = inner
            .user_sessions
            .get(user_id)
            .map(|s| s.iter().cloned().collect())
            .unwrap_or_default();
        for sid in sids {
            if let Some(entry) = inner.sessions.get_mut(&sid) {
                entry.workspaces.insert(workspace_id.to_string());
                inner
                    .workspace_sessions
                    .entry(workspace_id.to_string())
                    .or_default()
                    .insert(sid.clone());
            }
        }
    }

    /// Remove all sessions of a user from a workspace (member removed or left).
    pub async fn kick_user_from_workspace(&self, user_id: &str, workspace_id: &str) {
        let mut inner = self.inner.write().await;
        let user_sids: Vec<String> = inner
            .user_sessions
            .get(user_id)
            .map(|s| s.iter().cloned().collect())
            .unwrap_or_default();
        for sid in &user_sids {
            if let Some(entry) = inner.sessions.get_mut(sid) {
                entry.workspaces.remove(workspace_id);
            }
        }
        if let Some(ws_sids) = inner.workspace_sessions.get_mut(workspace_id) {
            for sid in &user_sids {
                ws_sids.remove(sid);
            }
            if ws_sids.is_empty() {
                inner.workspace_sessions.remove(workspace_id);
            }
        }
    }

    /// Remove all sessions from a workspace (workspace deleted).
    pub async fn kick_all_from_workspace(&self, workspace_id: &str) {
        let mut inner = self.inner.write().await;
        if let Some(sids) = inner.workspace_sessions.remove(workspace_id) {
            for sid in &sids {
                if let Some(entry) = inner.sessions.get_mut(sid) {
                    entry.workspaces.remove(workspace_id);
                }
            }
        }
    }

    /// Publish an event to all sessions subscribed to a workspace.
    /// Optionally exclude one session (the sender of the originating WS message).
    pub async fn publish_to_workspace(
        &self,
        workspace_id: &str,
        event: WorkspaceEvent,
        exclude_session: Option<&str>,
    ) {
        let inner = self.inner.read().await;
        if let Some(sids) = inner.workspace_sessions.get(workspace_id) {
            for sid in sids {
                if exclude_session.map_or(false, |e| e == sid) {
                    continue;
                }
                if let Some(entry) = inner.sessions.get(sid) {
                    let _ = entry.sender.try_send(event.clone());
                }
            }
        }
    }

    /// Publish an event directly to all sessions of a specific user.
    pub async fn publish_to_user(&self, user_id: &str, event: WorkspaceEvent) {
        let inner = self.inner.read().await;
        if let Some(sids) = inner.user_sessions.get(user_id) {
            for sid in sids {
                if let Some(entry) = inner.sessions.get(sid) {
                    let _ = entry.sender.try_send(event.clone());
                }
            }
        }
    }

    /// Backward-compatible shorthand: publish to workspace with no exclusion.
    pub async fn publish(&self, workspace_id: &str, event: WorkspaceEvent) {
        self.publish_to_workspace(workspace_id, event, None).await;
    }

    /// Periodic cleanup: remove sessions whose sender channel is closed.
    pub async fn cleanup(&self) {
        let closed: Vec<String> = {
            let inner = self.inner.read().await;
            inner
                .sessions
                .iter()
                .filter(|(_, e)| e.sender.is_closed())
                .map(|(sid, _)| sid.clone())
                .collect()
        };
        for sid in closed {
            self.unregister(&sid).await;
        }
    }

    /// For integration tests: subscribe a fake session to a workspace.
    /// Returns `(session_id, receiver)`.
    #[cfg(test)]
    pub async fn subscribe_for_test(
        &self,
        workspace_id: &str,
    ) -> (String, mpsc::Receiver<WorkspaceEvent>) {
        let session_id = format!("test-{}", uuid::Uuid::new_v4());
        let (tx, rx) = mpsc::channel(CHANNEL_CAPACITY);
        self.register(
            session_id.clone(),
            format!("test-user-{}", uuid::Uuid::new_v4()),
            vec![workspace_id.to_string()],
            tx,
        )
        .await;
        (session_id, rx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[tokio::test]
    async fn publish_without_subscriber_does_not_panic() {
        let hub = ConnectionHub::new();
        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::SyncRequired {
                workspace_id: "ws-1".into(),
                reason: "test".to_string(),
            },
            None,
        )
        .await;
    }

    #[tokio::test]
    async fn register_and_receive_event() {
        let hub = ConnectionHub::new();
        let (tx, mut rx) = mpsc::channel(32);
        hub.register("s1".into(), "u1".into(), vec!["ws-1".into()], tx)
            .await;

        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::SyncRequired {
                workspace_id: "ws-1".into(),
                reason: "test".to_string(),
            },
            None,
        )
        .await;

        let event = rx.recv().await.unwrap();
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "sync:required");
        assert_eq!(json["reason"], "test");
        assert_eq!(json["workspaceId"], "ws-1");
    }

    #[tokio::test]
    async fn events_scoped_to_workspace() {
        let hub = ConnectionHub::new();
        let (tx1, mut rx1) = mpsc::channel(32);
        let (tx2, mut rx2) = mpsc::channel(32);
        hub.register("s1".into(), "u1".into(), vec!["ws-1".into()], tx1)
            .await;
        hub.register("s2".into(), "u2".into(), vec!["ws-2".into()], tx2)
            .await;

        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::SyncRequired {
                workspace_id: "ws-1".into(),
                reason: "only-ws1".to_string(),
            },
            None,
        )
        .await;

        let event = rx1.recv().await.unwrap();
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["reason"], "only-ws1");
        assert!(rx2.try_recv().is_err());
    }

    #[tokio::test]
    async fn unregister_removes_session() {
        let hub = ConnectionHub::new();
        let (tx, mut rx) = mpsc::channel(32);
        hub.register("s1".into(), "u1".into(), vec!["ws-1".into()], tx)
            .await;
        hub.unregister("s1").await;

        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::SyncRequired {
                workspace_id: "ws-1".into(),
                reason: "should not arrive".into(),
            },
            None,
        )
        .await;

        assert!(rx.try_recv().is_err());
    }

    #[tokio::test]
    async fn sender_exclusion_works() {
        let hub = ConnectionHub::new();
        let (tx1, mut rx1) = mpsc::channel(32);
        let (tx2, mut rx2) = mpsc::channel(32);
        hub.register("s1".into(), "u1".into(), vec!["ws-1".into()], tx1)
            .await;
        hub.register("s2".into(), "u2".into(), vec!["ws-1".into()], tx2)
            .await;

        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::SyncRequired {
                workspace_id: "ws-1".into(),
                reason: "excluded".into(),
            },
            Some("s1"),
        )
        .await;

        assert!(rx1.try_recv().is_err()); // s1 excluded
        assert!(rx2.try_recv().is_ok()); // s2 receives
    }

    #[tokio::test]
    async fn kick_user_from_workspace_works() {
        let hub = ConnectionHub::new();
        let (tx1, mut rx1) = mpsc::channel(32);
        hub.register("s1".into(), "u1".into(), vec!["ws-1".into()], tx1)
            .await;
        hub.kick_user_from_workspace("u1", "ws-1").await;

        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::SyncRequired {
                workspace_id: "ws-1".into(),
                reason: "after kick".into(),
            },
            None,
        )
        .await;

        assert!(rx1.try_recv().is_err());
    }

    #[tokio::test]
    async fn multiple_subscribers_receive_same_event() {
        let hub = ConnectionHub::new();
        let (tx1, mut rx1) = mpsc::channel(32);
        let (tx2, mut rx2) = mpsc::channel(32);
        hub.register("s1".into(), "u1".into(), vec!["ws-1".into()], tx1)
            .await;
        hub.register("s2".into(), "u2".into(), vec!["ws-1".into()], tx2)
            .await;

        hub.publish_to_workspace(
            "ws-1",
            WorkspaceEvent::WorkspaceDeleted {
                workspace_id: "ws-1".into(),
            },
            None,
        )
        .await;

        assert!(rx1.try_recv().is_ok());
        assert!(rx2.try_recv().is_ok());
    }

    #[tokio::test]
    async fn new_event_variants_serialize_correctly() {
        let events = vec![
            (
                WorkspaceEvent::WorkspaceUpdated {
                    workspace_id: "ws1".into(),
                    name: "My WS".into(),
                    slug: "my-ws".into(),
                    publish_title: "My WS Title".into(),
                },
                "workspace:updated",
            ),
            (
                WorkspaceEvent::WorkspaceDeleted {
                    workspace_id: "ws1".into(),
                },
                "workspace:deleted",
            ),
            (
                WorkspaceEvent::MemberJoined {
                    workspace_id: "ws1".into(),
                    user_id: "u1".into(),
                    username: "alice".into(),
                    role: "editor".into(),
                },
                "member:joined",
            ),
            (
                WorkspaceEvent::MemberRemoved {
                    workspace_id: "ws1".into(),
                    user_id: "u2".into(),
                    username: "bob".into(),
                    removed_by_user_id: "u1".into(),
                },
                "member:removed",
            ),
            (
                WorkspaceEvent::MemberLeft {
                    workspace_id: "ws1".into(),
                    user_id: "u2".into(),
                    username: "bob".into(),
                },
                "member:left",
            ),
            (
                WorkspaceEvent::MemberRoleChanged {
                    workspace_id: "ws1".into(),
                    user_id: "u2".into(),
                    username: "bob".into(),
                    previous_role: "editor".into(),
                    new_role: "admin".into(),
                },
                "member:role-changed",
            ),
            (
                WorkspaceEvent::DocumentStatusChanged {
                    workspace_id: "ws1".into(),
                    source_session_id: Some("sess1".into()),
                    relative_path: "notes/hello.md".into(),
                    document_id: "d1".into(),
                    status: "published".into(),
                    previous_status: "draft".into(),
                },
                "document:status-changed",
            ),
        ];

        for (event, expected_type) in events {
            let json = serde_json::to_value(&event).unwrap();
            assert_eq!(
                json["type"].as_str().unwrap(),
                expected_type,
                "event type mismatch for {expected_type}"
            );
        }
    }

    #[tokio::test]
    async fn camel_case_serialization() {
        let event = WorkspaceEvent::MemberRoleChanged {
            workspace_id: "ws1".into(),
            user_id: "u1".into(),
            username: "alice".into(),
            previous_role: "editor".into(),
            new_role: "admin".into(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert!(json.get("previousRole").is_some());
        assert!(json.get("newRole").is_some());
        assert!(json.get("workspaceId").is_some());
        assert!(json.get("userId").is_some());
        assert!(json.get("previous_role").is_none());
        assert!(json.get("new_role").is_none());
    }
}
