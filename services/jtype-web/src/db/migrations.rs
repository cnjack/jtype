use sqlx::{MySql, Pool};

use crate::error::AppError;

/// Migration entry: version number, name, up SQL, down SQL.
struct Migration {
    version: i64,
    name: &'static str,
    up: &'static str,
    down: &'static str,
}

/// All migrations in order.  Each pair is loaded from `migrations/XXXX_name.{up,down}.sql`
/// at compile time via `include_str!`.
fn all_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            name: "init",
            up: include_str!("../../migrations/0001_init.up.sql"),
            down: include_str!("../../migrations/0001_init.down.sql"),
        },
    ]
}

// ---------------------------------------------------------------------------
// Schema version table
// ---------------------------------------------------------------------------

const ENSURE_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS _schema_migrations (
    version BIGINT NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"#;

async fn ensure_schema_table(pool: &Pool<MySql>) -> Result<(), AppError> {
    sqlx::query(ENSURE_TABLE).execute(pool).await?;
    Ok(())
}

async fn current_version(pool: &Pool<MySql>) -> Result<i64, AppError> {
    let version: Option<i64> =
        sqlx::query_scalar("SELECT MAX(version) FROM _schema_migrations")
            .fetch_one(pool)
            .await?;
    Ok(version.unwrap_or(0))
}

async fn record_version(pool: &Pool<MySql>, version: i64, name: &str) -> Result<(), AppError> {
    sqlx::query("INSERT INTO _schema_migrations (version, name) VALUES (?, ?)")
        .bind(version)
        .bind(name)
        .execute(pool)
        .await?;
    Ok(())
}

async fn remove_version(pool: &Pool<MySql>, version: i64) -> Result<(), AppError> {
    sqlx::query("DELETE FROM _schema_migrations WHERE version = ?")
        .bind(version)
        .execute(pool)
        .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// SQL execution helper
// ---------------------------------------------------------------------------

/// Execute a SQL script that may contain multiple statements separated by `;`.
/// Skips empty statements and strips leading SQL comments (`--`).
async fn exec_sql(pool: &Pool<MySql>, sql: &str) -> Result<(), AppError> {
    for statement in sql.split(';') {
        // Strip leading comment lines
        let stmt: String = statement
            .lines()
            .filter(|line| !line.trim_start().starts_with("--"))
            .collect::<Vec<_>>()
            .join("\n");
        let stmt = stmt.trim();
        if stmt.is_empty() {
            continue;
        }
        sqlx::query(stmt).execute(pool).await.map_err(|e| {
            AppError::Server(format!("migration SQL error: {e}\n  statement: {stmt}"))
        })?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Apply all pending UP migrations (like `migrate up`).
pub async fn run_all(pool: &Pool<MySql>) -> Result<(), AppError> {
    ensure_schema_table(pool).await?;
    let cur = current_version(pool).await?;
    let migrations = all_migrations();

    for m in &migrations {
        if m.version <= cur {
            continue;
        }
        eprintln!("[migrations] applying UP v{}: {}", m.version, m.name);
        exec_sql(pool, m.up).await?;
        record_version(pool, m.version, m.name).await?;
        eprintln!("[migrations] applied v{}: {}", m.version, m.name);
    }

    // Seed data (idempotent)
    seed_first_admin(pool).await?;
    seed_workspace_members(pool).await?;

    Ok(())
}

/// Roll back the most recent migration (like `migrate down 1`).
#[allow(dead_code)]
pub async fn rollback_last(pool: &Pool<MySql>) -> Result<Option<i64>, AppError> {
    ensure_schema_table(pool).await?;
    let cur = current_version(pool).await?;
    if cur == 0 {
        return Ok(None);
    }
    let migrations = all_migrations();
    let m = migrations
        .iter()
        .find(|m| m.version == cur)
        .ok_or_else(|| {
            AppError::Server(format!("no migration found for current version {cur}"))
        })?;

    eprintln!("[migrations] applying DOWN v{}: {}", m.version, m.name);
    exec_sql(pool, m.down).await?;
    remove_version(pool, m.version).await?;
    eprintln!("[migrations] rolled back v{}: {}", m.version, m.name);

    Ok(Some(cur))
}

/// Roll back to a specific target version (like `migrate down -to V`).
#[allow(dead_code)]
pub async fn rollback_to(pool: &Pool<MySql>, target: i64) -> Result<Vec<i64>, AppError> {
    ensure_schema_table(pool).await?;
    let mut rolled = Vec::new();
    loop {
        let cur = current_version(pool).await?;
        if cur <= target {
            break;
        }
        match rollback_last(pool).await? {
            Some(v) => rolled.push(v),
            None => break,
        }
    }
    Ok(rolled)
}

/// Return `(current_version, latest_available_version)`.
#[allow(dead_code)]
pub async fn status(pool: &Pool<MySql>) -> Result<(i64, i64), AppError> {
    ensure_schema_table(pool).await?;
    let cur = current_version(pool).await?;
    let latest = all_migrations().last().map(|m| m.version).unwrap_or(0);
    Ok((cur, latest))
}

// ---------------------------------------------------------------------------
// Seeds (idempotent)
// ---------------------------------------------------------------------------

async fn seed_first_admin(pool: &Pool<MySql>) -> Result<(), AppError> {
    sqlx::query(
        r#"UPDATE users
           SET role = 'admin'
           WHERE created_at = (SELECT min_created FROM (SELECT MIN(created_at) AS min_created FROM users) t)
             AND role <> 'admin'"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn seed_workspace_members(pool: &Pool<MySql>) -> Result<(), AppError> {
    sqlx::query(
        r#"INSERT IGNORE INTO workspace_members (workspace_id, user_id, role, status, joined_at)
           SELECT id, COALESCE(owner_user_id, user_id), 'owner', 'active', CURRENT_TIMESTAMP
           FROM workspaces
           WHERE COALESCE(owner_user_id, user_id) IS NOT NULL"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}
