use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use pulldown_cmark::{html, Options, Parser};
use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha256};

use crate::error::AppError;

pub fn sha256_hex(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

pub fn random_token() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

pub fn short_user_code() -> String {
    let mut bytes = [0_u8; 4];
    OsRng.fill_bytes(&mut bytes);
    let value = u32::from_le_bytes(bytes) % 1_000_000;
    format!("{:06}", value)
}

pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|_| AppError::Password)
}

pub fn verify_password(password: &str, password_hash: &str) -> Result<(), AppError> {
    let parsed = PasswordHash::new(password_hash).map_err(|_| AppError::Password)?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| AppError::Unauthorized)
}

pub fn normalize_username(username: &str) -> Result<String, AppError> {
    let username = username.trim().to_ascii_lowercase();
    if username.len() < 3
        || username.len() > 80
        || !username
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(AppError::BadRequest(
            "username must be 3-80 chars: a-z, 0-9, - or _".to_string(),
        ));
    }
    Ok(username)
}

pub fn validate_password(password: &str) -> Result<(), AppError> {
    if password.len() < 6 {
        return Err(AppError::BadRequest(
            "password must be at least 6 characters".to_string(),
        ));
    }
    Ok(())
}

pub fn normalize_workspace_name(name: &str) -> Result<String, AppError> {
    let name = name.trim();
    if name.is_empty() || name.len() > 160 {
        return Err(AppError::BadRequest(
            "workspace name must be 1-160 characters".to_string(),
        ));
    }
    Ok(name.to_string())
}

pub fn normalize_invite_role(role: Option<&str>) -> Result<&'static str, AppError> {
    match role
        .unwrap_or("editor")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "admin" => Ok("admin"),
        "editor" => Ok("editor"),
        "viewer" => Ok("viewer"),
        _ => Err(AppError::BadRequest(
            "invite role must be admin, editor, or viewer".to_string(),
        )),
    }
}

pub fn normalize_relative_markdown_path(path: &str) -> Result<String, AppError> {
    let normalized = path.trim().replace('\\', "/");
    if normalized.is_empty()
        || normalized.starts_with('/')
        || normalized.contains("../")
        || normalized == ".."
        || !is_markdown_path(&normalized)
    {
        return Err(AppError::BadRequest(
            "relative Markdown path is required".to_string(),
        ));
    }
    Ok(normalized)
}

pub fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;
    for ch in value.trim().to_ascii_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            previous_dash = false;
        } else if !previous_dash {
            slug.push('-');
            previous_dash = true;
        }
    }
    let slug = slug.trim_matches('-').to_string();
    if slug.is_empty() {
        "workspace".to_string()
    } else {
        slug
    }
}

pub fn is_markdown_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.ends_with(".md")
        || lower.ends_with(".markdown")
        || lower.ends_with(".mdown")
        || lower.ends_with(".mkd")
}

pub fn normalize_status(status: &str, content: &str) -> &'static str {
    let frontmatter = parse_frontmatter(content);
    if status.eq_ignore_ascii_case("draft")
        || frontmatter
            .get("status")
            .map(|v| v.eq_ignore_ascii_case("draft"))
            .unwrap_or(false)
        || frontmatter
            .get("publish")
            .map(|v| v.eq_ignore_ascii_case("false"))
            .unwrap_or(false)
    {
        "draft"
    } else {
        "published"
    }
}

pub fn extract_title(content: &str) -> Option<String> {
    parse_frontmatter(content)
        .get("title")
        .cloned()
        .or_else(|| {
            content.lines().find_map(|line| {
                line.strip_prefix("# ")
                    .map(str::trim)
                    .filter(|v| !v.is_empty())
                    .map(str::to_string)
            })
        })
}

