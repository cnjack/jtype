//! Server-wide settings stored in the database, resolved with the precedence
//!
//! ```text
//! database (operator UI) → environment variable → built-in default
//! ```
//!
//! i.e. a value set through the admin UI (persisted in `server_settings`)
//! overrides the corresponding `JTYPED_*` environment variable, which in turn
//! overrides the built-in default. The database connection URL is deliberately
//! NOT resolvable here — the server must already be connected to read this
//! table.
//!
//! Today only the object-storage config (`storage.*`) is wired; the table and
//! this resolver are generic so further overridable settings can be added
//! without a schema change.

use std::collections::HashMap;

use sqlx::{MySql, Pool, Row};

use crate::error::AppError;
use crate::storage::{self, StorageConfig};

// Keys used in the `server_settings` table.
pub const STORAGE_ENDPOINT: &str = "storage.endpoint";
pub const STORAGE_BUCKET: &str = "storage.bucket";
pub const STORAGE_ACCESS_KEY: &str = "storage.access_key";
pub const STORAGE_SECRET_KEY: &str = "storage.secret_key";
pub const STORAGE_REGION: &str = "storage.region";
pub const STORAGE_LOCAL_DIR: &str = "storage.local_dir";

// The environment variable backing each storage key.
pub const ENV_STORAGE_ENDPOINT: &str = "JTYPED_STORAGE_ENDPOINT";
pub const ENV_STORAGE_BUCKET: &str = "JTYPED_STORAGE_BUCKET";
pub const ENV_STORAGE_ACCESS_KEY: &str = "JTYPED_STORAGE_ACCESS_KEY";
pub const ENV_STORAGE_SECRET_KEY: &str = "JTYPED_STORAGE_SECRET_KEY";
pub const ENV_STORAGE_REGION: &str = "JTYPED_STORAGE_REGION";
pub const ENV_STORAGE_LOCAL_DIR: &str = "JTYPED_STORAGE_LOCAL_DIR";

/// Where a resolved value came from. Surfaced in the admin API so the operator
/// can see whether a field is overridden in the DB, inherited from the
/// environment, or just the built-in default.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    Db,
    Env,
    Default,
}

impl Source {
    pub fn as_str(self) -> &'static str {
        match self {
            Source::Db => "db",
            Source::Env => "env",
            Source::Default => "default",
        }
    }
}

/// Load every row of `server_settings` into a map.
pub async fn load_map(pool: &Pool<MySql>) -> Result<HashMap<String, String>, AppError> {
    let rows = sqlx::query("SELECT `key`, `value` FROM server_settings")
        .fetch_all(pool)
        .await?;
    let mut map = HashMap::with_capacity(rows.len());
    for row in rows {
        let key: String = row.try_get("key")?;
        let value: String = row.try_get("value")?;
        map.insert(key, value);
    }
    Ok(map)
}

/// Resolve a single value with DB → env → default precedence. Note that a
/// *present* DB row wins even when its value is empty (an operator who clears a
/// field is explicitly overriding the environment).
fn resolve_value(map: &HashMap<String, String>, key: &str, env_key: &str, default: &str) -> String {
    if let Some(v) = map.get(key) {
        return v.clone();
    }
    if let Ok(v) = std::env::var(env_key) {
        return v;
    }
    default.to_string()
}

/// Which source supplied the resolved value for a key.
pub fn source_of(map: &HashMap<String, String>, key: &str, env_key: &str) -> Source {
    if map.contains_key(key) {
        Source::Db
    } else if std::env::var(env_key).is_ok() {
        Source::Env
    } else {
        Source::Default
    }
}

/// Build the effective [`StorageConfig`] from a settings map (already loaded via
/// [`load_map`]) plus environment fallbacks and defaults.
pub fn resolve_storage_config(map: &HashMap<String, String>) -> StorageConfig {
    StorageConfig {
        endpoint: resolve_value(map, STORAGE_ENDPOINT, ENV_STORAGE_ENDPOINT, ""),
        bucket: resolve_value(
            map,
            STORAGE_BUCKET,
            ENV_STORAGE_BUCKET,
            storage::DEFAULT_BUCKET,
        ),
        access_key: resolve_value(map, STORAGE_ACCESS_KEY, ENV_STORAGE_ACCESS_KEY, ""),
        secret_key: resolve_value(map, STORAGE_SECRET_KEY, ENV_STORAGE_SECRET_KEY, ""),
        region: resolve_value(
            map,
            STORAGE_REGION,
            ENV_STORAGE_REGION,
            storage::DEFAULT_REGION,
        ),
        local_dir: resolve_value(
            map,
            STORAGE_LOCAL_DIR,
            ENV_STORAGE_LOCAL_DIR,
            storage::DEFAULT_LOCAL_DIR,
        ),
    }
}

/// Convenience: load the map and resolve the storage config in one step.
pub async fn load_storage_config(pool: &Pool<MySql>) -> Result<StorageConfig, AppError> {
    let map = load_map(pool).await?;
    Ok(resolve_storage_config(&map))
}

/// Insert or update a single setting key.
pub async fn upsert(pool: &Pool<MySql>, key: &str, value: &str) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO server_settings (`key`, `value`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // These use uniquely-named env keys so they never collide with the real
    // `JTYPED_*` vars or with each other under parallel test execution.

    #[test]
    fn db_value_wins_over_env_and_default() {
        let mut map = HashMap::new();
        map.insert("k".to_string(), "from-db".to_string());
        let env_key = "JTYPE_TEST_SETTINGS_PRECEDENCE_A";
        std::env::set_var(env_key, "from-env");
        assert_eq!(resolve_value(&map, "k", env_key, "def"), "from-db");
        assert_eq!(source_of(&map, "k", env_key), Source::Db);
        std::env::remove_var(env_key);
    }

    #[test]
    fn present_but_empty_db_row_still_overrides_env() {
        // Clearing a field through the UI explicitly overrides the environment.
        let mut map = HashMap::new();
        map.insert("k".to_string(), String::new());
        let env_key = "JTYPE_TEST_SETTINGS_PRECEDENCE_B";
        std::env::set_var(env_key, "from-env");
        assert_eq!(resolve_value(&map, "k", env_key, "def"), "");
        assert_eq!(source_of(&map, "k", env_key), Source::Db);
        std::env::remove_var(env_key);
    }

    #[test]
    fn env_wins_over_default_when_no_db_row() {
        let map = HashMap::new();
        let env_key = "JTYPE_TEST_SETTINGS_PRECEDENCE_C";
        std::env::set_var(env_key, "from-env");
        assert_eq!(resolve_value(&map, "k", env_key, "def"), "from-env");
        assert_eq!(source_of(&map, "k", env_key), Source::Env);
        std::env::remove_var(env_key);
    }

    #[test]
    fn default_when_neither_db_nor_env() {
        let map = HashMap::new();
        let env_key = "JTYPE_TEST_SETTINGS_PRECEDENCE_D";
        std::env::remove_var(env_key);
        assert_eq!(resolve_value(&map, "k", env_key, "def"), "def");
        assert_eq!(source_of(&map, "k", env_key), Source::Default);
    }
}
