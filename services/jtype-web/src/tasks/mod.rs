//! Background tasks (cron-like loops).
//!
//! Currently:
//!   - `cleanup_trash`: hourly, deletes rows from `document_trash`
//!     whose `expires_at < NOW()`.
//!   - `webhook_delivery`: every 10s, signs + POSTs due webhook deliveries.
//!
//! All tasks spawned from `lib.rs::run_from_env`.

pub mod cleanup_trash;
pub mod webhook_delivery;
