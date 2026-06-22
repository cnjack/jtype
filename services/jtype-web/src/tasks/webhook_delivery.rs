//! Outbound kanban webhook delivery worker.
//!
//! Every tick it picks due deliveries (`pending`/`failed` with `next_retry_at`
//! elapsed), signs the JSON body with HMAC-SHA256 (key = the webhook secret),
//! POSTs to the target URL, and records the outcome with exponential backoff.
//! `dead` after `max_attempts`.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::{MySql, Pool, Row};

type HmacSha256 = Hmac<Sha256>;

const TICK_SECS: u64 = 10;
const BATCH: i64 = 20;

pub fn spawn(pool: Pool<MySql>) {
    let running = Arc::new(AtomicBool::new(false));
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(TICK_SECS));
        interval.tick().await;
        loop {
            interval.tick().await;
            if running.swap(true, Ordering::SeqCst) {
                continue;
            }
            if let Err(e) = run_once(&pool).await {
                eprintln!("webhook delivery tick failed: {e}");
            }
            running.store(false, Ordering::SeqCst);
        }
    });
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{b:02x}"));
    }
    s
}

/// Process one batch of due deliveries. Returns how many were attempted.
pub async fn run_once(pool: &Pool<MySql>) -> Result<u64, sqlx::Error> {
    let client = reqwest::Client::builder()
        .user_agent("jtype-web")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let rows = sqlx::query(
        r#"SELECT d.id, d.webhook_id, d.event_type, d.payload, d.attempt_count, d.max_attempts,
                  w.target_url, w.secret
           FROM kanban_webhook_deliveries d
           JOIN kanban_webhooks w ON w.id = d.webhook_id
           WHERE d.status IN ('pending', 'failed')
             AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())
           ORDER BY d.created_at ASC
           LIMIT ?"#,
    )
    .bind(BATCH)
    .fetch_all(pool)
    .await?;

    let mut attempted = 0u64;
    for r in rows {
        let id: String = r.try_get("id")?;
        let webhook_id: String = r.try_get("webhook_id")?;
        let event_type: String = r.try_get("event_type")?;
        let payload: serde_json::Value = r.try_get("payload")?;
        let prev_attempts: i32 = r.try_get("attempt_count")?;
        let max_attempts: i32 = r.try_get("max_attempts")?;
        let target_url: String = r.try_get("target_url")?;
        let secret: String = r.try_get("secret")?;

        let body = serde_json::to_vec(&payload).unwrap_or_default();
        let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
            Ok(m) => m,
            Err(_) => continue,
        };
        mac.update(&body);
        let signature = hex_encode(&mac.finalize().into_bytes());

        let resp = client
            .post(&target_url)
            .header("Content-Type", "application/json")
            .header("X-JType-Event", &event_type)
            .header("X-JType-Delivery", &id)
            .header("X-JType-Signature", format!("sha256={signature}"))
            .body(body)
            .send()
            .await;

        let attempt = prev_attempts + 1;
        let success = matches!(&resp, Ok(r) if r.status().is_success());
        if success {
            let code = resp.map(|r| r.status().as_u16() as i32).unwrap_or(0);
            sqlx::query(
                "UPDATE kanban_webhook_deliveries SET status='succeeded', attempt_count=?, last_status_code=?, next_retry_at=NULL WHERE id=?",
            )
            .bind(attempt)
            .bind(code)
            .bind(&id)
            .execute(pool)
            .await?;
            sqlx::query("UPDATE kanban_webhooks SET last_delivery_at=NOW(), last_status='ok' WHERE id=?")
                .bind(&webhook_id)
                .execute(pool)
                .await?;
        } else {
            let (code, err): (Option<i32>, String) = match resp {
                Ok(r) => (Some(r.status().as_u16() as i32), format!("HTTP {}", r.status())),
                Err(e) => (None, e.to_string()),
            };
            let dead = attempt >= max_attempts;
            let status = if dead { "dead" } else { "failed" };
            let backoff = 2_i64.saturating_pow(attempt.max(0) as u32).saturating_mul(30).min(3600);
            let err: String = err.chars().take(512).collect();
            sqlx::query(
                "UPDATE kanban_webhook_deliveries SET status=?, attempt_count=?, last_status_code=?, last_error=?, next_retry_at=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id=?",
            )
            .bind(status)
            .bind(attempt)
            .bind(code)
            .bind(&err)
            .bind(backoff)
            .bind(&id)
            .execute(pool)
            .await?;
            sqlx::query("UPDATE kanban_webhooks SET last_delivery_at=NOW(), last_status='failed' WHERE id=?")
                .bind(&webhook_id)
                .execute(pool)
                .await?;
        }
        attempted += 1;
    }
    Ok(attempted)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_encode_zero_pads() {
        assert_eq!(hex_encode(&[0x00, 0x0f, 0xff]), "000fff");
    }

    #[test]
    fn hmac_sha256_matches_known_vector() {
        // RFC-style vector: HMAC-SHA256("key", "The quick brown fox jumps over the lazy dog")
        let mut mac = HmacSha256::new_from_slice(b"key").unwrap();
        mac.update(b"The quick brown fox jumps over the lazy dog");
        assert_eq!(
            hex_encode(&mac.finalize().into_bytes()),
            "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
        );
    }
}