pub fn markdown_to_html(content: &str) -> String {
    let frontmatter = parse_frontmatter(content);
    let body = if !frontmatter.is_empty() {
        // Strip the frontmatter block from content
        let normalized = content.replace("\r\n", "\n");
        if let Some(end) = normalized.find("\n---") {
            normalized.split_at(end + 4).1.trim_start().to_string()
        } else {
            content.to_string()
        }
    } else {
        content.to_string()
    };
    let title = frontmatter.get("title").cloned().unwrap_or_default();
    let markdown_input = if !title.is_empty() {
        format!("# {}\n\n{}", title, body)
    } else {
        body
    };
    let parser = Parser::new_ext(&markdown_input, Options::all());
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

pub fn site_url(public_base_url: &str, username: &str) -> String {
    format!("{}/u/{}", public_base_url.trim_end_matches('/'), username)
}

pub fn workspace_site_url(public_base_url: &str, username: &str, workspace_slug: &str) -> String {
    format!(
        "{}/u/{}/{}",
        public_base_url.trim_end_matches('/'),
        username,
        workspace_slug
    )
}

pub fn conflict_sibling_path(relative_path: &str) -> String {
    if let Some(stem) = relative_path.strip_suffix(".md") {
        format!("{} local conflict.md", stem)
    } else {
        format!("{} local conflict", relative_path)
    }
}

fn parse_frontmatter(content: &str) -> std::collections::HashMap<String, String> {
    let mut frontmatter = std::collections::HashMap::new();
    let mut lines = content.lines();
    if lines.next() != Some("---") {
        return frontmatter;
    }
    for line in lines {
        if line == "---" {
            break;
        }
        if let Some((key, value)) = line.split_once(':') {
            frontmatter.insert(
                key.trim().to_string(),
                value
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string(),
            );
        }
    }
    frontmatter
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictRange {
    pub base_start: usize,
    pub base_end: usize,
    pub local_lines: Vec<String>,
    pub cloud_lines: Vec<String>,
}

pub enum MergeResult {
    Merged(String),
    Conflict { conflict_ranges: Vec<ConflictRange> },
}

pub fn smart_three_way_merge(base: &str, local: &str, cloud: &str) -> MergeResult {
    if local == cloud {
        return MergeResult::Merged(local.to_string());
    }
    if base == cloud {
        return MergeResult::Merged(local.to_string());
    }
    if base == local {
        return MergeResult::Merged(cloud.to_string());
    }

    let base_lines: Vec<&str> = if base.is_empty() {
        vec![]
    } else {
        base.lines().collect()
    };
    let local_hunks = compute_hunks(base, local);
    let cloud_hunks = compute_hunks(base, cloud);

    let mut conflict_ranges: Vec<ConflictRange> = Vec::new();
    let mut merged_hunks: Vec<(usize, usize, Vec<String>)> = Vec::new();

    let mut li = 0;
    let mut ci = 0;
    while li < local_hunks.len() || ci < cloud_hunks.len() {
        let lh = if li < local_hunks.len() {
            Some(&local_hunks[li])
        } else {
            None
        };
        let ch = if ci < cloud_hunks.len() {
            Some(&cloud_hunks[ci])
        } else {
            None
        };

        match (lh, ch) {
            (Some(l), None) => {
                merged_hunks.push((l.base_start, l.base_end, l.replacement.clone()));
                li += 1;
            }
            (None, Some(c)) => {
                merged_hunks.push((c.base_start, c.base_end, c.replacement.clone()));
                ci += 1;
            }
            (Some(l), Some(c)) => {
                let overlap = l.base_start < c.base_end && c.base_start < l.base_end
                    || (l.base_start == l.base_end
                        && c.base_start == c.base_end
                        && l.base_start == c.base_start);
                if !overlap {
                    if l.base_start <= c.base_start {
                        merged_hunks.push((l.base_start, l.base_end, l.replacement.clone()));
                        li += 1;
                    } else {
                        merged_hunks.push((c.base_start, c.base_end, c.replacement.clone()));
                        ci += 1;
                    }
                } else if l.replacement == c.replacement {
                    merged_hunks.push((
                        l.base_start.min(c.base_start),
                        l.base_end.max(c.base_end),
                        l.replacement.clone(),
                    ));
                    li += 1;
                    ci += 1;
                } else {
                    let base_start = l.base_start.min(c.base_start);
                    let base_end = l.base_end.max(c.base_end);
                    conflict_ranges.push(ConflictRange {
                        base_start,
                        base_end,
                        local_lines: l.replacement.clone(),
                        cloud_lines: c.replacement.clone(),
                    });
                    merged_hunks.push((base_start, base_end, c.replacement.clone()));
                    li += 1;
                    ci += 1;
                }
            }
            _ => unreachable!(),
        }
    }

    if conflict_ranges.is_empty() {
        let result = apply_hunks(&base_lines, &merged_hunks);
        MergeResult::Merged(result)
    } else {
        MergeResult::Conflict { conflict_ranges }
    }
}

#[derive(Debug)]
struct Hunk {
    base_start: usize,
    base_end: usize,
    replacement: Vec<String>,
}

fn compute_hunks(base: &str, revised: &str) -> Vec<Hunk> {
    use similar::TextDiff;

    let diff = TextDiff::from_lines(base, revised);
    let mut hunks: Vec<Hunk> = Vec::new();
    let mut cur_start: Option<usize> = None;
    let mut cur_end: usize = 0;
    let mut cur_repl: Vec<String> = Vec::new();

    for change in diff.iter_all_changes() {
        use similar::ChangeTag;
        match change.tag() {
            ChangeTag::Equal => {
                if cur_start.is_some() {
                    hunks.push(Hunk {
                        base_start: cur_start.unwrap(),
                        base_end: cur_end,
                        replacement: cur_repl.clone(),
                    });
                    cur_start = None;
                    cur_repl.clear();
                }
                cur_end += 1;
            }
            ChangeTag::Delete => {
                if cur_start.is_none() {
                    cur_start = Some(cur_end);
                }
                cur_end += 1;
            }
            ChangeTag::Insert => {
                if cur_start.is_none() {
                    cur_start = Some(cur_end);
                }
                cur_repl.push(change.to_string_lossy().trim_end_matches('\n').to_string());
            }
        }
    }
    if cur_start.is_some() {
        hunks.push(Hunk {
            base_start: cur_start.unwrap(),
            base_end: cur_end,
            replacement: cur_repl,
        });
    }
    hunks
}

fn apply_hunks(base_lines: &[&str], hunks: &[(usize, usize, Vec<String>)]) -> String {
    let mut result: Vec<String> = Vec::new();
    let mut pos = 0;
    for &(start, end, ref repl) in hunks {
        while pos < start && pos < base_lines.len() {
            result.push(base_lines[pos].to_string());
            pos += 1;
        }
        if pos < end {
            pos = end;
        }
        result.extend(repl.iter().cloned());
    }
    while pos < base_lines.len() {
        result.push(base_lines[pos].to_string());
        pos += 1;
    }
    result.join("\n")
}

#[allow(dead_code)]
pub fn three_way_merge_legacy(base: &str, local: &str, cloud: &str) -> Result<String, ()> {
    if local == cloud {
        return Ok(local.to_string());
    }
    if base == cloud {
        return Ok(local.to_string());
    }
    if base == local {
        return Ok(cloud.to_string());
    }
    Err(())
}
