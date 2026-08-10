//! Durable board-membership projection for Markdown Cards.
//!
//! Card Markdown remains authoritative. This table only materializes the exact
//! `board` frontmatter value so board reads do not scan and parse every document
//! in a cloud workspace. All normal mutations update it in the same transaction
//! as `documents`; the rollout migration calls [`backfill_with_watermarks`] for
//! existing rows.
//! A workspace-clock watermark bridges old instances during a rolling deploy:
//! legacy writers already advance `workspaces.sync_clock`; a board read repairs
//! documents newer than its projection watermark before returning.

use std::time::Duration;

use sqlx::{MySql, Row, Transaction};

use crate::error::AppError;

const BACKFILL_BATCH_SIZE: i64 = 250;
const MAX_LOCK_RETRY_ATTEMPTS: usize = 4;
const LOCK_RETRY_BACKOFF_MS: [u64; MAX_LOCK_RETRY_ATTEMPTS - 1] = [8, 16, 32];

fn mysql_error_number(error: &AppError) -> Option<u16> {
    let AppError::Database(error) = error else {
        return None;
    };
    error
        .as_database_error()?
        .try_downcast_ref::<sqlx::mysql::MySqlDatabaseError>()
        .map(|error| error.number())
}

fn retry_limit_for_lock_error(error: &AppError) -> Option<usize> {
    retry_limit_for_mysql_lock_number(mysql_error_number(error))
}

fn retry_limit_for_mysql_lock_number(number: Option<u16>) -> Option<usize> {
    match number {
        // ER_LOCK_WAIT_TIMEOUT may already have waited for the server's full
        // configured timeout, so allow only one additional attempt.
        Some(1205) => Some(2),
        // ER_LOCK_DEADLOCK and ER_LOCK_NOWAIT return promptly.
        Some(1213 | 3572) => Some(MAX_LOCK_RETRY_ATTEMPTS),
        _ => None,
    }
}

/// Return the logical board id for a Markdown Card.
///
/// This intentionally uses the canonical parser. Non-Markdown synchronized
/// documents (including `.board` view files) never become Card members even if
/// their opaque content happens to contain a `board:` line.
pub fn board_ref(relative_path: &str, content: &str) -> Option<String> {
    if !relative_path.to_ascii_lowercase().ends_with(".md") {
        return None;
    }
    jtype_core::parse_frontmatter(content)
        .get("board")
        .map(String::as_str)
        .map(str::trim)
        .filter(|board| !board.is_empty())
        .map(str::to_string)
}

/// Replace one document's projection inside its document-write transaction.
pub async fn sync_document(
    tx: &mut Transaction<'_, MySql>,
    workspace_id: &str,
    document_id: &str,
    relative_path: &str,
    content: &str,
) -> Result<(), AppError> {
    replace_projection(tx, workspace_id, document_id, relative_path, content).await?;
    Ok(())
}

