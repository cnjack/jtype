use std::{
    env,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use reqwest::{header::RETRY_AFTER, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{MySql, Pool};
use tokio::sync::Mutex;
use url::Url;

use crate::{db::models::CloudDocument, util::sha256_hex};

pub const PUSH_ROUTE_ORIGIN: &str = "https://jtype.nightc.com";
pub const PUSH_ROUTE_PATH: &str = "/open/document";
const FCM_SCOPE: &str = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_TOKEN_AUDIENCE: &str = "https://oauth2.googleapis.com/token";
const FCM_TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const FCM_SEND_ORIGIN: &str = "https://fcm.googleapis.com";
const APNS_DEVELOPMENT_ORIGIN: &str = "https://api.development.push.apple.com";
const APNS_PRODUCTION_ORIGIN: &str = "https://api.push.apple.com";

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

    /// Android's current FCM SDK registers a Firebase Installation ID. The
    /// matching direct-send contract uses `message.fid`, while the data-only
    /// message lets JType's native service own notification presentation.
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

/// Add one durable delivery for every other current member's mobile
/// registration. A document save never fails because notification enqueueing
/// is a secondary side effect; callers log the returned error and continue.
pub async fn enqueue_document_change(
    pool: &Pool<MySql>,
    workspace_id: &str,
    actor_user_id: &str,
    editor: &str,
    document: &CloudDocument,
) -> Result<u64, sqlx::Error> {
    let title = bounded("Document updated", 120);
    let body = bounded(
        &format!("{} updated {}", editor.trim(), document.title.trim()),
        512,
    );
    let event_key = sha256_hex(&format!(
        "{}\n{}\n{}",
        workspace_id, document.relative_path, document.updated_clock
    ));
    let path_key = sha256_hex(&format!("{}\n{}", workspace_id, document.relative_path));
    let mut transaction = pool.begin().await?;
    // A remote notification is a refresh hint, not a version ledger. Coalesce
    // older unclaimed updates for the same document/device while leaving an
    // in-flight row untouched, so a disabled provider cannot grow the queue on
    // every keystroke and a concurrent claim cannot erase a newer event.
    sqlx::query(
        r#"DELETE d FROM mobile_push_deliveries d
           JOIN mobile_push_registrations r ON r.id = d.registration_id
           JOIN workspace_members m
             ON m.user_id = r.user_id AND m.workspace_id = d.workspace_id
            AND m.status = 'active'
           WHERE d.workspace_id = ? AND d.path_key = ?
             AND d.status IN ('pending', 'failed', 'dead')
             AND r.user_id <> ?"#,
    )
    .bind(workspace_id)
    .bind(&path_key)
    .bind(actor_user_id)
    .execute(&mut *transaction)
    .await?;
    let result = sqlx::query(
        r#"INSERT IGNORE INTO mobile_push_deliveries
             (id, registration_id, workspace_id, event_key, path_key, relative_path,
              document_clock, title, body)
           SELECT UUID(), r.id, ?, ?, ?, ?, ?, ?, ?
           FROM mobile_push_registrations r
           JOIN workspace_members m
             ON m.user_id = r.user_id AND m.workspace_id = ? AND m.status = 'active'
           WHERE r.user_id <> ?"#,
    )
    .bind(workspace_id)
    .bind(event_key)
    .bind(path_key)
    .bind(&document.relative_path)
    .bind(document.updated_clock)
    .bind(title)
    .bind(body)
    .bind(workspace_id)
    .bind(actor_user_id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    Ok(result.rows_affected())
}

#[derive(Clone)]
pub struct PushTransport {
    inner: Arc<PushTransportInner>,
}

struct PushTransportInner {
    client: reqwest::Client,
    fcm: Option<FcmConfig>,
    apns: Option<ApnsConfig>,
    fcm_token: Mutex<Option<CachedToken>>,
    apns_development_token: Mutex<Option<CachedToken>>,
    apns_production_token: Mutex<Option<CachedToken>>,
}

#[derive(Clone)]
struct FcmConfig {
    project_id: String,
    client_email: String,
    private_key: String,
    token_endpoint: String,
    send_origin: String,
}

#[derive(Clone)]
struct ApnsConfig {
    team_id: String,
    topic: String,
    development: Option<ApnsEnvironmentConfig>,
    production: Option<ApnsEnvironmentConfig>,
}

#[derive(Clone)]
struct ApnsEnvironmentConfig {
    key_id: String,
    private_key: String,
    origin: String,
}

#[derive(Clone)]
struct CachedToken {
    value: String,
    refresh_at: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum DeliveryDisposition {
    Delivered,
    Retry {
        status_code: Option<u16>,
        reason: String,
        retry_after_secs: Option<u64>,
    },
    Invalidate {
        status_code: Option<u16>,
        reason: String,
    },
    Dead {
        status_code: Option<u16>,
        reason: String,
    },
}

impl PushTransport {
    /// Load only complete, valid provider groups. A missing or malformed group
    /// disables that provider without ever falling back to placeholder keys or
    /// alternate endpoints.
    pub fn from_env() -> Option<Self> {
        let fcm = load_fcm_from_env().and_then(|config| match validate_fcm_config(&config) {
            Ok(()) => Some(config),
            Err(reason) => {
                eprintln!("FCM transport disabled: {reason}");
                None
            }
        });
        let apns = load_apns_from_env().and_then(|config| match validate_apns_config(&config) {
            Ok(()) => Some(config),
            Err(reason) => {
                eprintln!("APNs transport disabled: {reason}");
                None
            }
        });
        if fcm.is_none() && apns.is_none() {
            eprintln!("mobile push transport disabled: no complete provider credentials");
            return None;
        }
        match Self::new(fcm, apns) {
            Ok(transport) => Some(transport),
            Err(reason) => {
                eprintln!("mobile push transport disabled: {reason}");
                None
            }
        }
    }

    fn new(fcm: Option<FcmConfig>, apns: Option<ApnsConfig>) -> Result<Self, &'static str> {
        if let Some(config) = &fcm {
            validate_fcm_config(config)?;
        }
        if let Some(config) = &apns {
            validate_apns_config(config)?;
        }
        let client = reqwest::Client::builder()
            .user_agent("jtype-web-mobile-push")
            .timeout(std::time::Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::none())
            .min_tls_version(reqwest::tls::Version::TLS_1_2)
            .http2_adaptive_window(true)
            .build()
            .map_err(|_| "provider HTTP client initialization failed")?;
        Ok(Self {
            inner: Arc::new(PushTransportInner {
                client,
                fcm,
                apns,
                fcm_token: Mutex::new(None),
                apns_development_token: Mutex::new(None),
                apns_production_token: Mutex::new(None),
            }),
        })
    }

    pub(crate) fn provider_enabled(&self, provider: &str) -> bool {
        match provider {
            "fcm" => self.inner.fcm.is_some(),
            "apns" => self.inner.apns.is_some(),
            _ => false,
        }
    }

    pub(crate) fn apns_environment_enabled(&self, environment: &str) -> bool {
        self.inner
            .apns
            .as_ref()
            .is_some_and(|config| match environment {
                "development" => config.development.is_some(),
                "production" => config.production.is_some(),
                _ => false,
            })
    }

    pub(crate) async fn send(
        &self,
        provider: &str,
        environment: &str,
        identifier: &str,
        push: &CollaborationPush,
    ) -> DeliveryDisposition {
        match provider {
            "fcm" => self.send_fcm(identifier, push).await,
            "apns" => self.send_apns(environment, identifier, push).await,
            _ => DeliveryDisposition::Dead {
                status_code: None,
                reason: "unsupported_provider".into(),
            },
        }
    }

    async fn send_fcm(&self, fid: &str, push: &CollaborationPush) -> DeliveryDisposition {
        let Some(config) = &self.inner.fcm else {
            return retry(None, "provider_disabled", None);
        };
        let Some(payload) = push.fcm_message(fid) else {
            return dead(None, "invalid_payload");
        };
        for auth_attempt in 0..2 {
            let access_token = match self.fcm_access_token(config).await {
                Ok(token) => token,
                Err(reason) => return retry(None, reason, Some(60)),
            };
            let endpoint = format!(
                "{}/v1/projects/{}/messages:send",
                config.send_origin.trim_end_matches('/'),
                config.project_id
            );
            let response = self
                .inner
                .client
                .post(endpoint)
                .bearer_auth(access_token)
                .json(&payload)
                .send()
                .await;
            let response = match response {
                Ok(response) => response,
                Err(_) => return retry(None, "network_error", Some(60)),
            };
            let status = response.status();
            let retry_after = retry_after_secs(response.headers());
            let body = response.text().await.unwrap_or_default();
            let disposition = classify_fcm_response(status, &body, retry_after);
            if auth_attempt == 0 && status == StatusCode::UNAUTHORIZED {
                *self.inner.fcm_token.lock().await = None;
                continue;
            }
            return disposition;
        }
        retry(Some(401), "oauth_unauthorized", Some(60))
    }

    async fn fcm_access_token(&self, config: &FcmConfig) -> Result<String, &'static str> {
        let mut cached = self.inner.fcm_token.lock().await;
        let now = now_secs();
        if let Some(token) = cached.as_ref().filter(|token| token.refresh_at > now) {
            return Ok(token.value.clone());
        }
        let claims = FcmJwtClaims {
            iss: &config.client_email,
            aud: FCM_TOKEN_AUDIENCE,
            scope: FCM_SCOPE,
            iat: now,
            exp: now.saturating_add(3600),
        };
        let key = EncodingKey::from_rsa_pem(config.private_key.as_bytes())
            .map_err(|_| "oauth_signing_key_invalid")?;
        let assertion = encode(&Header::new(Algorithm::RS256), &claims, &key)
            .map_err(|_| "oauth_assertion_failed")?;
        let response = self
            .inner
            .client
            .post(&config.token_endpoint)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", assertion.as_str()),
            ])
            .send()
            .await
            .map_err(|_| "oauth_network_error")?;
        if !response.status().is_success() {
            return Err("oauth_rejected");
        }
        let response: OAuthTokenResponse = response
            .json()
            .await
            .map_err(|_| "oauth_response_invalid")?;
        if response.access_token.trim().is_empty() {
            return Err("oauth_response_invalid");
        }
        let refresh_at = now.saturating_add(response.expires_in.saturating_sub(60).max(60));
        *cached = Some(CachedToken {
            value: response.access_token.clone(),
            refresh_at,
        });
        Ok(response.access_token)
    }

    async fn send_apns(
        &self,
        environment: &str,
        device_token: &str,
        push: &CollaborationPush,
    ) -> DeliveryDisposition {
        let Some(config) = &self.inner.apns else {
            return retry(None, "provider_disabled", None);
        };
        let Some(payload) = push.apns_payload() else {
            return dead(None, "invalid_payload");
        };
        if device_token.len() != 64 || !device_token.bytes().all(|value| value.is_ascii_hexdigit())
        {
            return invalidate(None, "invalid_device_token");
        }
        let (environment_config, token_cache) = match environment {
            "development" => (
                config.development.as_ref(),
                &self.inner.apns_development_token,
            ),
            "production" => (
                config.production.as_ref(),
                &self.inner.apns_production_token,
            ),
            _ => return dead(None, "invalid_environment"),
        };
        let Some(environment_config) = environment_config else {
            return retry(None, "environment_provider_disabled", None);
        };
        for auth_attempt in 0..2 {
            let provider_token = match self
                .apns_provider_token(config, environment_config, token_cache)
                .await
            {
                Ok(token) => token,
                Err(reason) => return retry(None, reason, Some(60)),
            };
            let endpoint = format!(
                "{}/3/device/{}",
                environment_config.origin.trim_end_matches('/'),
                device_token.to_ascii_lowercase()
            );
            let response = self
                .inner
                .client
                .post(endpoint)
                .bearer_auth(provider_token)
                .header("apns-topic", &config.topic)
                .header("apns-push-type", "alert")
                .header("apns-priority", "10")
                .header("apns-expiration", "0")
                .json(&payload)
                .send()
                .await;
            let response = match response {
                Ok(response) => response,
                Err(_) => return retry(None, "network_error", Some(60)),
            };
            let status = response.status();
            let retry_after = retry_after_secs(response.headers());
            let body = response.text().await.unwrap_or_default();
            let disposition = classify_apns_response(status, &body, retry_after);
            let expired = matches!(
                &disposition,
                DeliveryDisposition::Retry { reason, .. } if reason == "ExpiredProviderToken"
            );
            if auth_attempt == 0 && expired {
                *token_cache.lock().await = None;
                continue;
            }
            return disposition;
        }
        retry(Some(403), "ExpiredProviderToken", Some(60))
    }

    async fn apns_provider_token(
        &self,
        config: &ApnsConfig,
        environment: &ApnsEnvironmentConfig,
        token_cache: &Mutex<Option<CachedToken>>,
    ) -> Result<String, &'static str> {
        let mut cached = token_cache.lock().await;
        let now = now_secs();
        if let Some(token) = cached.as_ref().filter(|token| token.refresh_at > now) {
            return Ok(token.value.clone());
        }
        let mut header = Header::new(Algorithm::ES256);
        header.kid = Some(environment.key_id.clone());
        let claims = ApnsJwtClaims {
            iss: &config.team_id,
            iat: now,
        };
        let key = EncodingKey::from_ec_pem(environment.private_key.as_bytes())
            .map_err(|_| "apns_signing_key_invalid")?;
        let token = encode(&header, &claims, &key).map_err(|_| "apns_token_failed")?;
        // Apple requires refresh between 20 and 60 minutes; use 50 minutes.
        *cached = Some(CachedToken {
            value: token.clone(),
            refresh_at: now.saturating_add(50 * 60),
        });
        Ok(token)
    }
}

