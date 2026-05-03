use pulldown_cmark::{html, Options, Parser};
use serde::{Deserialize, Serialize};
use std::{
    collections::{hash_map::DefaultHasher, HashMap, HashSet},
    fs,
    hash::{Hash, Hasher},
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EntryKind {
    Folder,
    Markdown,
    Asset,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub kind: EntryKind,
    pub children: Vec<FileTreeNode>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub root_path: String,
    pub name: String,
    pub entries: Vec<FileTreeNode>,
    pub metadata_created: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PublishResult {
    pub output_dir: String,
    pub pages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiIndexResult {
    pub output_file: String,
    pub documents: usize,
    pub chunks: usize,
    pub links: usize,
    pub assets: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyncDocument {
    pub relative_path: String,
    pub title: String,
    pub status: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceConfig {
    id: String,
    name: String,
    root_path: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PublishConfig {
    site_name: String,
    source: String,
    output: String,
    include_drafts: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiDocumentRecord {
    record_type: &'static str,
    id: String,
    path: String,
    title: String,
    frontmatter: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiChunkRecord {
    record_type: &'static str,
    id: String,
    document_id: String,
    path: String,
    heading_path: Vec<String>,
    start_line: usize,
    end_line: usize,
    text: String,
    content_hash: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiLinkRecord {
    record_type: &'static str,
    from_document_id: String,
    path: String,
    target: String,
    line: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiAssetRecord {
    record_type: &'static str,
    document_id: String,
    path: String,
    asset_path: String,
    line: usize,
}

pub fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "md" | "markdown" | "mdown" | "mkd"
            )
        })
        .unwrap_or(false)
}

pub fn read_markdown(path: &Path) -> Result<String, String> {
    ensure_markdown(path)?;
    fs::read_to_string(path).map_err(|error| error.to_string())
}

pub fn write_markdown(path: &Path, content: &str) -> Result<(), String> {
    ensure_markdown(path)?;
    fs::write(path, content).map_err(|error| error.to_string())
}

/// Walk up from a file path to find the nearest ancestor directory containing `.jtype`.
/// Returns `None` if no vault root is found.
pub fn detect_vault_root(file_path: &Path) -> Option<PathBuf> {
    let mut current = if file_path.is_file() {
        file_path.parent()?.to_path_buf()
    } else {
        file_path.to_path_buf()
    };
    loop {
        if current.join(".jtype").is_dir() {
            return Some(current);
        }
        if !current.pop() {
            return None;
        }
    }
}

pub fn open_workspace(root: &Path) -> Result<WorkspaceSnapshot, String> {
    if !root.is_dir() {
        return Err("Workspace path must be a directory.".to_string());
    }

    let metadata_created = ensure_workspace_metadata(root)?;
    let mut entries = read_children(root, root)?;
    sort_nodes(&mut entries);

    let name = if root.file_name().map_or(false, |n| n == ".jtype") {
        "Vault".to_string()
    } else {
        root.file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("Workspace")
            .to_string()
    };

    Ok(WorkspaceSnapshot {
        root_path: path_to_string(root),
        name,
        entries,
        metadata_created,
    })
}

pub fn create_entry(root: &Path, relative_path: &str, kind: EntryKind) -> Result<(), String> {
    let target = safe_join(root, relative_path)?;
    match kind {
        EntryKind::Folder => fs::create_dir_all(target).map_err(|error| error.to_string()),
        EntryKind::Markdown | EntryKind::Asset => {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            if target.exists() {
                return Err("Target already exists.".to_string());
            }
            fs::write(target, "").map_err(|error| error.to_string())
        }
    }
}

pub fn rename_entry(
    root: &Path,
    from_relative_path: &str,
    to_relative_path: &str,
) -> Result<(), String> {
    let from = safe_join(root, from_relative_path)?;
    let to = safe_join(root, to_relative_path)?;
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::rename(from, to).map_err(|error| error.to_string())
}

pub fn delete_entry(root: &Path, relative_path: &str) -> Result<(), String> {
    let target = safe_join(root, relative_path)?;
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|error| error.to_string())
    } else {
        fs::remove_file(target).map_err(|error| error.to_string())
    }
}

pub fn export_static_site(
    root: &Path,
    output_relative_path: &str,
) -> Result<PublishResult, String> {
    let output_dir = safe_join(root, output_relative_path)?;
    fs::create_dir_all(&output_dir).map_err(|error| error.to_string())?;

    let markdown_files = collect_markdown_files(root)?;
    let mut pages = Vec::new();

    for file in markdown_files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        if relative.starts_with(".jtype") {
            continue;
        }

        let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
        let html_content = markdown_to_html(&content);
        let title = extract_title(&content).unwrap_or_else(|| {
            file.file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("Untitled")
                .to_string()
        });
        let output_file = output_dir.join(relative).with_extension("html");

        if let Some(parent) = output_file.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        fs::write(&output_file, page_template(&title, &html_content))
            .map_err(|error| error.to_string())?;

        pages.push(path_to_string(
            output_file
                .strip_prefix(&output_dir)
                .map_err(|error| error.to_string())?,
        ));
    }

    Ok(PublishResult {
        output_dir: path_to_string(&output_dir),
        pages,
    })
}

pub fn validate_workspace(root: &Path) -> Result<ValidationResult, String> {
    let markdown_files = collect_markdown_files(root)?;
    let mut known_paths = HashSet::new();
    let mut slugs = HashMap::<String, String>::new();
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    for file in &markdown_files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        if relative.starts_with(".jtype") {
            continue;
        }
        known_paths.insert(path_to_string(relative));
    }

    for file in markdown_files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        if relative.starts_with(".jtype") {
            continue;
        }

        let relative_string = path_to_string(relative);
        let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
        let frontmatter = parse_frontmatter(&content);
        let slug = frontmatter.get("slug").cloned().unwrap_or_else(|| {
            file.file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("")
                .to_string()
        });

        if let Some(existing) = slugs.insert(slug.clone(), relative_string.clone()) {
            warnings.push(format!(
                "Duplicate slug '{}' in {} and {}.",
                slug, existing, relative_string
            ));
        }

        if extract_title(&content).is_none() && !frontmatter.contains_key("title") {
            warnings.push(format!("Missing title in {}.", relative_string));
        }

        if frontmatter
            .get("status")
            .map(|value| value.eq_ignore_ascii_case("draft"))
            .unwrap_or(false)
            || frontmatter
                .get("publish")
                .map(|value| value.eq_ignore_ascii_case("false"))
                .unwrap_or(false)
        {
            errors.push(format!(
                "Draft document {} is not publishable.",
                relative_string
            ));
        }

        for reference in extract_markdown_references(&content) {
            if is_external_reference(&reference.target) {
                continue;
            }

            let target = resolve_reference(relative, &reference.target);
            if reference.is_asset {
                if !root.join(&target).exists() {
                    warnings.push(format!(
                        "Missing asset '{}' referenced by {}:{}.",
                        reference.target, relative_string, reference.line
                    ));
                }
            } else if reference.target.ends_with(".md") && !known_paths.contains(&target) {
                errors.push(format!(
                    "Broken link '{}' referenced by {}:{}.",
                    reference.target, relative_string, reference.line
                ));
            }
        }
    }

    Ok(ValidationResult { errors, warnings })
}

pub fn collect_sync_documents(root: &Path) -> Result<Vec<SyncDocument>, String> {
    let markdown_files = collect_markdown_files(root)?;
    let mut documents = Vec::new();

    for file in markdown_files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        if relative.starts_with(".jtype") {
            continue;
        }

        let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
        let frontmatter = parse_frontmatter(&content);
        let title = frontmatter
            .get("title")
            .cloned()
            .or_else(|| extract_title(&content))
            .unwrap_or_else(|| {
                file.file_stem()
                    .and_then(|value| value.to_str())
                    .unwrap_or("Untitled")
                    .to_string()
            });
        let status = if frontmatter
            .get("status")
            .map(|value| value.eq_ignore_ascii_case("draft"))
            .unwrap_or(false)
            || frontmatter
                .get("publish")
                .map(|value| value.eq_ignore_ascii_case("false"))
                .unwrap_or(false)
        {
            "draft"
        } else {
            "published"
        };

        documents.push(SyncDocument {
            relative_path: path_to_string(relative),
            title,
            status: status.to_string(),
            content,
        });
    }

    Ok(documents)
}

