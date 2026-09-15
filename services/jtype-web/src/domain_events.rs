//! Structured Card Activity and audit primitives.
//!
//! Markdown remains the task source of truth. These helpers derive compact,
//! immutable facts from the accepted before/after Markdown and authenticated
//! session; callers never supply their own actor or field diff.

use std::collections::BTreeSet;

use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};

use crate::db::models::AuthUser;

/// Frontmatter fields that form the portable Card contract. Values are stored
/// as compact JSON scalars/arrays; the Markdown body is represented only by a
/// boolean changed marker, never copied into the audit log.
const CARD_FIELDS: &[&str] = &[
    "board",
    "title",
    "status",
    "priority",
    "assignee",
    "swimlane",
    "start",
    "due",
    "reminder",
    "archived",
    "tags",
    "attachments",
    "blocked_by",
    "blocks",
    "relates",
    "parent",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActivityActor {
    pub kind: String,
    pub user_id: Option<String>,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActivityClient {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActivityToken {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FieldChange {
    pub field: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub after: Option<JsonValue>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AuditProvenance {
    pub actor: ActivityActor,
    pub client: ActivityClient,
    pub token: Option<ActivityToken>,
}

/// Normalize an untrusted client hint at an authenticated write boundary.
/// Agent scopes are always MCP. Full sessions may identify as Desktop or Web;
/// every other caller value falls back to Web. `system` is reserved for Rust
/// call sites that bypass this function intentionally.
pub fn normalize_authenticated_source(user: &AuthUser, requested: &str) -> &'static str {
    if user.scope != "full" {
        "mcp"
    } else if requested.trim().eq_ignore_ascii_case("desktop") {
        "desktop"
    } else {
        "web"
    }
}

/// Build provenance exclusively from the authenticated session and the
/// server-selected write path. Scoped sessions are agents; login/device
/// sessions are users. Only the human-readable session label is retained.
pub fn audit_provenance(user: &AuthUser, source: &str) -> AuditProvenance {
    let agent = user.scope != "full";
    let client_kind = if agent {
        "mcp"
    } else {
        match source.trim().to_ascii_lowercase().as_str() {
            "desktop" => "desktop",
            "mcp" => "mcp",
            "system" => "system",
            _ => "web",
        }
    };
    let token_label = user
        .session_label
        .as_deref()
        .map(str::trim)
        .filter(|label| !label.is_empty())
        .map(str::to_string);

    AuditProvenance {
        actor: ActivityActor {
            kind: if agent { "agent" } else { "user" }.to_string(),
            user_id: Some(user.id.clone()),
            label: user.username.clone(),
        },
        client: ActivityClient {
            kind: client_kind.to_string(),
            // There is no independently authenticated client-display-name in a
            // session today. Do not trust a caller-provided header as one.
            label: None,
        },
        token: token_label.map(|label| ActivityToken { label: Some(label) }),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CardMutation {
    Created,
    Updated,
    Deleted,
}

/// Produce deterministic, field-level changes from accepted Markdown.
pub fn card_field_changes(before: Option<&str>, after: Option<&str>) -> Vec<FieldChange> {
    let before_fm = before
        .map(jtype_core::parse_frontmatter)
        .unwrap_or_default();
    let after_fm = after.map(jtype_core::parse_frontmatter).unwrap_or_default();
    let mut changes = Vec::new();

    for field in CARD_FIELDS {
        let old = normalized_field_value(field, before_fm.get(*field));
        let new = normalized_field_value(field, after_fm.get(*field));
        if old != new {
            changes.push(FieldChange {
                field: (*field).to_string(),
                before: old,
                after: new,
            });
        }
    }

    let old_body = before.map(markdown_body).unwrap_or_default();
    let new_body = after.map(markdown_body).unwrap_or_default();
    match (before, after) {
        (Some(_), Some(_)) if old_body != new_body => changes.push(FieldChange {
            field: "body".to_string(),
            before: None,
            after: Some(JsonValue::Bool(true)),
        }),
        (None, Some(_)) if !new_body.trim().is_empty() => changes.push(FieldChange {
            field: "body".to_string(),
            before: None,
            after: Some(JsonValue::Bool(true)),
        }),
        (Some(_), None) if !old_body.trim().is_empty() => changes.push(FieldChange {
            field: "body".to_string(),
            before: Some(JsonValue::Bool(true)),
            after: None,
        }),
        _ => {}
    }

    changes
}

/// Select the most specific semantic name without hiding compound edits.
pub fn card_domain_event(mutation: CardMutation, changes: &[FieldChange]) -> &'static str {
    match mutation {
        CardMutation::Created => return "card.created",
        CardMutation::Deleted => return "card.deleted",
        CardMutation::Updated => {}
    }

    let fields: BTreeSet<&str> = changes.iter().map(|change| change.field.as_str()).collect();
    if fields.len() == 1 && fields.contains("status") {
        return "card.status_changed";
    }
    if fields.len() == 1 && fields.contains("board") {
        return "card.board_changed";
    }
    if fields.len() == 1 && fields.contains("assignee") {
        return "card.assignee_changed";
    }
    if !fields.is_empty()
        && fields
            .iter()
            .all(|field| matches!(*field, "start" | "due" | "reminder"))
    {
        return "card.schedule_changed";
    }
    if !fields.is_empty() && fields.iter().all(|field| *field == "tags") {
        return "card.labels_changed";
    }
    if !fields.is_empty()
        && fields
            .iter()
            .all(|field| matches!(*field, "blocked_by" | "blocks" | "relates" | "parent"))
    {
        return "card.dependencies_changed";
    }
    if fields.len() == 1 && fields.contains("archived") {
        let archived = changes
            .first()
            .and_then(|change| change.after.as_ref())
            .and_then(JsonValue::as_bool)
            .unwrap_or(false);
        return if archived {
            "card.archived"
        } else {
            "card.restored"
        };
    }
    "card.updated"
}

fn normalized_field_value(field: &str, value: Option<&String>) -> Option<JsonValue> {
    let raw = value
        .map(String::as_str)
        .map(str::trim)
        .filter(|v| !v.is_empty())?;
    match field {
        "archived" => Some(JsonValue::Bool(matches!(
            raw.to_ascii_lowercase().as_str(),
            "true" | "yes" | "1" | "on"
        ))),
        "tags" | "attachments" => Some(json!(parse_list(raw, false))),
        "blocked_by" | "blocks" | "relates" => Some(json!(parse_list(raw, true))),
        "parent" => parse_list(raw, true)
            .into_iter()
            .next()
            .map(JsonValue::String),
        _ => Some(JsonValue::String(raw.to_string())),
    }
}

fn parse_list(raw: &str, wiki_links: bool) -> Vec<String> {
    let trimmed = raw.trim().trim_start_matches('[').trim_end_matches(']');
    let mut out = Vec::new();
    for item in trimmed.split(',') {
        let mut item = item.trim().trim_matches(['\'', '"']).trim();
        if wiki_links {
            item = item.trim_start_matches("[[").trim_end_matches("]]").trim();
        } else if let Some(stripped) = item.strip_prefix('#') {
            item = stripped.trim();
        }
        if !item.is_empty() && !out.iter().any(|existing| existing == item) {
            out.push(item.to_string());
        }
    }
    out
}

fn markdown_body(content: &str) -> String {
    let normalized = content.replace("\r\n", "\n");
    if !normalized.starts_with("---\n") {
        return normalized;
    }
    let rest = &normalized[4..];
    match rest.find("\n---\n") {
        Some(end) => rest[end + 5..].to_string(),
        None => normalized,
    }
}

/// Extract syntactically valid usernames from Markdown text nodes. Code and
/// link/image destinations are ignored; boundary rules also reject email and
/// URL path fragments such as `a@b.com` and `/@name`.
pub fn extract_mentions(markdown: &str) -> BTreeSet<String> {
    let mut mentions = BTreeSet::new();
    let mut ignored_depth = 0usize;
    for event in Parser::new(markdown) {
        match event {
            Event::Start(Tag::CodeBlock(_) | Tag::Image { .. }) => {
                ignored_depth += 1;
            }
            Event::End(TagEnd::CodeBlock | TagEnd::Image) => {
                ignored_depth = ignored_depth.saturating_sub(1);
            }
            Event::Text(text) if ignored_depth == 0 => scan_mentions(&text, &mut mentions),
            _ => {}
        }
    }
    mentions
}

/// Newly introduced mentions in the Markdown body (frontmatter deliberately
/// excluded). This is the Card-write counterpart to comment mention parsing.
pub fn newly_added_body_mentions(before: Option<&str>, after: &str) -> BTreeSet<String> {
    let old = before
        .map(markdown_body)
        .map(|body| extract_mentions(&body))
        .unwrap_or_default();
    let new = extract_mentions(&markdown_body(after));
    new.difference(&old).cloned().collect()
}

fn scan_mentions(text: &str, mentions: &mut BTreeSet<String>) {
    let bytes = text.as_bytes();
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index] != b'@' {
            index += 1;
            continue;
        }
        let valid_boundary = if index == 0 {
            true
        } else {
            let previous = text[..index].chars().next_back().unwrap_or(' ');
            previous.is_whitespace()
                || "([{\"'.,!?;:".contains(previous)
                // CJK prose commonly has no ASCII whitespace before a
                // mention; non-ASCII letters and punctuation are boundaries.
                || !previous.is_ascii()
        };
        if !valid_boundary {
            index += 1;
            continue;
        }

        let start = index + 1;
        let mut end = start;
        while end < bytes.len()
            && (bytes[end].is_ascii_alphanumeric() || matches!(bytes[end], b'-' | b'_'))
        {
            end += 1;
        }
        if (3..=80).contains(&(end - start)) {
            mentions.insert(text[start..end].to_ascii_lowercase());
        }
        index = end.max(index + 1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn diff_keeps_fields_but_never_markdown_body() {
        let before = "---\ntitle: One\nstatus: todo\ntags: a, b\n---\nsecret before";
        let after = "---\ntitle: One\nstatus: done\ntags: [a, c]\n---\nsecret after";
        let changes = card_field_changes(Some(before), Some(after));
        assert!(changes.iter().any(|change| change.field == "status"));
        assert!(changes.iter().any(|change| change.field == "tags"));
        let body = changes
            .iter()
            .find(|change| change.field == "body")
            .unwrap();
        assert_eq!(body.after, Some(JsonValue::Bool(true)));
        let encoded = serde_json::to_string(&changes).unwrap();
        assert!(!encoded.contains("secret before"));
        assert!(!encoded.contains("secret after"));
    }

    #[test]
    fn provenance_contains_labels_but_no_credentials() {
        let user = AuthUser {
            id: "user-1".into(),
            username: "jack".into(),
            role: "user".into(),
            scope: "mcp".into(),
            session_label: Some("release-agent".into()),
        };
        let provenance = audit_provenance(&user, "web");
        let encoded = serde_json::to_value(json!({
            "actor": provenance.actor,
            "client": provenance.client,
            "token": provenance.token,
        }))
        .unwrap();
        assert_eq!(encoded["actor"]["kind"], "agent");
        assert_eq!(encoded["client"]["kind"], "mcp");
        assert_eq!(encoded["token"]["label"], "release-agent");
        let keys = encoded.to_string().to_ascii_lowercase();
        assert!(!keys.contains("hash"));
        assert!(!keys.contains("fingerprint"));
        assert!(!keys.contains("bearer"));
    }

    #[test]
    fn authenticated_source_cannot_spoof_agent_or_system() {
        let mut user = AuthUser {
            id: "user-1".into(),
            username: "jack".into(),
            role: "user".into(),
            scope: "full".into(),
            session_label: None,
        };
        assert_eq!(normalize_authenticated_source(&user, "desktop"), "desktop");
        assert_eq!(normalize_authenticated_source(&user, "mcp"), "web");
        assert_eq!(normalize_authenticated_source(&user, "system"), "web");
        assert_eq!(normalize_authenticated_source(&user, "anything"), "web");
        user.scope = "mcp".into();
        assert_eq!(normalize_authenticated_source(&user, "desktop"), "mcp");
    }

    #[test]
    fn mention_parser_ignores_code_links_emails_and_url_paths() {
        let mentions = extract_mentions(
            "Hello @Alice and (@bob_1). `@code`\n```\n@block\n```\n[请 @carol 查看](/@link) a@example.com /@path；请@dave",
        );
        assert_eq!(
            mentions,
            BTreeSet::from([
                "alice".to_string(),
                "bob_1".to_string(),
                "carol".to_string(),
                "dave".to_string(),
            ])
        );
    }

    #[test]
    fn body_mentions_ignore_frontmatter_and_only_return_new_names() {
        let before = "---\ntitle: @frontmatter\n---\nhello @alice";
        let after = "---\ntitle: @other-frontmatter\n---\nhello @alice and @bob";
        assert_eq!(
            newly_added_body_mentions(Some(before), after),
            BTreeSet::from(["bob".to_string()])
        );
    }
}