#[derive(Serialize)]
struct FcmJwtClaims<'a> {
    iss: &'a str,
    aud: &'a str,
    scope: &'a str,
    iat: u64,
    exp: u64,
}

#[derive(Serialize)]
struct ApnsJwtClaims<'a> {
    iss: &'a str,
    iat: u64,
}

#[derive(Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
    #[serde(default = "default_token_lifetime")]
    expires_in: u64,
}

fn default_token_lifetime() -> u64 {
    3600
}

fn load_fcm_from_env() -> Option<FcmConfig> {
    let values = [
        env_value("JTYPED_FCM_PROJECT_ID"),
        env_value("JTYPED_FCM_CLIENT_EMAIL"),
        env_value("JTYPED_FCM_PRIVATE_KEY"),
    ];
    if values.iter().all(Option::is_none) {
        return None;
    }
    let [Some(project_id), Some(client_email), Some(private_key)] = values else {
        eprintln!("FCM transport disabled: JTYPED_FCM_* credentials are incomplete");
        return None;
    };
    Some(FcmConfig {
        project_id,
        client_email,
        private_key: normalize_pem(private_key),
        token_endpoint: FCM_TOKEN_ENDPOINT.into(),
        send_origin: FCM_SEND_ORIGIN.into(),
    })
}

fn load_apns_from_env() -> Option<ApnsConfig> {
    let team_id = env_value("JTYPED_APNS_TEAM_ID");
    let topic = env_value("JTYPED_APNS_TOPIC");
    let legacy = load_apns_environment(
        "JTYPED_APNS_KEY_ID",
        "JTYPED_APNS_PRIVATE_KEY",
        APNS_PRODUCTION_ORIGIN,
        "shared",
    );
    let development = load_apns_environment(
        "JTYPED_APNS_DEVELOPMENT_KEY_ID",
        "JTYPED_APNS_DEVELOPMENT_PRIVATE_KEY",
        APNS_DEVELOPMENT_ORIGIN,
        "development",
    );
    let production = load_apns_environment(
        "JTYPED_APNS_PRODUCTION_KEY_ID",
        "JTYPED_APNS_PRODUCTION_PRIVATE_KEY",
        APNS_PRODUCTION_ORIGIN,
        "production",
    );
    if team_id.is_none()
        && topic.is_none()
        && legacy.is_none()
        && development.is_none()
        && production.is_none()
    {
        return None;
    }
    let (Some(team_id), Some(topic)) = (team_id, topic) else {
        eprintln!("APNs transport disabled: team ID or topic is missing");
        return None;
    };
    // Older APNs team keys can cover both endpoints. New environment-scoped
    // keys should use the explicit development/production variables; explicit
    // credentials always win over the shared compatibility pair.
    let development = development.or_else(|| {
        legacy.clone().map(|mut value| {
            value.origin = APNS_DEVELOPMENT_ORIGIN.into();
            value
        })
    });
    let production = production.or(legacy);
    if development.is_none() && production.is_none() {
        eprintln!("APNs transport disabled: no complete environment key is configured");
        return None;
    }
    Some(ApnsConfig {
        team_id,
        topic,
        development,
        production,
    })
}

