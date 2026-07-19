//! Durable FCM/APNs delivery worker for mobile collaboration refresh hints.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use sqlx::{MySql, Pool, Row};

use crate::push::{CollaborationPush, DeliveryDisposition, PushTransport};

const TICK_SECS: u64 = 10;
const BATCH: i64 = 40;
const DELIVERY_RETENTION_HOURS: i64 = 4;

pub fn spawn(pool: Pool<MySql>, transport: Option<PushTransport>) {
    let running = Arc::new(AtomicBool::new(false));
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(TICK_SECS));
        interval.tick().await;
        loop {
            interval.tick().await;
            if running.swap(true, Ordering::SeqCst) {
                continue;
            }
            if let Err(error) = run_once(&pool, transport.as_ref()).await {
                eprintln!("mobile push delivery tick failed: {error}");
            }
            running.store(false, Ordering::SeqCst);
        }
    });
}

/// Claim and process one due batch. Conditional claims make this safe across
/// multiple jtype-web processes; stale claims are recovered after five minutes.
pub async fn run_once(
    pool: &Pool<MySql>,
    transport: Option<&PushTransport>,
) -> Result<u64, sqlx::Error> {
    let maintenance = maintain_once(pool).await?;
    if maintenance.total() > 0 {
        println!(
            "mobile push maintenance: recovered={}, inactive={}, expired={}",
            maintenance.recovered, maintenance.removed_inactive, maintenance.removed_expired
        );
    }
    let Some(transport) = transport else {
        return Ok(0);
    };

    let rows = sqlx::query(
        r#"SELECT d.id, d.registration_id, d.workspace_id, d.relative_path,
                  d.title, d.body, d.attempt_count, d.max_attempts,
                  r.provider, r.environment, r.provider_identifier
           FROM mobile_push_deliveries d
           JOIN mobile_push_registrations r ON r.id = d.registration_id
           WHERE d.status IN ('pending', 'failed')
             AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())
             AND ((? = 1 AND r.provider = 'fcm')
               OR (? = 1 AND r.provider = 'apns' AND r.environment = 'development')
               OR (? = 1 AND r.provider = 'apns' AND r.environment = 'production'))
           ORDER BY d.created_at ASC
           LIMIT ?"#,
    )
    .bind(transport.provider_enabled("fcm"))
    .bind(transport.apns_environment_enabled("development"))
    .bind(transport.apns_environment_enabled("production"))
    .bind(BATCH)
    .fetch_all(pool)
    .await?;

    let mut attempted = 0;
    for row in rows {
        let id: String = row.try_get("id")?;
        let claimed = sqlx::query(
            r#"UPDATE mobile_push_deliveries
               SET status = 'processing'
               WHERE id = ? AND status IN ('pending', 'failed')
                 AND (next_retry_at IS NULL OR next_retry_at <= NOW())"#,
        )
        .bind(&id)
        .execute(pool)
        .await?
        .rows_affected();
        if claimed != 1 {
            continue;
        }

        let registration_id: String = row.try_get("registration_id")?;
        let provider: String = row.try_get("provider")?;
        let environment: String = row.try_get("environment")?;
        let identifier: String = row.try_get("provider_identifier")?;
        let previous_attempts: i32 = row.try_get("attempt_count")?;
        let max_attempts: i32 = row.try_get("max_attempts")?;
        let push = CollaborationPush {
            workspace_id: row.try_get("workspace_id")?,
            relative_path: row.try_get("relative_path")?,
            title: row.try_get("title")?,
            body: row.try_get("body")?,
        };
        let disposition = transport
            .send(&provider, &environment, &identifier, &push)
            .await;
        apply_disposition(
            pool,
            &id,
            &registration_id,
            previous_attempts,
            max_attempts,
            disposition,
        )
        .await?;
        attempted += 1;
    }
    Ok(attempted)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MaintenanceSummary {
    pub recovered: u64,
    pub removed_inactive: u64,
    pub removed_expired: u64,
}

impl MaintenanceSummary {
    fn total(self) -> u64 {
        self.recovered
            .saturating_add(self.removed_inactive)
            .saturating_add(self.removed_expired)
    }
}

