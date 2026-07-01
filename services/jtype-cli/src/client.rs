//! Thin async HTTP client for the jtype-web REST API.

use std::time::Duration;

use anyhow::{anyhow, Context, Result};
use reqwest::{Method, StatusCode};
use serde_json::Value;

pub struct ApiClient {
    http: reqwest::Client,
    base: String,
    token: Option<String>,
}

impl ApiClient {
    pub fn new(base: impl Into<String>, token: Option<String>) -> Self {
        Self {
            http: reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(10))
                .timeout(Duration::from_secs(60))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            base: base.into().trim_end_matches('/').to_string(),
            token,
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base, path)
    }

    /// Send a JSON request and parse a JSON response, surfacing API errors.
    pub async fn send(&self, method: Method, path: &str, body: Option<Value>) -> Result<Value> {
        let mut req = self.http.request(method.clone(), self.url(path));
        if let Some(token) = &self.token {
            req = req.bearer_auth(token);
        }
        req = req.header("content-type", "application/json");
        if let Some(b) = &body {
            req = req.json(b);
        } else if matches!(method, Method::POST) {
            req = req.body("{}");
        }
        let resp = req.send().await.with_context(|| format!("request to {path} failed"))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let json: Value = if text.is_empty() {
            Value::Null
        } else {
            serde_json::from_str(&text).unwrap_or(Value::String(text.clone()))
        };
        if status.is_success() {
            Ok(json)
        } else {
            let msg = json
                .get("error")
                .and_then(|e| e.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| text.clone());
            Err(anyhow!("{} {}: {}", status.as_u16(), reason(status), msg))
        }
    }

    pub async fn get(&self, path: &str) -> Result<Value> {
        self.send(Method::GET, path, None).await
    }
    pub async fn post(&self, path: &str, body: Value) -> Result<Value> {
        self.send(Method::POST, path, Some(body)).await
    }

    /// Raw POST to the MCP endpoint (used by `mcp-stdio`). Returns (status, body).
    pub async fn post_mcp_raw(&self, json_line: &str, path: &str) -> Result<(StatusCode, String)> {
        let mut req = self
            .http
            .post(self.url(path))
            .header("content-type", "application/json")
            .body(json_line.to_string());
        if let Some(token) = &self.token {
            req = req.bearer_auth(token);
        }
        let resp = req.send().await.context("MCP request failed")?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        Ok((status, text))
    }
}

fn reason(status: StatusCode) -> &'static str {
    status.canonical_reason().unwrap_or("error")
}