pub fn build_ai_index(root: &Path) -> Result<AiIndexResult, String> {
    let metadata_dir = root.join(".jtype");
    fs::create_dir_all(&metadata_dir).map_err(|error| error.to_string())?;
    let output_file = metadata_dir.join("ai-context.jsonl");
    let markdown_files = collect_markdown_files(root)?;
    let mut lines = Vec::new();
    let mut documents = 0;
    let mut chunks = 0;
    let mut links = 0;
    let mut assets = 0;

    for file in markdown_files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        if relative.starts_with(".jtype") {
            continue;
        }

        let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
        let relative_string = path_to_string(relative);
        let document_id = stable_id(&relative_string);
        let frontmatter = parse_frontmatter(&content);
        let title = frontmatter
            .get("title")
            .cloned()
            .or_else(|| extract_title(&content))
            .unwrap_or_else(|| relative_string.clone());

        lines.push(
            serde_json::to_string(&AiDocumentRecord {
                record_type: "document",
                id: document_id.clone(),
                path: relative_string.clone(),
                title,
                frontmatter,
            })
            .map_err(|error| error.to_string())?,
        );
        documents += 1;

        for chunk in markdown_chunks(&content) {
            let chunk_id = stable_id(&format!(
                "{}:{}:{}",
                relative_string, chunk.start_line, chunk.content_hash
            ));
            lines.push(
                serde_json::to_string(&AiChunkRecord {
                    record_type: "chunk",
                    id: chunk_id,
                    document_id: document_id.clone(),
                    path: relative_string.clone(),
                    heading_path: chunk.heading_path,
                    start_line: chunk.start_line,
                    end_line: chunk.end_line,
                    text: chunk.text,
                    content_hash: chunk.content_hash,
                })
                .map_err(|error| error.to_string())?,
            );
            chunks += 1;
        }

        for reference in extract_markdown_references(&content) {
            if is_external_reference(&reference.target) {
                continue;
            }

            if reference.is_asset {
                lines.push(
                    serde_json::to_string(&AiAssetRecord {
                        record_type: "asset",
                        document_id: document_id.clone(),
                        path: relative_string.clone(),
                        asset_path: reference.target,
                        line: reference.line,
                    })
                    .map_err(|error| error.to_string())?,
                );
                assets += 1;
            } else {
                lines.push(
                    serde_json::to_string(&AiLinkRecord {
                        record_type: "link",
                        from_document_id: document_id.clone(),
                        path: relative_string.clone(),
                        target: reference.target,
                        line: reference.line,
                    })
                    .map_err(|error| error.to_string())?,
                );
                links += 1;
            }
        }
    }

    fs::write(&output_file, lines.join("\n")).map_err(|error| error.to_string())?;

    Ok(AiIndexResult {
        output_file: path_to_string(&output_file),
        documents,
        chunks,
        links,
        assets,
    })
}

