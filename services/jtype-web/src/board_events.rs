//! In-process, board-scoped live event bus for the SSE notification mode.
//!
//! A board's SSE subscribers ([`crate::handlers::live::board_events_stream`]) and
//! the card-change trigger ([`crate::handlers::document::fire_card_webhook`]) meet
//! here. The bus itself is live-only, but each payload is persisted first in the
//! `kanban_events` log; disconnected clients recover through the sequence pull
//! endpoint. Keyed by `(workspace_id, board_ref)` — the same logical board id the
//! webhooks and durable log use — so all notification paths stay aligned.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use tokio::sync::broadcast;

/// Per-`(workspace, board)` broadcast channels, created lazily on first subscribe
/// or publish. Senders persist for the process lifetime (bounded by the number of
/// distinct boards), which is fine for an in-memory live feed.
#[derive(Default)]
pub struct BoardEvents {
    channels: Mutex<HashMap<String, broadcast::Sender<String>>>,
}

/// `\u{1}` can't appear in a workspace id (UUID) or a board ref, so it's an
/// unambiguous separator for the composite channel key.
fn channel_key(workspace_id: &str, board_ref: &str) -> String {
    format!("{workspace_id}\u{1}{board_ref}")
}

impl BoardEvents {
    /// Subscribe to a board's live events, creating the channel if absent.
    pub fn subscribe(&self, workspace_id: &str, board_ref: &str) -> broadcast::Receiver<String> {
        let mut channels = self.channels.lock().unwrap_or_else(|e| e.into_inner());
        channels
            .entry(channel_key(workspace_id, board_ref))
            .or_insert_with(|| broadcast::channel(256).0)
            .subscribe()
    }

    /// Publish a serialized event payload to a board. A no-op when nobody is
    /// listening (the channel is absent, or every receiver has dropped).
    pub fn publish(&self, workspace_id: &str, board_ref: &str, payload: String) {
        let sender = {
            let channels = self.channels.lock().unwrap_or_else(|e| e.into_inner());
            channels.get(&channel_key(workspace_id, board_ref)).cloned()
        };
        if let Some(tx) = sender {
            let _ = tx.send(payload);
        }
    }
}

/// The process-global bus. A global (rather than an [`crate::AppState`] field)
/// keeps the publish side — buried in `fire_card_webhook`, reached from the
/// REST/sync/conflict save paths that only carry a `pool` — from having to thread
/// state through every call site.
pub fn global() -> &'static BoardEvents {
    static BUS: OnceLock<BoardEvents> = OnceLock::new();
    BUS.get_or_init(BoardEvents::default)
}