fn load_apns_environment(
    key_id_name: &str,
    private_key_name: &str,
    origin: &str,
    label: &str,
) -> Option<ApnsEnvironmentConfig> {
    let key_id = env_value(key_id_name);
    let private_key = env_value(private_key_name);
    if key_id.is_none() && private_key.is_none() {
        return None;
    }
    let (Some(key_id), Some(private_key)) = (key_id, private_key) else {
        eprintln!("APNs {label} transport disabled: key credentials are incomplete");
        return None;
    };
    let config = ApnsEnvironmentConfig {
        key_id,
        private_key: normalize_pem(private_key),
        origin: origin.into(),
    };
    match validate_apns_environment(&config) {
        Ok(()) => Some(config),
        Err(reason) => {
            eprintln!("APNs {label} transport disabled: {reason}");
            None
        }
    }
}

fn validate_fcm_config(config: &FcmConfig) -> Result<(), &'static str> {
    if config.project_id.is_empty()
        || config.project_id.len() > 128
        || !config.project_id.bytes().all(|value| {
            value.is_ascii_alphanumeric() || matches!(value, b'-' | b'_' | b':' | b'.')
        })
        || config.client_email.is_empty()
        || config.client_email.len() > 320
    {
        return Err("FCM provider identity is invalid");
    }
    EncodingKey::from_rsa_pem(config.private_key.as_bytes())
        .map_err(|_| "FCM private key is invalid")?;
    Ok(())
}

