use sqlx::{MySql, Pool, Row};

use crate::error::AppError;

/// Run all schema migrations in order.
/// Each migration checks preconditions before applying, making them idempotent.
pub async fn run_all(pool: &Pool<MySql>) -> Result<(), AppError> {
    ensure_migrations_table(pool).await?;
    let applied = get_applied_migrations(pool).await?;

    let migrations: &[(&str, &str)] = &[
        ("001_init", include_str!("../../../../infra/mysql/001_init.sql")),
        ("002_user_columns", M002_USER_COLUMNS),
        ("003_compat_workspaces", M003_COMPAT_WORKSPACES),
    ];

    for (name, sql) in migrations {
        if applied.contains(&name.to_string()) {
            continue;
        }
        if *name == "003_compat_workspaces" {
            let count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workspaces' AND COLUMN_NAME = 'slug'"
            )
            .fetch_one(pool)
            .await?;
            if count > 0 {
                record_migration(pool, name).await?;
                continue;
            }
        }
        for statement in sql.split(';').map(str::trim).filter(|s| !s.is_empty()) {
            sqlx::query(statement).execute(pool).await?;
        }
        record_migration(pool, name).await?;
    }

    seed_first_admin(pool).await?;
    seed_workspace_members(pool).await?;

    Ok(())
}

async fn ensure_migrations_table(pool: &Pool<MySql>) -> Result<(), AppError> {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS _migrations (
            name VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn get_applied_migrations(pool: &Pool<MySql>) -> Result<Vec<String>, AppError> {
    let rows = sqlx::query("SELECT name FROM _migrations ORDER BY applied_at")
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .map(|r| r.try_get("name").unwrap_or_default())
        .collect())
}

async fn record_migration(pool: &Pool<MySql>, name: &str) -> Result<(), AppError> {
    sqlx::query("INSERT IGNORE INTO _migrations (name) VALUES (?)")
        .bind(name)
        .execute(pool)
        .await?;
    Ok(())
}

async fn seed_first_admin(pool: &Pool<MySql>) -> Result<(), AppError> {
    // Ensure the first user ever registered is admin
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

const M002_USER_COLUMNS: &str = r#"
ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NULL AFTER site_title;
ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL AFTER display_name;
ALTER TABLE users ADD COLUMN disabled_at TIMESTAMP NULL AFTER role;
ALTER TABLE users ADD COLUMN storage_budget_bytes BIGINT NOT NULL DEFAULT 1073741824 AFTER disabled_at
"#;

const M003_COMPAT_WORKSPACES: &str = r#"
ALTER TABLE workspaces MODIFY COLUMN id CHAR(36) NOT NULL;
ALTER TABLE workspaces ADD COLUMN user_id CHAR(36) NULL AFTER id;
ALTER TABLE workspaces ADD COLUMN owner_user_id CHAR(36) NULL AFTER user_id;
ALTER TABLE workspaces ADD COLUMN slug VARCHAR(255) NULL AFTER name;
ALTER TABLE workspaces ADD COLUMN storage_budget_bytes BIGINT NOT NULL DEFAULT 1073741824 AFTER root_hint
"#;