fn ensure_markdown(path: &Path) -> Result<(), String> {
    if is_markdown_path(path) {
        Ok(())
    } else {
        Err("Only Markdown files are supported.".to_string())
    }
}

fn ensure_workspace_metadata(root: &Path) -> Result<bool, String> {
    let metadata_dir = root.join(".jtype");
    let config_file = metadata_dir.join("workspace.json");
    let publish_file = metadata_dir.join("publish.json");
    let created = !config_file.exists();

    fs::create_dir_all(&metadata_dir).map_err(|error| error.to_string())?;

    if created {
        let now = unix_timestamp();
        let config = WorkspaceConfig {
            id: stable_id(&path_to_string(root)),
            name: root
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("Workspace")
                .to_string(),
            root_path: path_to_string(root),
            created_at: now.clone(),
            updated_at: now,
        };
        let json = serde_json::to_string_pretty(&config).map_err(|error| error.to_string())?;
        fs::write(config_file, json).map_err(|error| error.to_string())?;
    }

    if !publish_file.exists() {
        let publish_config = PublishConfig {
            site_name: root
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("JType Site")
                .to_string(),
            source: ".".to_string(),
            output: ".jtype/dist".to_string(),
            include_drafts: false,
        };
        let json =
            serde_json::to_string_pretty(&publish_config).map_err(|error| error.to_string())?;
        fs::write(publish_file, json).map_err(|error| error.to_string())?;
    }

    Ok(created)
}

