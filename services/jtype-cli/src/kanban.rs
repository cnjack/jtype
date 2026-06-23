//! Local-first kanban: `board`/`card` commands over the vault's `.board` view
//! files and `.md` card-notes. Reads scan the vault directly (offline-capable);
//! writes update the `.md` frontmatter and write-through to the bound cloud
//! workspace — exactly like the `note` commands. The cloud DB kanban is gone; a
//! board is just files, so this is built entirely on `jtype-core`.

use std::path::Path;

use anyhow::{anyhow, Context, Result};
use serde_json::json;

use crate::config::Config;
use crate::notes;
use crate::print::emit;

pub fn list_boards_local(vault_root: &Path, json: bool) -> Result<()> {
    let boards = jtype_core::list_boards(vault_root).map_err(|e| anyhow!(e))?;
    if json {
        emit(true, &serde_json::to_value(&boards)?);
    } else if boards.is_empty() {
        println!("(no boards — create a .board file)");
    } else {
        for b in &boards {
            println!("{}\t{}\t[{}]", b.id, b.title, b.relative_path);
        }
    }
    Ok(())
}

pub fn show_board_local(vault_root: &Path, board: &str, json: bool) -> Result<()> {
    let boards = jtype_core::list_boards(vault_root).map_err(|e| anyhow!(e))?;
    let cfg = boards
        .iter()
        .find(|b| b.id == board)
        .ok_or_else(|| anyhow!("no board with id '{board}' (try `jtype board list`)"))?;
    let cards = jtype_core::scan_board_cards(vault_root, board).map_err(|e| anyhow!(e))?;
    if json {
        emit(true, &json!({ "board": cfg, "cards": cards }));
        return Ok(());
    }
    println!("{} ({})", cfg.title, cfg.id);
    for col in &cfg.columns {
        let in_col: Vec<_> = cards.iter().filter(|c| c.status == col.key).collect();
        println!("\n  {} ({})", col.name, in_col.len());
        for c in in_col {
            println!("    - {}\t[{}]", c.title, c.relative_path);
        }
    }
    Ok(())
}

pub fn list_cards_local(vault_root: &Path, board: &str, status: Option<&str>, json: bool) -> Result<()> {
    let mut cards = jtype_core::scan_board_cards(vault_root, board).map_err(|e| anyhow!(e))?;
    if let Some(s) = status {
        cards.retain(|c| c.status == s);
    }
    if json {
        emit(true, &serde_json::to_value(&cards)?);
    } else if cards.is_empty() {
        println!("(no cards)");
    } else {
        for c in &cards {
            println!("[{}]\t{}\t{}", c.status, c.title, c.relative_path);
        }
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn create_card_local(
    vault_root: &Path,
    cfg: &Config,
    workspace: Option<&str>,
    board: &str,
    status: &str,
    title: &str,
    priority: Option<&str>,
    assignee: Option<&str>,
    due: Option<&str>,
    json: bool,
) -> Result<()> {
    let boards = jtype_core::list_boards(vault_root).map_err(|e| anyhow!(e))?;
    let b = boards
        .iter()
        .find(|b| b.id == board)
        .ok_or_else(|| anyhow!("no board with id '{board}' (try `jtype board list`)"))?;
    // Cards live in the folder sibling to `<name>.board` (strip the extension).
    let dir = b.relative_path.strip_suffix(".board").unwrap_or(&b.relative_path);
    // Append to the end of the target column: max position there + 1.
    let existing = jtype_core::scan_board_cards(vault_root, board).map_err(|e| anyhow!(e))?;
    let next_pos = existing
        .iter()
        .filter(|c| c.status == status)
        .map(|c| c.position)
        .max()
        .map(|m| m + 1)
        .unwrap_or(0);
    let rel = format!("{dir}/{}.md", slugify(title));
    let content = build_card_content(board, status, next_pos, title, priority, assignee, due);
    notes::save_note_local(vault_root, cfg, workspace, &rel, &content, Some(title), json).await
}

pub async fn move_card_local(
    vault_root: &Path,
    cfg: &Config,
    workspace: Option<&str>,
    path: &str,
    to: &str,
    position: Option<i64>,
    json: bool,
) -> Result<()> {
    let rel = notes::normalize_note_rel(path);
    let target = jtype_core::safe_join(vault_root, &rel).map_err(|e| anyhow!(e))?;
    let content = std::fs::read_to_string(&target).with_context(|| format!("reading {}", target.display()))?;
    let mut updated = jtype_core::set_frontmatter_field(&content, "status", Some(to));
    if let Some(p) = position {
        updated = jtype_core::set_frontmatter_field(&updated, "position", Some(&p.to_string()));
    }
    notes::save_note_local(vault_root, cfg, workspace, &rel, &updated, None, json).await
}

#[allow(clippy::too_many_arguments)]
pub async fn set_card_local(
    vault_root: &Path,
    cfg: &Config,
    workspace: Option<&str>,
    path: &str,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
    due: Option<&str>,
    json: bool,
) -> Result<()> {
    let rel = notes::normalize_note_rel(path);
    let target = jtype_core::safe_join(vault_root, &rel).map_err(|e| anyhow!(e))?;
    let mut content = std::fs::read_to_string(&target).with_context(|| format!("reading {}", target.display()))?;
    let mut touched = false;
    for (key, val) in [
        ("status", status),
        ("priority", priority),
        ("assignee", assignee),
        ("due", due),
    ] {
        if let Some(v) = val {
            // An explicit empty string clears the field (removes it).
            let set = if v.is_empty() { None } else { Some(v) };
            content = jtype_core::set_frontmatter_field(&content, key, set);
            touched = true;
        }
    }
    if !touched {
        return Err(anyhow!("set: provide at least one field (--status/--priority/--assignee/--due)"));
    }
    notes::save_note_local(vault_root, cfg, workspace, &rel, &content, None, json).await
}

fn build_card_content(
    board: &str,
    status: &str,
    position: i64,
    title: &str,
    priority: Option<&str>,
    assignee: Option<&str>,
    due: Option<&str>,
) -> String {
    let body = format!("# {title}\n");
    let mut c = jtype_core::set_frontmatter_field(&body, "board", Some(board));
    c = jtype_core::set_frontmatter_field(&c, "status", Some(status));
    c = jtype_core::set_frontmatter_field(&c, "position", Some(&position.to_string()));
    if let Some(p) = priority {
        c = jtype_core::set_frontmatter_field(&c, "priority", Some(p));
    }
    if let Some(a) = assignee {
        c = jtype_core::set_frontmatter_field(&c, "assignee", Some(a));
    }
    if let Some(d) = due {
        c = jtype_core::set_frontmatter_field(&c, "due", Some(d));
    }
    c
}

/// Filename slug from a card title: alphanumerics kept (lowercased), everything
/// else collapsed to single hyphens.
fn slugify(title: &str) -> String {
    let mapped: String = title
        .chars()
        .map(|ch| if ch.is_alphanumeric() { ch.to_ascii_lowercase() } else { '-' })
        .collect();
    let collapsed = mapped.split('-').filter(|p| !p.is_empty()).collect::<Vec<_>>().join("-");
    if collapsed.is_empty() {
        "card".to_string()
    } else {
        collapsed
    }
}
