//! Periodic cleanup of expired trash rows.
//!
//! Runs every hour. Purges:
//!   - `document_trash` whose `expires_at < NOW()`
//!
//! Note: this is *physical* cleanup. Restored rows are not touched
//! (they have `restored_at` set but are kept for audit history).
//!
//! A simple boolean `running` flag prevents overlapping runs if the
//! cleanup query takes longer than the tick interval.

use sqlx::{MySql, Pool};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

const TICK_INTERVAL_SECS: u64 = 3600; // 1 hour

pub fn spawn(pool: Pool<MySql>) {
    let running = Arc::new(AtomicBool::new(false));
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(TICK_INTERVAL_SECS));
        // Skip the immediate first tick to avoid running on startup races
        interval.tick().await;
        loop {
            interval.tick().await;
            if running.swap(true, Ordering::SeqCst) {
                // Already running, skip this tick
                continue;
            }
            match run_once(&pool).await {
                Ok(doc) => {
                    eprintln!("[cleanup_trash] purged {} document_trash rows", doc);
                }
                Err(e) => {
                    eprintln!("[cleanup_trash] error: {}", e);
                }
            }
            running.store(false, Ordering::SeqCst);
        }
    });
}

pub async fn run_once(pool: &Pool<MySql>) -> Result<u64, sqlx::Error> {
    let docs = sqlx::query("DELETE FROM document_trash WHERE expires_at < CURRENT_TIMESTAMP")
        .execute(pool)
        .await?
        .rows_affected();
    Ok(docs)
}