/// Privacy and pressure maintenance runs even when no provider credentials are
/// configured. It never logs identifiers, routes, workspace IDs, or copy.
pub async fn maintain_once(pool: &Pool<MySql>) -> Result<MaintenanceSummary, sqlx::Error> {
    let recovered = sqlx::query(
        r#"UPDATE mobile_push_deliveries
           SET status = 'failed', next_retry_at = NOW()
           WHERE status = 'processing'
             AND updated_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)"#,
    )
    .execute(pool)
    .await?
    .rows_affected();

    // Membership is checked again at delivery time. Revoked members never
    // receive a queued route, even if their registration still exists.
    let removed_inactive = sqlx::query(
        r#"DELETE d FROM mobile_push_deliveries d
           JOIN mobile_push_registrations r ON r.id = d.registration_id
           LEFT JOIN workspace_members m
             ON m.user_id = r.user_id AND m.workspace_id = d.workspace_id
            AND m.status = 'active'
           WHERE m.user_id IS NULL"#,
    )
    .execute(pool)
    .await?
    .rows_affected();

    // Provider hints are freshness signals, not durable user records. Remove
    // expired unclaimed/dead rows after four hours. A live processing claim is
    // preserved until the stale-claim recovery above makes it safe to delete.
    let removed_expired = sqlx::query(
        r#"DELETE FROM mobile_push_deliveries
           WHERE status <> 'processing'
             AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)"#,
    )
    .bind(DELIVERY_RETENTION_HOURS)
    .execute(pool)
    .await?
    .rows_affected();

    Ok(MaintenanceSummary {
        recovered,
        removed_inactive,
        removed_expired,
    })
}

async fn apply_disposition(
    pool: &Pool<MySql>,
    delivery_id: &str,
    registration_id: &str,
    previous_attempts: i32,
    max_attempts: i32,
    disposition: DeliveryDisposition,
) -> Result<(), sqlx::Error> {
    let attempt = previous_attempts.saturating_add(1);
    match disposition {
        DeliveryDisposition::Delivered => {
            // Successful refresh hints have no audit value; remove private path
            // and copy immediately instead of retaining a delivery history.
            sqlx::query("DELETE FROM mobile_push_deliveries WHERE id = ?")
                .bind(delivery_id)
                .execute(pool)
                .await?;
        }
        DeliveryDisposition::Invalidate { .. } => {
            // Registration deletion cascades all of its queued deliveries. The
            // native callback will upload a replacement if the provider rotates.
            sqlx::query("DELETE FROM mobile_push_registrations WHERE id = ?")
                .bind(registration_id)
                .execute(pool)
                .await?;
        }
        DeliveryDisposition::Retry {
            status_code,
            reason,
            retry_after_secs,
        } => {
            let dead = attempt >= max_attempts;
            if dead {
                sqlx::query(
                    r#"UPDATE mobile_push_deliveries
                       SET status = 'dead', attempt_count = ?, last_status_code = ?,
                           last_reason = ?, next_retry_at = NULL
                       WHERE id = ? AND status = 'processing'"#,
                )
                .bind(attempt)
                .bind(status_code.map(i32::from))
                .bind(reason)
                .bind(delivery_id)
                .execute(pool)
                .await?;
                return Ok(());
            }
            let delay = retry_delay_secs(delivery_id, attempt, retry_after_secs);
            sqlx::query(
                r#"UPDATE mobile_push_deliveries
                   SET status = ?, attempt_count = ?, last_status_code = ?,
                       last_reason = ?, next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
                   WHERE id = ? AND status = 'processing'"#,
            )
            .bind("failed")
            .bind(attempt)
            .bind(status_code.map(i32::from))
            .bind(reason)
            .bind(delay as i64)
            .bind(delivery_id)
            .execute(pool)
            .await?;
        }
        DeliveryDisposition::Dead {
            status_code,
            reason,
        } => {
            sqlx::query(
                r#"UPDATE mobile_push_deliveries
                   SET status = 'dead', attempt_count = ?, last_status_code = ?,
                       last_reason = ?, next_retry_at = NULL
                   WHERE id = ? AND status = 'processing'"#,
            )
            .bind(attempt)
            .bind(status_code.map(i32::from))
            .bind(reason)
            .bind(delivery_id)
            .execute(pool)
            .await?;
        }
    }
    Ok(())
}

fn retry_delay_secs(delivery_id: &str, attempt: i32, provider_delay: Option<u64>) -> u64 {
    let exponent = attempt.clamp(1, 6) as u32;
    let base = 30_u64
        .saturating_mul(2_u64.saturating_pow(exponent))
        .min(3600);
    let jitter = delivery_id.bytes().map(u64::from).sum::<u64>() % 31;
    base.max(provider_delay.unwrap_or(0))
        .saturating_add(jitter)
        .min(3600)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_backoff_honors_provider_delay_and_caps() {
        assert!(retry_delay_secs("delivery-a", 1, None) >= 60);
        assert!(retry_delay_secs("delivery-a", 2, Some(180)) >= 180);
        assert_eq!(retry_delay_secs("delivery-a", 99, Some(7200)), 3600);
    }
}