fn validate_apns_config(config: &ApnsConfig) -> Result<(), &'static str> {
    if !valid_apple_id(&config.team_id)
        || config.topic.is_empty()
        || config.topic.len() > 255
        || !config
            .topic
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || matches!(value, b'.' | b'-'))
    {
        return Err("APNs provider identity is invalid");
    }
    if config.development.is_none() && config.production.is_none() {
        return Err("APNs environment credentials are missing");
    }
    if let Some(environment) = &config.development {
        validate_apns_environment(environment)?;
    }
    if let Some(environment) = &config.production {
        validate_apns_environment(environment)?;
    }
    Ok(())
}

fn validate_apns_environment(config: &ApnsEnvironmentConfig) -> Result<(), &'static str> {
    if !valid_apple_id(&config.key_id) {
        return Err("APNs key ID is invalid");
    }
    EncodingKey::from_ec_pem(config.private_key.as_bytes())
        .map_err(|_| "APNs private key is invalid")?;
    Ok(())
}

fn valid_apple_id(value: &str) -> bool {
    value.len() == 10 && value.bytes().all(|item| item.is_ascii_alphanumeric())
}

fn classify_fcm_response(
    status: StatusCode,
    body: &str,
    retry_after_secs: Option<u64>,
) -> DeliveryDisposition {
    if status.is_success() {
        return DeliveryDisposition::Delivered;
    }
    let parsed: Value = serde_json::from_str(body).unwrap_or(Value::Null);
    let fcm_code = parsed
        .pointer("/error/details")
        .and_then(Value::as_array)
        .and_then(|details| {
            details.iter().find_map(|detail| {
                let kind = detail.get("@type")?.as_str()?;
                (kind == "type.googleapis.com/google.firebase.fcm.v1.FcmError")
                    .then(|| detail.get("errorCode")?.as_str().map(str::to_string))
                    .flatten()
            })
        });
    let status_name = parsed
        .pointer("/error/status")
        .and_then(Value::as_str)
        .unwrap_or("FCM_ERROR");
    let reason = fcm_code.as_deref().unwrap_or(status_name);
    if matches!(
        fcm_code.as_deref(),
        Some("UNREGISTERED" | "INVALID_ARGUMENT")
    ) {
        return invalidate(Some(status.as_u16()), reason);
    }
    if status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error() {
        return retry(Some(status.as_u16()), reason, retry_after_secs.or(Some(60)));
    }
    if status == StatusCode::UNAUTHORIZED {
        return retry(Some(status.as_u16()), "oauth_unauthorized", Some(60));
    }
    dead(Some(status.as_u16()), reason)
}