async fn replace_projection(
    tx: &mut Transaction<'_, MySql>,
    workspace_id: &str,
    document_id: &str,
    relative_path: &str,
    content: &str,
) -> Result<(), AppError> {
    if let Some(board_ref) = board_ref(relative_path, content) {
        sqlx::query(
            r#"INSERT INTO board_document_memberships (workspace_id, document_id, board_ref)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE board_ref = VALUES(board_ref), updated_at = CURRENT_TIMESTAMP"#,
        )
        .bind(workspace_id)
        .bind(document_id)
        .bind(board_ref)
        .execute(&mut **tx)
        .await?;
    } else {
        sqlx::query(
            "DELETE FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
        )
        .bind(workspace_id)
        .bind(document_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

/// Remove one active projection. The FK cascade is a final safety net for any
/// future document-delete path, but current delete/trash flows call this before
/// deleting the document so consistency is explicit and transactional.
pub async fn remove_document(
    tx: &mut Transaction<'_, MySql>,
    workspace_id: &str,
    document_id: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "DELETE FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(workspace_id)
    .bind(document_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Repair legacy writes newer than the projection watermark before serving a
/// board read.
///
/// Current writers take `next_workspace_clock` before the document row. Legacy
/// delete paths may take those locks in reverse, but they still advance the clock
/// before commit. A committed legacy write is therefore either included below or
/// has a higher clock for the next read; an in-flight lock inversion is handled by
/// the bounded whole-transaction retry around this function.
pub async fn reconcile_workspace(
    pool: &sqlx::Pool<MySql>,
    workspace_id: &str,
) -> Result<u64, AppError> {
    for attempt in 1..=MAX_LOCK_RETRY_ATTEMPTS {
        match reconcile_workspace_once(pool, workspace_id).await {
            Ok(repaired) => return Ok(repaired),
            Err(error) => {
                if let Some(max_attempts) = retry_limit_for_lock_error(&error) {
                    if attempt < max_attempts {
                        let delay_ms = LOCK_RETRY_BACKOFF_MS[attempt - 1];
                        eprintln!(
                            "[board-membership] workspace {workspace_id} reconciliation hit MySQL lock error {} (attempt {attempt}/{max_attempts}); retrying whole transaction in {delay_ms}ms",
                            mysql_error_number(&error).unwrap_or_default()
                        );
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    }
                    eprintln!(
                        "[board-membership] workspace {workspace_id} reconciliation exhausted {max_attempts} attempts after MySQL lock error {}; returning the original database error",
                        mysql_error_number(&error).unwrap_or_default()
                    );
                }
                return Err(error);
            }
        }
    }
    unreachable!("bounded reconciliation retry loop always returns")
}

async fn reconcile_workspace_once(
    pool: &sqlx::Pool<MySql>,
    workspace_id: &str,
) -> Result<u64, AppError> {
    let mut tx = pool.begin().await?;
    let target_clock: i64 =
        sqlx::query_scalar("SELECT sync_clock FROM workspaces WHERE id = ? FOR UPDATE")
            .bind(workspace_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(AppError::NotFound)?;
    let reconciled_clock: Option<i64> = sqlx::query_scalar(
        "SELECT reconciled_clock FROM board_membership_projection_state WHERE workspace_id = ? FOR UPDATE",
    )
    .bind(workspace_id)
    .fetch_optional(&mut *tx)
    .await?;
    let full_rebuild = reconciled_clock.is_none();
    let lower_clock = reconciled_clock.unwrap_or(0).min(target_clock);
    let mut repaired = 0_u64;
    let mut after_clock = if full_rebuild { -1 } else { lower_clock };
    let mut after_id = String::new();
    loop {
        let rows = sqlx::query(
            r#"SELECT id, relative_path, content, updated_clock
               FROM documents
               WHERE workspace_id = ?
                 AND updated_clock <= ?
                 AND (? OR updated_clock > ?)
                 AND (updated_clock > ? OR (updated_clock = ? AND id > ?))
               ORDER BY updated_clock, id
               LIMIT ?
               FOR UPDATE NOWAIT"#,
        )
        .bind(workspace_id)
        .bind(target_clock)
        .bind(full_rebuild)
        .bind(lower_clock)
        .bind(after_clock)
        .bind(after_clock)
        .bind(&after_id)
        .bind(BACKFILL_BATCH_SIZE)
        .fetch_all(&mut *tx)
        .await?;

        if rows.is_empty() {
            break;
        }

        for row in rows {
            let document_id: String = row.try_get("id")?;
            let relative_path: String = row.try_get("relative_path")?;
            let content: String = row.try_get("content")?;
            after_clock = row.try_get("updated_clock")?;
            after_id.clone_from(&document_id);
            replace_projection(
                &mut tx,
                workspace_id,
                &document_id,
                &relative_path,
                &content,
            )
            .await?;
            repaired += 1;
        }
    }

    sqlx::query(
        r#"INSERT INTO board_membership_projection_state (workspace_id, reconciled_clock)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE
             reconciled_clock = VALUES(reconciled_clock),
             reconciled_at = CURRENT_TIMESTAMP"#,
    )
    .bind(workspace_id)
    .bind(target_clock)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(repaired)
}

/// Perform the initial rebuild under the per-workspace clock every accepted
/// document write advances before commit, then persist an exact cursor.
///
/// This is the rollout-safe 0031 backfill. An old instance may write before the
/// lock (the rebuild sees it) or after commit (its higher `updated_clock` is
/// repaired by [`reconcile_workspace`]), but it cannot commit an undetectable
/// membership change between the rebuilt snapshot and its watermark.
pub async fn backfill_with_watermarks(pool: &sqlx::Pool<MySql>) -> Result<u64, AppError> {
    let workspace_ids: Vec<String> = sqlx::query_scalar("SELECT id FROM workspaces ORDER BY id")
        .fetch_all(pool)
        .await?;
    let mut projected = 0_u64;

    for workspace_id in workspace_ids {
        for attempt in 1..=MAX_LOCK_RETRY_ATTEMPTS {
            match backfill_workspace_once(pool, &workspace_id).await {
                Ok(workspace_projected) => {
                    projected += workspace_projected;
                    break;
                }
                Err(error) => {
                    if let Some(max_attempts) = retry_limit_for_lock_error(&error) {
                        if attempt < max_attempts {
                            let delay_ms = LOCK_RETRY_BACKOFF_MS[attempt - 1];
                            eprintln!(
                                "[migrations] board membership backfill for workspace {workspace_id} hit MySQL lock error {} (attempt {attempt}/{max_attempts}); retrying whole transaction in {delay_ms}ms",
                                mysql_error_number(&error).unwrap_or_default()
                            );
                            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                            continue;
                        }
                        eprintln!(
                            "[migrations] board membership backfill for workspace {workspace_id} exhausted {max_attempts} attempts after MySQL lock error {}; returning the original database error",
                            mysql_error_number(&error).unwrap_or_default()
                        );
                    }
                    return Err(error);
                }
            }
        }
    }

    Ok(projected)
}

async fn backfill_workspace_once(
    pool: &sqlx::Pool<MySql>,
    workspace_id: &str,
) -> Result<u64, AppError> {
    let mut tx = pool.begin().await?;
    let Some(target_clock) =
        sqlx::query_scalar::<_, i64>("SELECT sync_clock FROM workspaces WHERE id = ? FOR UPDATE")
            .bind(workspace_id)
            .fetch_optional(&mut *tx)
            .await?
    else {
        tx.rollback().await?;
        return Ok(0);
    };

    let mut after_id = String::new();
    let mut projected = 0_u64;
    loop {
        let rows = sqlx::query(
            r#"SELECT id, relative_path, content
               FROM documents
               WHERE workspace_id = ? AND id > ?
               ORDER BY id
               LIMIT ?
               FOR UPDATE NOWAIT"#,
        )
        .bind(workspace_id)
        .bind(&after_id)
        .bind(BACKFILL_BATCH_SIZE)
        .fetch_all(&mut *tx)
        .await?;
        if rows.is_empty() {
            break;
        }
        for row in rows {
            let document_id: String = row.try_get("id")?;
            let relative_path: String = row.try_get("relative_path")?;
            let content: String = row.try_get("content")?;
            after_id.clone_from(&document_id);
            if board_ref(&relative_path, &content).is_some() {
                projected += 1;
            }
            replace_projection(
                &mut tx,
                workspace_id,
                &document_id,
                &relative_path,
                &content,
            )
            .await?;
        }
    }

    sqlx::query(
        r#"INSERT INTO board_membership_projection_state (workspace_id, reconciled_clock)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE
             reconciled_clock = VALUES(reconciled_clock),
             reconciled_at = CURRENT_TIMESTAMP"#,
    )
    .bind(workspace_id)
    .bind(target_clock)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(projected)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_trimmed_exact_board_from_markdown_only() {
        let markdown = "---\r\ntitle: Card\r\nboard: 'Delivery Board'\r\n---\r\n";
        assert_eq!(
            board_ref("cards/card.MD", markdown).as_deref(),
            Some("Delivery Board")
        );
        assert_eq!(board_ref("views/card.board", markdown), None);
        assert_eq!(board_ref("cards/card.md", "# no frontmatter"), None);
        assert_eq!(board_ref("cards/card.md", "---\nboard: '  '\n---"), None);
    }

    #[test]
    fn assigns_bounded_retries_only_to_supported_mysql_lock_errors() {
        assert_eq!(retry_limit_for_mysql_lock_number(Some(1205)), Some(2));
        assert_eq!(
            retry_limit_for_mysql_lock_number(Some(1213)),
            Some(MAX_LOCK_RETRY_ATTEMPTS)
        );
        assert_eq!(
            retry_limit_for_mysql_lock_number(Some(3572)),
            Some(MAX_LOCK_RETRY_ATTEMPTS)
        );
        assert_eq!(retry_limit_for_mysql_lock_number(Some(1062)), None);
        assert_eq!(retry_limit_for_mysql_lock_number(None), None);
    }
}
