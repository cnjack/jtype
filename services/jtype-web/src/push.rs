use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use url::Url;

pub const PUSH_ROUTE_ORIGIN: &str = "https://jtype.nightc.com";
pub const PUSH_ROUTE_PATH: &str = "/open/document";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationPush {
    pub workspace_id: String,
    pub relative_path: String,
    pub title: String,
    pub body: String,
}

impl CollaborationPush {
    pub fn canonical_route_url(&self) -> Option<String> {
        let workspace_id = self.workspace_id.trim();
        let relative_path = normalize_push_path(&self.relative_path)?;
        if workspace_id.is_empty()
            || workspace_id.len() > 128
            || !workspace_id
                .bytes()
                .all(|value| value.is_ascii_alphanumeric() || matches!(value, b'_' | b'-'))
        {
            return None;
        }
        let mut url = Url::parse(PUSH_ROUTE_ORIGIN).ok()?;
        url.set_path(PUSH_ROUTE_PATH);
        url.query_pairs_mut()
            .append_pair("workspaceId", workspace_id)
            .append_pair("path", &relative_path);
        Some(url.into())
    }

    /// Android uses a data-only FCM message so JType's native service owns
    /// presentation and always opens the same canonical route.
    pub fn fcm_message(&self, fid: &str) -> Option<Value> {
        let fid = fid.trim();
        let route_url = self.canonical_route_url()?;
        if fid.is_empty() {
            return None;
        }
        Some(json!({
            "message": {
                "fid": fid,
                "data": {
                    "title": bounded(&self.title, 120),
                    "body": bounded(&self.body, 512),
                    "routeUrl": route_url,
                },
                "android": {
                    "priority": "HIGH",
                    "ttl": "3600s",
                }
            }
        }))
    }

    pub fn apns_payload(&self) -> Option<Value> {
        let route_url = self.canonical_route_url()?;
        Some(json!({
            "aps": {
                "alert": {
                    "title": bounded(&self.title, 120),
                    "body": bounded(&self.body, 512),
                },
                "sound": "default",
                "thread-id": format!("jtype-workspace-{}", self.workspace_id.trim()),
            },
            "jtypeRoute": route_url,
        }))
    }
}

fn bounded(value: &str, max_chars: usize) -> String {
    value.trim().chars().take(max_chars).collect()
}

fn normalize_push_path(value: &str) -> Option<String> {
    let normalized = value.trim();
    if normalized.is_empty()
        || normalized.len() > 1024
        || normalized.contains('\\')
        || normalized.starts_with('/')
        || normalized.ends_with('/')
        || normalized.chars().any(char::is_control)
        || normalized.split('/').any(|part| {
            part.is_empty()
                || matches!(
                    part,
                    "." | ".." | ".jtype" | ".git" | "node_modules" | "target"
                )
        })
    {
        return None;
    }
    Some(normalized.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn push() -> CollaborationPush {
        CollaborationPush {
            workspace_id: "workspace-1".into(),
            relative_path: "notes/hello world.md".into(),
            title: "Changed note".into(),
            body: "Open the shared document.".into(),
        }
    }

    #[test]
    fn both_provider_payloads_share_one_canonical_route() {
        let push = push();
        let route = push.canonical_route_url().unwrap();
        assert_eq!(
            route,
            "https://jtype.nightc.com/open/document?workspaceId=workspace-1&path=notes%2Fhello+world.md"
        );
        assert_eq!(
            push.fcm_message("firebase-installation-id").unwrap()["message"]["data"]["routeUrl"],
            route
        );
        assert_eq!(push.apns_payload().unwrap()["jtypeRoute"], route);
    }

    #[test]
    fn rejects_unsafe_or_empty_routes() {
        let mut item = push();
        item.relative_path = "../secret.md".into();
        assert!(item.canonical_route_url().is_none());
        item.relative_path = "notes/.jtype/private.md".into();
        assert!(item.canonical_route_url().is_none());
        item.relative_path = "notes\\private.md".into();
        assert!(item.canonical_route_url().is_none());
        item.relative_path = "note.md".into();
        item.workspace_id = " ".into();
        assert!(item.canonical_route_url().is_none());
        item.workspace_id = "workspace?unexpected".into();
        assert!(item.canonical_route_url().is_none());
    }

    #[test]
    fn bounds_provider_visible_copy() {
        let mut item = push();
        item.title = "t".repeat(200);
        item.body = "b".repeat(700);
        let fcm = item.fcm_message("firebase-installation-id").unwrap();
        let apns = item.apns_payload().unwrap();
        assert_eq!(
            fcm["message"]["data"]["title"]
                .as_str()
                .unwrap()
                .chars()
                .count(),
            120
        );
        assert_eq!(
            apns["aps"]["alert"]["body"]
                .as_str()
                .unwrap()
                .chars()
                .count(),
            512
        );
    }
}