fn read_children(root: &Path, current: &Path) -> Result<Vec<FileTreeNode>, String> {
    let mut nodes = Vec::new();

    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        if file_name == ".git" || file_name == "node_modules" || file_name == "target" {
            continue;
        }

        let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;

        if path.is_dir() {
            let mut children = read_children(root, &path)?;
            sort_nodes(&mut children);
            nodes.push(FileTreeNode {
                name: file_name,
                path: path_to_string(&path),
                relative_path: path_to_string(relative),
                kind: EntryKind::Folder,
                children,
            });
        } else if is_markdown_path(&path) || is_asset_path(&path) {
            nodes.push(FileTreeNode {
                name: file_name,
                path: path_to_string(&path),
                relative_path: path_to_string(relative),
                kind: if is_markdown_path(&path) {
                    EntryKind::Markdown
                } else {
                    EntryKind::Asset
                },
                children: Vec::new(),
            });
        }
    }

    Ok(nodes)
}

fn sort_nodes(nodes: &mut [FileTreeNode]) {
    nodes.sort_by(|a, b| match (&a.kind, &b.kind) {
        (EntryKind::Folder, EntryKind::Folder)
        | (EntryKind::Markdown, EntryKind::Markdown)
        | (EntryKind::Asset, EntryKind::Asset) => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        (EntryKind::Folder, _) => std::cmp::Ordering::Less,
        (_, EntryKind::Folder) => std::cmp::Ordering::Greater,
        (EntryKind::Markdown, EntryKind::Asset) => std::cmp::Ordering::Less,
        (EntryKind::Asset, EntryKind::Markdown) => std::cmp::Ordering::Greater,
    });
}

fn safe_join(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    if Path::new(relative_path).is_absolute() {
        return Err("Path must be relative to the workspace.".to_string());
    }

    let candidate = root.join(relative_path);
    let normalized = candidate
        .components()
        .try_fold(PathBuf::new(), |mut acc, component| {
            match component {
                std::path::Component::ParentDir => {
                    return Err("Path cannot escape the workspace.".to_string());
                }
                value => acc.push(value.as_os_str()),
            }
            Ok(acc)
        })?;

    Ok(normalized)
}

fn collect_markdown_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    collect_markdown_files_inner(root, &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_markdown_files_inner(current: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        if file_name == ".git" || file_name == "node_modules" || file_name == "target" {
            continue;
        }

        if path.is_dir() {
            collect_markdown_files_inner(&path, files)?;
        } else if is_markdown_path(&path) {
            files.push(path);
        }
    }

    Ok(())
}