fn classify_apns_response(
    status: StatusCode,
    body: &str,
    retry_after_secs: Option<u64>,
) -> DeliveryDisposition {
    if status.is_success() {
        return DeliveryDisposition::Delivered;
    }
    let parsed: Value = serde_json::from_str(body).unwrap_or(Value::Null);
    let reason = parsed
        .get("reason")
        .and_then(Value::as_str)
        .unwrap_or("APNS_ERROR");
    if matches!(
        reason,
        "BadDeviceToken" | "DeviceTokenNotForTopic" | "ExpiredToken" | "Unregistered"
    ) {
        return invalidate(Some(status.as_u16()), reason);
    }
    if reason == "ExpiredProviderToken" {
        return retry(Some(status.as_u16()), reason, Some(60));
    }
    if status == StatusCode::TOO_MANY_REQUESTS
        || status.is_server_error()
        || reason == "IdleTimeout"
    {
        return retry(Some(status.as_u16()), reason, retry_after_secs.or(Some(60)));
    }
    dead(Some(status.as_u16()), reason)
}

fn retry(
    status_code: Option<u16>,
    reason: &str,
    retry_after_secs: Option<u64>,
) -> DeliveryDisposition {
    DeliveryDisposition::Retry {
        status_code,
        reason: bounded_reason(reason),
        retry_after_secs,
    }
}

