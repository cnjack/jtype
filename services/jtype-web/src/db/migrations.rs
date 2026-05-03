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
        ("004_workspace_publish_settings", M004_WORKSPACE_PUBLISH_SETTINGS),
        ("005_conflict_ranges_and_trash", M005_CONFLICT_RANGES_AND_TRASH),
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
        if *name == "004_workspace_publish_settings" {
            apply_workspace_publish_settings_migration(pool).await?;
            record_migration(pool, name).await?;
            continue;
        }
        if *name == "005_conflict_ranges_and_trash" {
            apply_conflict_ranges_and_trash_migration(pool).await?;
            record_migration(pool, name).await?;
            continue;
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

async fn column_exists(pool: &Pool<MySql>, table: &str, column: &str) -> Result<bool, AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    )
    .bind(table)
    .bind(column)
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

async fn constraint_exists(pool: &Pool<MySql>, constraint: &str) -> Result<bool, AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?",
    )
    .bind(constraint)
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

async fn apply_workspace_publish_settings_migration(pool: &Pool<MySql>) -> Result<(), AppError> {
    if !column_exists(pool, "workspaces", "publish_title").await? {
        sqlx::query("ALTER TABLE workspaces ADD COLUMN publish_title VARCHAR(255) NULL AFTER slug")
            .execute(pool)
            .await?;
    }
    sqlx::query("UPDATE workspaces SET publish_title = name WHERE publish_title IS NULL")
        .execute(pool)
        .await?;

    if !column_exists(pool, "custom_domains", "workspace_id").await? {
        sqlx::query("ALTER TABLE custom_domains ADD COLUMN workspace_id CHAR(36) NULL AFTER user_id")
            .execute(pool)
            .await?;
    }
    if !constraint_exists(pool, "custom_domains_workspace_id_fk").await? {
        sqlx::query(
            "ALTER TABLE custom_domains ADD CONSTRAINT custom_domains_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL",
        )
        .execute(pool)
        .await?;
    }
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

const M004_WORKSPACE_PUBLISH_SETTINGS: &str = r#"
ALTER TABLE workspaces ADD COLUMN publish_title VARCHAR(255) NULL AFTER slug;
UPDATE workspaces SET publish_title = name WHERE publish_title IS NULL;
ALTER TABLE custom_domains ADD COLUMN workspace_id CHAR(36) NULL AFTER user_id;
ALTER TABLE custom_domains ADD CONSTRAINT custom_domains_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
"#;

const M005_CONFLICT_RANGES_AND_TRASH: &str = "-- applied programmatically in apply_conflict_ranges_and_trash_migration";

async fn apply_conflict_ranges_and_trash_migration(pool: &Pool<MySql>) -> Result<(), AppError> {
    if !column_exists(pool, "sync_conflicts", "conflict_ranges").await? {
        sqlx::query("ALTER TABLE sync_conflicts ADD COLUMN conflict_ranges JSON NULL AFTER cloud_content")
            .execute(pool)
            .await?;
    }

    let table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'document_trash'",
    )
    .fetch_one(pool)
    .await?;
    if table_count == 0 {
        sqlx::query(
            r#"CREATE TABLE IF NOT EXISTS document_trash (
                id CHAR(36) PRIMARY KEY,
                workspace_id CHAR(36) NOT NULL,
                document_id CHAR(36) NOT NULL,
                relative_path VARCHAR(512) NOT NULL,
                title VARCHAR(512) NOT NULL,
                content MEDIUMTEXT NOT NULL,
                content_hash CHAR(64) NOT NULL,
                version_id CHAR(36) NULL,
                deleted_by_user_id CHAR(36) NOT NULL,
                deleted_by_device_id VARCHAR(128) NULL,
                deleted_clock BIGINT NOT NULL DEFAULT 0,
                deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                restored_at TIMESTAMP NULL,
                CONSTRAINT document_trash_workspace_id_fk
                    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )"#,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}
