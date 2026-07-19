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
        Migration {
            version: 2,
            name: "workspace_folders",
            up: include_str!("../../migrations/0002_workspace_folders.up.sql"),
            down: include_str!("../../migrations/0002_workspace_folders.down.sql"),
        },
        Migration {
            version: 3,
            name: "workspace_sync_clock",
            up: include_str!("../../migrations/0003_workspace_sync_clock.up.sql"),
            down: include_str!("../../migrations/0003_workspace_sync_clock.down.sql"),
        },
        Migration {
            version: 4,
            name: "workspace_owner_invariant",
            up: include_str!("../../migrations/0004_workspace_owner_invariant.up.sql"),
            down: include_str!("../../migrations/0004_workspace_owner_invariant.down.sql"),
        },
        Migration {
            version: 5,
            name: "sites",
            up: include_str!("../../migrations/0005_sites.up.sql"),
            down: include_str!("../../migrations/0005_sites.down.sql"),
        },
        Migration {
            version: 7,
            name: "kanban",
            up: include_str!("../../migrations/0007_kanban.up.sql"),
            down: include_str!("../../migrations/0007_kanban.down.sql"),
        },
        Migration {
            version: 8,
            name: "mcp_oauth",
            up: include_str!("../../migrations/0008_mcp_oauth.up.sql"),
            down: include_str!("../../migrations/0008_mcp_oauth.down.sql"),
        },
        Migration {
            version: 9,
            name: "theme_engine",
            up: include_str!("../../migrations/0009_theme_engine.up.sql"),
            down: include_str!("../../migrations/0009_theme_engine.down.sql"),
        },
        Migration {
            version: 10,
            name: "assets",
            up: include_str!("../../migrations/0010_assets.up.sql"),
            down: include_str!("../../migrations/0010_assets.down.sql"),
        },
        Migration {
            version: 11,
            name: "server_settings",
            up: include_str!("../../migrations/0011_server_settings.up.sql"),
            down: include_str!("../../migrations/0011_server_settings.down.sql"),
        },
        Migration {
            version: 12,
            name: "document_blobs",
            up: include_str!("../../migrations/0012_document_blobs.up.sql"),
            down: include_str!("../../migrations/0012_document_blobs.down.sql"),
        },
        Migration {
            version: 13,
            name: "purge_binary_document_rows",
            up: include_str!("../../migrations/0013_purge_binary_document_rows.up.sql"),
            down: include_str!("../../migrations/0013_purge_binary_document_rows.down.sql"),
        },
        Migration {
            version: 14,
            name: "email_and_password_reset",
            up: include_str!("../../migrations/0014_email_and_password_reset.up.sql"),
            down: include_str!("../../migrations/0014_email_and_password_reset.down.sql"),
        },
        Migration {
            version: 15,
            name: "login_otp",
            up: include_str!("../../migrations/0015_login_otp.up.sql"),
            down: include_str!("../../migrations/0015_login_otp.down.sql"),
        },
        Migration {
            version: 16,
            name: "kanban_comments",
            up: include_str!("../../migrations/0016_kanban_comments.up.sql"),
            down: include_str!("../../migrations/0016_kanban_comments.down.sql"),
        },
        Migration {
            version: 17,
            name: "kanban_webhooks",
            up: include_str!("../../migrations/0017_kanban_webhooks.up.sql"),
            down: include_str!("../../migrations/0017_kanban_webhooks.down.sql"),
        },
        Migration {
            version: 18,
            name: "drop_kanban",
            up: include_str!("../../migrations/0018_drop_kanban.up.sql"),
            down: include_str!("../../migrations/0018_drop_kanban.down.sql"),
        },
        Migration {
            version: 19,
            name: "card_comments",
            up: include_str!("../../migrations/0019_card_comments.up.sql"),
            down: include_str!("../../migrations/0019_card_comments.down.sql"),
        },
        Migration {
            version: 20,
            name: "webhooks",
            up: include_str!("../../migrations/0020_webhooks.up.sql"),
            down: include_str!("../../migrations/0020_webhooks.down.sql"),
        },
        Migration {
            version: 21,
            name: "card_tickets",
            up: include_str!("../../migrations/0021_card_tickets.up.sql"),
            down: include_str!("../../migrations/0021_card_tickets.down.sql"),
        },
        Migration {
            version: 22,
            name: "kanban_event_log",
            up: include_str!("../../migrations/0022_kanban_event_log.up.sql"),
            down: include_str!("../../migrations/0022_kanban_event_log.down.sql"),
        },
        Migration {
            version: 23,
            name: "comment_threads",
            up: include_str!("../../migrations/0023_comment_threads.up.sql"),
            down: include_str!("../../migrations/0023_comment_threads.down.sql"),
        },
        Migration {
            version: 24,
            name: "mobile_document_source",
            up: include_str!("../../migrations/0024_mobile_document_source.up.sql"),
            down: include_str!("../../migrations/0024_mobile_document_source.down.sql"),
        },
        Migration {
            version: 25,
            name: "sync_push_idempotency",
            up: include_str!("../../migrations/0025_sync_push_idempotency.up.sql"),
            down: include_str!("../../migrations/0025_sync_push_idempotency.down.sql"),
        },
        Migration {
            version: 26,
            name: "sync_push_reservation",
            up: include_str!("../../migrations/0026_sync_push_reservation.up.sql"),
            down: include_str!("../../migrations/0026_sync_push_reservation.down.sql"),
        },
        Migration {
            version: 27,
            name: "mobile_push_registrations",
            up: include_str!("../../migrations/0027_mobile_push_registrations.up.sql"),
            down: include_str!("../../migrations/0027_mobile_push_registrations.down.sql"),
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
    let version: Option<i64> = sqlx::query_scalar("SELECT MAX(version) FROM _schema_migrations")
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
/// Skips empty statements and strips full-line SQL comments (`--`).
///
/// Idempotent-tolerant: a "duplicate object" MySQL error (column/index/table/
/// constraint already exists) is treated as success rather than failure. This
/// lets a migration re-apply cleanly when the schema is already ahead of
/// `_schema_migrations` (e.g. a column was added manually, or a prior run
/// crashed mid-file after applying some DDL but before recording the version).
/// MySQL has no `ADD COLUMN IF NOT EXISTS`, and `PREPARE/EXECUTE` workarounds
/// are rejected by sqlx's prepared-statement protocol (error 1295), so the
/// tolerance is implemented here at the executor instead.
async fn exec_sql(pool: &Pool<MySql>, sql: &str) -> Result<(), AppError> {
    // Strip full-line `--` comments BEFORE splitting on `;`. A semicolon inside a
    // comment must not split a statement: otherwise the `--` and the rest of its
    // line land in different chunks, and the comment tail becomes bogus SQL.
    let without_comments: String = sql
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    for statement in without_comments.split(';') {
        let stmt = statement.trim();
        if stmt.is_empty() {
            continue;
        }
        if let Err(e) = sqlx::query(stmt).execute(pool).await {
            if is_duplicate_object_error(&e) {
                // Object already exists — the intended end state for this DDL.
                // Log and continue rather than aborting the migration.
                eprintln!("[migrations] ignoring duplicate-object error (already applied): {e}");
                continue;
            }
            if is_denied_drop(stmt, &e) {
                // A DROP that the DB user has no privilege to run. Cleanup-only
                // migrations (e.g. 0018_drop_kanban) retire now-unused objects; if
                // the app's DB user is intentionally locked down without DROP, the
                // object simply stays — inert, unreferenced by any code — which is
                // strictly better than crash-looping the whole service on startup.
                // Symmetric to the duplicate-object tolerance above: both accept an
                // unreachable-but-harmless end state instead of aborting.
                eprintln!(
                    "[migrations] skipping DROP denied by insufficient privilege \
                     (object left in place, inert): {e}"
                );
                continue;
            }
            return Err(AppError::Server(format!(
                "migration SQL error: {e}\n  statement: {stmt}"
            )));
        }
    }
    Ok(())
}

/// True when a MySQL error means the DDL target already exists, i.e. the
/// statement is idempotently satisfied.
///
/// sqlx surfaces the **SQLSTATE** via `DatabaseError::code()` (not the MySQL
/// native error number, which lives only in the message). The relevant states:
///   `42S01` — base table / view already exists (ER_TABLE_EXISTS_ERROR, 1050)
///   `42S11` — index/key already exists (ER_DUP_KEYNAME, 1061)
///   `42S21` — column already exists (ER_DUP_FIELDNAME, 1060)
/// Foreign-key "already exists" surfaces with varying states, so a message
/// keyword fallback covers it.
fn is_duplicate_object_error(err: &sqlx::Error) -> bool {
    let Some(db_err) = err.as_database_error() else {
        return false;
    };
    let code = db_err.code().map(|c| c.to_string());
    is_duplicate_state_or_message(code.as_deref(), db_err.message())
}

/// Pure core of [`is_duplicate_object_error`], factored out so it can be unit
/// tested without constructing a `sqlx::Error`.
fn is_duplicate_state_or_message(code: Option<&str>, msg: &str) -> bool {
    if code.map(|c| matches!(c, "42S11" | "42S21" | "42S01")).unwrap_or(false) {
        return true;
    }
    let msg = msg.to_ascii_lowercase();
    msg.contains("duplicate foreign key")
        || msg.contains("already exists")
        || msg.contains("duplicate key name")
        || msg.contains("duplicate column")
}

/// True when a statement is a `DROP` that failed purely because the DB user
/// lacks the DROP privilege (MySQL/TiDB error 1142, e.g.
/// "DROP command denied to user 'jtype'@'%' for table 'kanban_...'").
///
/// Used to keep a cleanup-only migration from bricking startup on a database
/// whose app user is deliberately not granted DROP. Scoped tightly on purpose:
/// only statements that begin with `DROP`, and only privilege-denied errors — a
/// DROP that fails for any other reason (FK constraint, unknown object without
/// IF EXISTS, syntax) is NOT swallowed.
///
/// Consequence to be aware of: when the DROP is skipped, the migration is still
/// recorded as applied, so the retired object persists indefinitely. The runner
/// keys on `MAX(version)`, so once any later migration records, this one is never
/// retried even if DROP is granted afterwards — finishing the cleanup then means
/// dropping the object out-of-band (or re-running the SQL manually). That is the
/// accepted trade for not crash-looping a locked-down deployment.
fn is_denied_drop(stmt: &str, err: &sqlx::Error) -> bool {
    let Some(db_err) = err.as_database_error() else {
        return false;
    };
    // Prefer the locale-independent MySQL/TiDB error number over the message text:
    // the message is server-localizable, but 1142 (ER_TABLEACCESS_DENIED_ERROR) is
    // not. Downcast to the driver error to read it; fall back to the message when
    // the concrete type isn't MySQL (keeps the classifier engine-agnostic).
    let number = db_err
        .try_downcast_ref::<sqlx::mysql::MySqlDatabaseError>()
        .map(|e| e.number());
    is_denied_drop_core(stmt, number, db_err.message())
}

/// Pure core of [`is_denied_drop`], factored out for unit testing without a
/// live `sqlx::Error`.
///
/// `number` is the native MySQL error code when available. 1142 is
/// `ER_TABLEACCESS_DENIED_ERROR` ("<cmd> command denied to user ..."), which
/// fires for any denied table command — the `DROP` prefix gate, not the code, is
/// what restricts tolerance to DROP.
fn is_denied_drop_core(stmt: &str, number: Option<u16>, msg: &str) -> bool {
    if !stmt.trim_start().to_ascii_uppercase().starts_with("DROP") {
        return false;
    }
    if number == Some(1142) {
        return true;
    }
    // Fallback for non-MySQL drivers / wrapped errors that don't expose 1142:
    // "command denied" is the 1142 wording, "access denied" the broader phrasing.
    let msg = msg.to_ascii_lowercase();
    msg.contains("command denied") || msg.contains("access denied")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_duplicate_column_state() {
        assert!(is_duplicate_state_or_message(Some("42S21"), "Duplicate column name 'email_verified_at'"));
    }

    #[test]
    fn detects_duplicate_index_state() {
        assert!(is_duplicate_state_or_message(Some("42S11"), "Duplicate key name 'users_email_unique'"));
    }

    #[test]
    fn detects_duplicate_table_state() {
        assert!(is_duplicate_state_or_message(Some("42S01"), "Table 'x' already exists"));
    }

    #[test]
    fn detects_duplicate_fk_by_message_even_without_known_state() {
        assert!(is_duplicate_state_or_message(Some("HY000"), "Duplicate foreign key constraint name 'fk_x'"));
    }

    #[test]
    fn non_duplicate_error_is_not_tolerated() {
        // A syntax error or connection failure must NOT be swallowed.
        assert!(!is_duplicate_state_or_message(Some("42000"), "You have an error in your SQL syntax"));
        assert!(!is_duplicate_state_or_message(None, "connection refused"));
    }

    #[test]
    fn denied_drop_tolerated_by_error_number_even_when_message_is_localized() {
        // The 1142 code is locale-independent: a non-English server message must
        // still be recognized so a localized deployment doesn't crash-loop.
        assert!(is_denied_drop_core(
            "DROP TABLE IF EXISTS kanban_webhook_deliveries",
            Some(1142),
            "用户 'jtype'@'%' 的 DROP 命令被拒绝" // localized, no English keyword
        ));
    }

    #[test]
    fn denied_drop_tolerated_by_message_when_number_absent() {
        // Fallback path: non-MySQL / wrapped error exposes no 1142 code.
        assert!(is_denied_drop_core(
            "\n  drop table foo",
            None,
            "Access denied; you need the DROP privilege"
        ));
    }

    #[test]
    fn denied_non_drop_is_not_tolerated() {
        // 1142 also fires for a denied INSERT/CREATE, but those aren't DROP and
        // are real, fatal problems — the prefix gate must reject them.
        assert!(!is_denied_drop_core(
            "INSERT INTO _schema_migrations VALUES (1, 'x')",
            Some(1142),
            "INSERT command denied to user 'jtype'@'%'"
        ));
        assert!(!is_denied_drop_core(
            "CREATE TABLE foo (id INT)",
            Some(1142),
            "CREATE command denied to user 'jtype'@'%'"
        ));
    }

    #[test]
    fn drop_failing_for_other_reasons_is_not_tolerated() {
        // A DROP blocked by a FK constraint (not a privilege problem, not 1142)
        // must still surface — swallowing it would silently leave a broken schema.
        assert!(!is_denied_drop_core(
            "DROP TABLE parent",
            Some(1451),
            "Cannot delete or update a parent row: a foreign key constraint fails"
        ));
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Apply all pending UP migrations (like `migrate up`).
///
/// Serializes concurrent callers via a MySQL named lock so that multiple
/// processes (or parallel integration tests, each with its own pool, sharing
/// one database) apply the schema exactly once instead of racing on DDL
/// ("Duplicate column" / "table already exists"). The lock is held on a single
/// dedicated connection for the whole pass; everyone else waits, then sees the
/// schema already current and skips.
pub async fn run_all(pool: &Pool<MySql>) -> Result<(), AppError> {
    let mut lock_conn = pool.acquire().await?;
    let acquired: Option<i64> = sqlx::query_scalar("SELECT GET_LOCK('jtype_migrations', 60)")
        .fetch_one(&mut *lock_conn)
        .await?;
    if acquired != Some(1) {
        return Err(AppError::Server(
            "timed out acquiring migration lock 'jtype_migrations'".into(),
        ));
    }

    let result = run_all_locked(pool).await;

    // Best-effort release; dropping the connection also frees the lock.
    let _ = sqlx::query("SELECT RELEASE_LOCK('jtype_migrations')")
        .execute(&mut *lock_conn)
        .await;
    result
}

async fn run_all_locked(pool: &Pool<MySql>) -> Result<(), AppError> {
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
    seed_missing_workspace_owners(pool).await?;

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
        .ok_or_else(|| AppError::Server(format!("no migration found for current version {cur}")))?;

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

async fn seed_missing_workspace_owners(pool: &Pool<MySql>) -> Result<(), AppError> {
    sqlx::query(
        r#"UPDATE workspace_members wm
           JOIN (
             SELECT workspace_id, user_id
             FROM (
               SELECT
                 wm.workspace_id,
                 wm.user_id,
                 ROW_NUMBER() OVER (
                   PARTITION BY wm.workspace_id
                   ORDER BY
                     CASE WHEN wm.user_id = w.owner_user_id THEN 0 ELSE 1 END,
                     wm.joined_at,
                     wm.created_at,
                     wm.user_id
                 ) AS rn
               FROM workspace_members wm
               JOIN workspaces w ON w.id = wm.workspace_id
               WHERE wm.status = 'active'
                 AND wm.role = 'admin'
                 AND NOT EXISTS (
                   SELECT 1
                   FROM workspace_members owner_member
                   WHERE owner_member.workspace_id = wm.workspace_id
                     AND owner_member.status = 'active'
                     AND owner_member.role = 'owner'
                 )
             ) ranked_admins
             WHERE rn = 1
           ) promoted ON promoted.workspace_id = wm.workspace_id AND promoted.user_id = wm.user_id
           SET wm.role = 'owner'"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"UPDATE workspaces w
           JOIN workspace_members wm ON wm.workspace_id = w.id
           SET w.owner_user_id = wm.user_id
           WHERE wm.status = 'active'
             AND wm.role = 'owner'
             AND (w.owner_user_id IS NULL OR w.owner_user_id <> wm.user_id)"#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
