//! Android App Links and iOS Universal Links website association manifests.
//!
//! These endpoints authorize only the native application identity. They do not
//! expose a document, token, or web navigation surface. Missing or malformed
//! release-signing values produce empty manifests so development deployments
//! cannot accidentally claim a production association.

use axum::{
    extract::State,
    http::header,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};

use crate::AppState;

pub const APP_BUNDLE_ID: &str = "net.jcode.jtype";
pub const DOCUMENT_APP_LINK_PATH: &str = "/open/document";
pub const ENV_APPLE_TEAM_ID: &str = "JTYPED_APPLE_APP_LINK_TEAM_ID";
pub const ENV_ANDROID_CERT_FINGERPRINTS: &str = "JTYPED_ANDROID_APP_LINK_CERT_SHA256";

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct AppLinkConfig {
    apple_team_id: Option<String>,
    android_cert_fingerprints: Vec<String>,
}

impl AppLinkConfig {
    pub fn from_env() -> Self {
        let apple_team_id = std::env::var(ENV_APPLE_TEAM_ID).ok();
        let android_cert_fingerprints = std::env::var(ENV_ANDROID_CERT_FINGERPRINTS)
            .unwrap_or_default()
            .split(',')
            .map(str::to_string)
            .collect();
        Self::new(apple_team_id, android_cert_fingerprints)
    }

    pub fn new(apple_team_id: Option<String>, android_cert_fingerprints: Vec<String>) -> Self {
        Self {
            apple_team_id: apple_team_id.and_then(|value| normalize_apple_team_id(&value)),
            android_cert_fingerprints: android_cert_fingerprints
                .iter()
                .filter_map(|value| normalize_android_fingerprint(value))
                .collect(),
        }
    }

    pub fn apple_app_site_association(&self) -> Value {
        let details = self
            .apple_team_id
            .as_ref()
            .map(|team_id| {
                vec![json!({
                    "appIDs": [format!("{team_id}.{APP_BUNDLE_ID}")],
                    "components": [{
                        "/": DOCUMENT_APP_LINK_PATH,
                        "comment": "Opens a credential-free JType cloud workspace document route"
                    }]
                })]
            })
            .unwrap_or_default();
        json!({ "applinks": { "details": details } })
    }

    pub fn android_asset_links(&self) -> Value {
        if self.android_cert_fingerprints.is_empty() {
            return json!([]);
        }
        json!([{
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": APP_BUNDLE_ID,
                "sha256_cert_fingerprints": self.android_cert_fingerprints
            }
        }])
    }
}

fn normalize_apple_team_id(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (trimmed.len() == 10
        && trimmed
            .bytes()
            .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit()))
    .then(|| trimmed.to_string())
}

fn normalize_android_fingerprint(value: &str) -> Option<String> {
    let compact = value
        .trim()
        .chars()
        .filter(|character| *character != ':')
        .collect::<String>();
    if compact.len() != 64 || !compact.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    Some(
        compact
            .as_bytes()
            .chunks(2)
            .map(|chunk| {
                std::str::from_utf8(chunk)
                    .expect("fingerprint is ASCII")
                    .to_ascii_uppercase()
            })
            .collect::<Vec<_>>()
            .join(":"),
    )
}

fn association_response(body: Value) -> Response {
    (
        [
            (header::CONTENT_TYPE, "application/json"),
            (header::CACHE_CONTROL, "public, max-age=300"),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        ],
        Json(body),
    )
        .into_response()
}

pub async fn apple_app_site_association(State(state): State<AppState>) -> Response {
    association_response(state.app_links.apple_app_site_association())
}

pub async fn android_asset_links(State(state): State<AppState>) -> Response {
    association_response(state.app_links.android_asset_links())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_or_invalid_signing_values_fail_closed() {
        let config =
            AppLinkConfig::new(Some("not-a-team".into()), vec!["not-a-certificate".into()]);
        assert_eq!(
            config.apple_app_site_association(),
            json!({ "applinks": { "details": [] } })
        );
        assert_eq!(config.android_asset_links(), json!([]));
    }

    #[test]
    fn emits_exact_app_identity_and_normalized_certificate() {
        let config = AppLinkConfig::new(
            Some("A1B2C3D4E5".into()),
            vec!["00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff".into()],
        );
        assert_eq!(
            config.apple_app_site_association()["applinks"]["details"][0]["appIDs"][0],
            "A1B2C3D4E5.net.jcode.jtype"
        );
        assert_eq!(
            config.apple_app_site_association()["applinks"]["details"][0]["components"][0]["/"],
            DOCUMENT_APP_LINK_PATH
        );
        assert_eq!(
            config.android_asset_links()[0]["target"]["sha256_cert_fingerprints"][0],
            "00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF"
        );
    }
}
