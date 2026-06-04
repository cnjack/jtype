//! Background tasks (cron-like loops).
//!
//! Currently:
//!   - `cleanup_trash`: hourly, deletes rows from `document_trash` and
//!     `kanban_card_trash` whose `expires_at < NOW()`.
//!
//! All tasks spawned from `lib.rs::run_from_env`.

pub mod cleanup_trash;