fn invalidate(status_code: Option<u16>, reason: &str) -> DeliveryDisposition {
    DeliveryDisposition::Invalidate {
        status_code,
        reason: bounded_reason(reason),
    }
}

fn dead(status_code: Option<u16>, reason: &str) -> DeliveryDisposition {
    DeliveryDisposition::Dead {
        status_code,
        reason: bounded_reason(reason),
    }
}

fn bounded_reason(value: &str) -> String {
    value
        .chars()
        .filter(|value| value.is_ascii_alphanumeric() || matches!(value, '_' | '-'))
        .take(128)
        .collect()
}

fn retry_after_secs(headers: &reqwest::header::HeaderMap) -> Option<u64> {
    headers
        .get(RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .map(|value| value.clamp(1, 3600))
}

fn env_value(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn normalize_pem(value: String) -> String {
    if value.contains("\\n") && !value.contains('\n') {
        value.replace("\\n", "\n")
    } else {
        value
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
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
    use axum::{body::Bytes, extract::State, http::HeaderMap, routing::post, Router};
    use tokio::sync::mpsc;

    fn push() -> CollaborationPush {
        CollaborationPush {
            workspace_id: "workspace-1".into(),
            relative_path: "notes/hello world.md".into(),
            title: "Changed note".into(),
            body: "Open the shared document.".into(),
        }
    }

    async fn capture_request(
        State(sender): State<mpsc::Sender<(HeaderMap, Value)>>,
        headers: HeaderMap,
        body: Bytes,
    ) -> StatusCode {
        let payload = serde_json::from_slice(&body).unwrap_or(Value::Null);
        sender.send((headers, payload)).await.unwrap();
        StatusCode::OK
    }

    async fn mock_origin(path: &str) -> (String, mpsc::Receiver<(HeaderMap, Value)>) {
        let (sender, receiver) = mpsc::channel(1);
        let app = Router::new()
            .route(path, post(capture_request))
            .with_state(sender);
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        (format!("http://{address}"), receiver)
    }

    fn test_transport(fcm_origin: Option<String>, apns_origin: Option<String>) -> PushTransport {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .unwrap();
        PushTransport {
            inner: Arc::new(PushTransportInner {
                client,
                fcm: fcm_origin.map(|send_origin| FcmConfig {
                    project_id: "test-project".into(),
                    client_email: "push@example.invalid".into(),
                    private_key: "unused-by-cached-test-token".into(),
                    token_endpoint: "http://unused.invalid".into(),
                    send_origin,
                }),
                apns: apns_origin.map(|origin| ApnsConfig {
                    team_id: "TEAMID1234".into(),
                    topic: "net.jcode.jtype".into(),
                    development: Some(ApnsEnvironmentConfig {
                        key_id: "KEYID12345".into(),
                        private_key: "unused-by-cached-test-token".into(),
                        origin: origin.clone(),
                    }),
                    production: Some(ApnsEnvironmentConfig {
                        key_id: "KEYID12345".into(),
                        private_key: "unused-by-cached-test-token".into(),
                        origin,
                    }),
                }),
                fcm_token: Mutex::new(Some(CachedToken {
                    value: "fcm-access-token".into(),
                    refresh_at: u64::MAX,
                })),
                apns_development_token: Mutex::new(Some(CachedToken {
                    value: "apns-provider-token".into(),
                    refresh_at: u64::MAX,
                })),
                apns_production_token: Mutex::new(Some(CachedToken {
                    value: "apns-provider-token".into(),
                    refresh_at: u64::MAX,
                })),
            }),
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

    #[test]
    fn fcm_classifies_invalid_registration_retry_and_permanent_errors() {
        let invalid = r#"{"error":{"status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError","errorCode":"INVALID_ARGUMENT"}]}}"#;
        let unregistered = r#"{"error":{"status":"NOT_FOUND","details":[{"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError","errorCode":"UNREGISTERED"}]}}"#;
        assert!(matches!(
            classify_fcm_response(StatusCode::BAD_REQUEST, invalid, None),
            DeliveryDisposition::Invalidate { .. }
        ));
        assert!(matches!(
            classify_fcm_response(StatusCode::NOT_FOUND, unregistered, None),
            DeliveryDisposition::Invalidate { .. }
        ));
        assert!(matches!(
            classify_fcm_response(
                StatusCode::NOT_FOUND,
                r#"{"error":{"status":"NOT_FOUND"}}"#,
                None
            ),
            DeliveryDisposition::Dead { .. }
        ));
        assert_eq!(
            classify_fcm_response(StatusCode::SERVICE_UNAVAILABLE, "{}", Some(90)),
            retry(Some(503), "FCM_ERROR", Some(90))
        );
        assert!(matches!(
            classify_fcm_response(
                StatusCode::FORBIDDEN,
                r#"{"error":{"status":"SENDER_ID_MISMATCH"}}"#,
                None
            ),
            DeliveryDisposition::Dead { .. }
        ));
    }

    #[test]
    fn apns_classifies_invalid_registration_auth_refresh_and_backoff() {
        assert!(matches!(
            classify_apns_response(StatusCode::GONE, r#"{"reason":"Unregistered"}"#, None),
            DeliveryDisposition::Invalidate { .. }
        ));
        assert_eq!(
            classify_apns_response(
                StatusCode::FORBIDDEN,
                r#"{"reason":"ExpiredProviderToken"}"#,
                None
            ),
            retry(Some(403), "ExpiredProviderToken", Some(60))
        );
        assert_eq!(
            classify_apns_response(
                StatusCode::TOO_MANY_REQUESTS,
                r#"{"reason":"TooManyRequests"}"#,
                Some(120)
            ),
            retry(Some(429), "TooManyRequests", Some(120))
        );
    }

    #[test]
    fn reasons_are_allowlisted_before_persistence() {
        assert_eq!(
            bounded_reason("bad token: secret/value"),
            "badtokensecretvalue"
        );
        assert_eq!(normalize_pem("line-1\\nline-2".into()), "line-1\nline-2");
    }

    #[tokio::test]
    async fn provider_requests_use_expected_target_auth_headers_and_route_payload() {
        let token = "a".repeat(64);
        let fcm_path = "/v1/projects/test-project/messages:send";
        let apns_path = format!("/3/device/{token}");
        let (fcm_origin, mut fcm_requests) = mock_origin(fcm_path).await;
        let (apns_origin, mut apns_requests) = mock_origin(&apns_path).await;
        let transport = test_transport(Some(fcm_origin), Some(apns_origin));

        assert_eq!(
            transport
                .send("fcm", "production", "firebase-installation-id", &push())
                .await,
            DeliveryDisposition::Delivered
        );
        let (headers, payload) = fcm_requests.recv().await.unwrap();
        assert_eq!(headers["authorization"], "Bearer fcm-access-token");
        assert_eq!(payload["message"]["fid"], "firebase-installation-id");
        assert_eq!(
            payload["message"]["data"]["routeUrl"],
            push().canonical_route_url().unwrap()
        );

        assert_eq!(
            transport.send("apns", "development", &token, &push()).await,
            DeliveryDisposition::Delivered
        );
        let (headers, payload) = apns_requests.recv().await.unwrap();
        assert_eq!(headers["authorization"], "Bearer apns-provider-token");
        assert_eq!(headers["apns-topic"], "net.jcode.jtype");
        assert_eq!(headers["apns-push-type"], "alert");
        assert_eq!(payload["jtypeRoute"], push().canonical_route_url().unwrap());
    }
}