fn markdown_to_html(content: &str) -> String {
    let parser = Parser::new_ext(content, Options::all());
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

fn page_template(title: &str, body: &str) -> String {
    format!(
        r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{}</title>
    <style>
      body {{ margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #18181b; background: #fafafa; }}
      main {{ max-width: 78ch; margin: 0 auto; padding: 48px 24px; }}
      pre {{ overflow: auto; padding: 16px; border-radius: 8px; color: #f8fafc; background: #18181b; }}
      code {{ font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }}
      a {{ color: #047857; }}
      img {{ max-width: 100%; }}
    </style>
  </head>
  <body>
    <main>{}</main>
  </body>
</html>
"#,
        escape_html(title),
        body
    )
}

fn extract_title(content: &str) -> Option<String> {
    content.lines().find_map(|line| {
        line.strip_prefix("# ")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

#[derive(Debug, Clone)]
struct MarkdownReference {
    target: String,
    line: usize,
    is_asset: bool,
}

fn extract_markdown_references(content: &str) -> Vec<MarkdownReference> {
    let mut references = Vec::new();

    for (index, line) in content.lines().enumerate() {
        let mut offset = 0;
        while let Some(start) = line[offset..].find("](") {
            let target_start = offset + start + 2;
            let Some(end) = line[target_start..].find(')') else {
                break;
            };
            let target = line[target_start..target_start + end]
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            let marker_index = offset + start;
            let label_start = line[..marker_index].rfind('[');
            let is_asset = label_start
                .map(|index| index > 0 && line.as_bytes()[index - 1] == b'!')
                .unwrap_or(false);
            if !target.is_empty() {
                references.push(MarkdownReference {
                    target,
                    line: index + 1,
                    is_asset,
                });
            }
            offset = target_start + end + 1;
        }
    }

    references
}

fn parse_frontmatter(content: &str) -> HashMap<String, String> {
    let mut frontmatter = HashMap::new();
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

fn is_external_reference(target: &str) -> bool {
    target.starts_with("http://")
        || target.starts_with("https://")
        || target.starts_with("mailto:")
        || target.starts_with('#')
}

fn resolve_reference(from_relative_path: &Path, target: &str) -> String {
    let cleaned = target.split('#').next().unwrap_or(target);
    let base = from_relative_path.parent().unwrap_or_else(|| Path::new(""));
    path_to_string(&base.join(cleaned))
}

#[derive(Debug, Clone)]
struct MarkdownChunk {
    heading_path: Vec<String>,
    start_line: usize,
    end_line: usize,
    text: String,
    content_hash: String,
}

fn markdown_chunks(content: &str) -> Vec<MarkdownChunk> {
    let mut chunks = Vec::new();
    let mut current_heading = Vec::new();
    let mut current_start = 1;
    let mut current_lines: Vec<String> = Vec::new();

    for (index, line) in content.lines().enumerate() {
        let line_number = index + 1;
        if let Some((level, heading)) = parse_heading(line) {
            push_chunk(
                &mut chunks,
                &current_heading,
                current_start,
                line_number.saturating_sub(1),
                &current_lines,
            );
            current_lines.clear();
            current_start = line_number;
            current_heading.truncate(level.saturating_sub(1));
            current_heading.push(heading);
        }
        current_lines.push(line.to_string());
    }

    push_chunk(
        &mut chunks,
        &current_heading,
        current_start,
        content.lines().count().max(current_start),
        &current_lines,
    );

    chunks
}

fn push_chunk(
    chunks: &mut Vec<MarkdownChunk>,
    heading_path: &[String],
    start_line: usize,
    end_line: usize,
    lines: &[String],
) {
    let text = lines.join("\n").trim().to_string();
    if text.is_empty() {
        return;
    }

    let content_hash = stable_id(&text);
    chunks.push(MarkdownChunk {
        heading_path: heading_path.to_vec(),
        start_line,
        end_line,
        text,
        content_hash,
    });
}

fn parse_heading(line: &str) -> Option<(usize, String)> {
    let marker_len = line.chars().take_while(|value| *value == '#').count();
    if marker_len == 0
        || marker_len > 6
        || !line
            .chars()
            .nth(marker_len)
            .is_some_and(|value| value == ' ')
    {
        return None;
    }
    Some((marker_len, line[marker_len + 1..].trim().to_string()))
}

fn is_asset_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "pdf"
            )
        })
        .unwrap_or(false)
}

fn stable_id(value: &str) -> String {
    let mut hasher = DefaultHasher::new();
    value.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn unix_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn trash_dir(root: &Path) -> PathBuf {
    root.join(".jtype").join("trash")
}

pub fn trash_entry(root: &Path, relative_path: &str) -> Result<(), String> {
    let src = safe_join(root, relative_path)?;
    if !src.exists() {
        return Err(format!("File not found: {}", relative_path));
    }
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let dest_dir = trash_dir(root).join(ts.to_string());
    let dest = dest_dir.join(relative_path);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashItemInfo {
    pub trash_id: String,
    pub relative_path: String,
    pub name: String,
    pub trashed_at: u64,
}

pub fn list_trash(root: &Path) -> Result<Vec<TrashItemInfo>, String> {
    let trash = trash_dir(root);
    if !trash.exists() {
        return Ok(Vec::new());
    }
    let mut items = Vec::new();
    let entries = fs::read_dir(&trash).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let ts_str = entry.file_name().to_string_lossy().to_string();
        let ts: u64 = ts_str.parse().unwrap_or(0);
        let base = entry.path();
        collect_trash_items(&base, &base, trash_id_prefix, &mut items, ts);
    }
    items.sort_by(|a, b| b.trashed_at.cmp(&a.trashed_at));
    Ok(items)
}

fn collect_trash_items(cur_dir: &Path, root_dir: &Path, trash_id_prefix: &str, items: &mut Vec<TrashItemInfo>, ts: u64) {
    if !cur_dir.is_dir() { return; }
    let entries = match fs::read_dir(cur_dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if path.is_dir() {
            collect_trash_items(&path, root_dir, trash_id_prefix, items, ts);
        } else {
            let relative = path.strip_prefix(root_dir).unwrap_or(&path);
            let relative_str = relative.to_string_lossy().replace('\\', "/");
            let relative_within_trash = format!("{}/{}", trash_id_prefix, relative_str);
            items.push(TrashItemInfo {
                trash_id: relative_within_trash.clone(),
                relative_path: relative_str,
                name,
                trashed_at: ts,
            });
        }
    }
}

fn validate_no_path_traversal(relative: &str) -> Result<(), String> {
    let path = Path::new(relative);
    for comp in path.components() {
        match comp {
            Component::ParentDir => return Err("Path traversal not allowed.".to_string()),
            Component::Prefix(_) | Component::RootDir => return Err("Absolute path not allowed.".to_string()),
            _ => {}
        }
    }
    Ok(())
}

pub fn restore_from_trash(root: &Path, trash_id: &str) -> Result<String, String> {
    let parts: Vec<&str> = trash_id.splitn(2, '/').collect();
    if parts.len() < 2 {
        return Err("Invalid trash id format.".to_string());
    }
    let ts_dir = parts[0];
    let relative = parts[1];
    validate_no_path_traversal(ts_dir)?;
    validate_no_path_traversal(relative)?;
    let src = trash_dir(root).join(ts_dir).join(relative);
    if !src.exists() {
        return Err(format!("Trash item not found: {}", trash_id));
    }
    let dest = root.join(relative);
    if dest.exists() {
        return Err(format!("A file already exists at: {}. Remove it first.", relative));
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dest).map_err(|e| e.to_string())?;
    Ok(relative.to_string())
}

pub fn permanent_delete_from_trash(root: &Path, trash_id: &str) -> Result<(), String> {
    let parts: Vec<&str> = trash_id.splitn(2, '/').collect();
    if parts.len() < 2 {
        return Err("Invalid trash id format.".to_string());
    }
    validate_no_path_traversal(parts[0])?;
    validate_no_path_traversal(parts[1])?;
    let path = trash_dir(root).join(parts[0]).join(parts[1]);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn empty_trash(root: &Path) -> Result<(), String> {
    let trash = trash_dir(root);
    if trash.exists() {
        fs::remove_dir_all(&trash).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn opens_workspace_and_creates_metadata() {
        let dir = tempdir().unwrap();
        fs::create_dir(dir.path().join("notes")).unwrap();
        fs::write(dir.path().join("notes").join("intro.md"), "# Intro").unwrap();
        fs::write(dir.path().join("cover.png"), "fake").unwrap();

        let snapshot = open_workspace(dir.path()).unwrap();

        assert!(snapshot.metadata_created);
        assert!(dir.path().join(".jtype").join("workspace.json").exists());
        assert!(dir.path().join(".jtype").join("publish.json").exists());
        assert_eq!(snapshot.entries[0].name, ".jtype");
        assert_eq!(snapshot.entries[1].name, "notes");
    }

    #[test]
    fn rejects_non_markdown_read_write() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("note.txt");
        fs::write(&file, "hello").unwrap();

        assert!(read_markdown(&file).is_err());
        assert!(write_markdown(&file, "hello").is_err());
    }

    #[test]
    fn creates_renames_and_deletes_entries() {
        let dir = tempdir().unwrap();

        create_entry(dir.path(), "docs/first.md", EntryKind::Markdown).unwrap();
        assert!(dir.path().join("docs").join("first.md").exists());

        rename_entry(dir.path(), "docs/first.md", "docs/renamed.md").unwrap();
        assert!(dir.path().join("docs").join("renamed.md").exists());

        delete_entry(dir.path(), "docs/renamed.md").unwrap();
        assert!(!dir.path().join("docs").join("renamed.md").exists());
    }

    #[test]
    fn exports_markdown_to_static_html() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("index.md"), "# Hello\n\nWorld").unwrap();

        let result = export_static_site(dir.path(), ".jtype/dist").unwrap();

        assert_eq!(result.pages, vec!["index.html"]);
        let html =
            fs::read_to_string(dir.path().join(".jtype").join("dist").join("index.html")).unwrap();
        assert!(html.contains("<h1>Hello</h1>"));
    }

    #[test]
    fn builds_ai_context_jsonl() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("guide.md"),
            "---\ntitle: Guide Title\nslug: guide\n---\n# Guide\n\n![Cover](cover.png)\n[Next](next.md)\n\n## Step\n\nDo it.",
        )
        .unwrap();

        let result = build_ai_index(dir.path()).unwrap();

        assert_eq!(result.documents, 1);
        assert!(result.chunks >= 1);
        assert_eq!(result.links, 1);
        assert_eq!(result.assets, 1);
        let jsonl = fs::read_to_string(dir.path().join(".jtype").join("ai-context.jsonl")).unwrap();
        assert!(jsonl.contains("\"recordType\":\"document\""));
        assert!(jsonl.contains("\"recordType\":\"chunk\""));
        assert!(jsonl.contains("\"recordType\":\"link\""));
        assert!(jsonl.contains("\"recordType\":\"asset\""));
        assert!(jsonl.contains("\"frontmatter\""));
    }

    #[test]
    fn validates_duplicate_slugs_and_broken_links() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("a.md"),
            "---\nslug: same\n---\n# A\n\n[Missing](missing.md)",
        )
        .unwrap();
        fs::write(dir.path().join("b.md"), "---\nslug: same\n---\n# B").unwrap();

        let result = validate_workspace(dir.path()).unwrap();

        assert_eq!(result.errors.len(), 1);
        assert_eq!(result.warnings.len(), 1);
    }

    #[test]
    fn blocks_draft_documents_before_publish() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("draft.md"),
            "---\nstatus: draft\n---\n# Draft",
        )
        .unwrap();

        let result = validate_workspace(dir.path()).unwrap();

        assert_eq!(
            result.errors,
            vec!["Draft document draft.md is not publishable."]
        );
    }

    #[test]
    fn collects_sync_documents_with_status() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("index.md"),
            "---\ntitle: Home\n---\n# Fallback",
        )
        .unwrap();
        fs::write(
            dir.path().join("draft.md"),
            "---\npublish: false\n---\n# Draft",
        )
        .unwrap();

        let docs = collect_sync_documents(dir.path()).unwrap();

        assert_eq!(docs.len(), 2);
        assert!(docs.iter().any(|doc| doc.title == "Home"));
        assert!(docs.iter().any(|doc| doc.status == "draft"));
    }
}
