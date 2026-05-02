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
    let parser = Parser::new_ext(content, Options::all());
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

pub fn site_url(public_base_url: &str, username: &str) -> String {
    format!("{}/u/{}", public_base_url.trim_end_matches('/'), username)
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

pub enum MergeResult {
    Merged(String),
    Conflict,
}

pub fn three_way_merge(base: &str, local: &str, cloud: &str) -> MergeResult {
    if local == cloud {
        return MergeResult::Merged(local.to_string());
    }
    if base == cloud {
        return MergeResult::Merged(local.to_string());
    }
    if base == local {
        return MergeResult::Merged(cloud.to_string());
    }

    let base_lines: Vec<_> = base.lines().collect();
    let local_lines: Vec<_> = local.lines().collect();
    let cloud_lines: Vec<_> = cloud.lines().collect();
    if base_lines.len() != local_lines.len() || base_lines.len() != cloud_lines.len() {
        return MergeResult::Conflict;
    }

    let mut merged = Vec::with_capacity(base_lines.len());
    for i in 0..base_lines.len() {
        let b = base_lines[i];
        let l = local_lines[i];
        let c = cloud_lines[i];
        if l == c {
            merged.push(l);
        } else if b == c {
            merged.push(l);
        } else if b == l {
            merged.push(c);
        } else {
            return MergeResult::Conflict;
        }
    }
    MergeResult::Merged(merged.join("\n"))
}
