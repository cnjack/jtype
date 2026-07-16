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
    /// A `.board` view file (JSON config) — a kanban board over card-notes.
    Board,
    /// A text-based file with a dedicated in-app viewer/editor (Mermaid `.mmd`,
    /// Draw.io `.drawio`, Excalidraw `.excalidraw`, or a Swagger/OpenAPI spec).
    /// Syncs as a text document like Markdown — see `is_diagram_path`.
    Diagram,
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

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyncFolder {
    pub relative_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncBaseEntry {
    pub relative_path: String,
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

/// True for text-based files that render in a dedicated in-app viewer/editor:
/// Mermaid (`.mmd`/`.mermaid`), Draw.io (`.drawio`), Excalidraw (`.excalidraw`),
/// and Swagger/OpenAPI specs (by filename convention). `.drawio.svg`/`.png`
/// exports are images and stay on the asset path. Mirrors `isDiagramTextPath`
/// in shared/lib/fileTypes.ts.
pub fn is_diagram_path(path: &Path) -> bool {
    if is_swagger_path(path) {
        return true;
    }
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "mmd" | "mermaid" | "drawio" | "excalidraw"
            )
        })
        .unwrap_or(false)
}

/// Swagger/OpenAPI specs are detected by filename convention so we never claim
/// every `.json`/`.yaml` file: `swagger.json`, `openapi.yaml`, `api.swagger.yml`,
/// `petstore-openapi.json`. Mirrors `isSwaggerPath` in shared/lib/fileTypes.ts.
fn is_swagger_path(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };
    let name = name.to_ascii_lowercase();
    let stem = match name.strip_suffix(".json") {
        Some(stem) => stem,
        None => match name.strip_suffix(".yaml") {
            Some(stem) => stem,
            None => match name.strip_suffix(".yml") {
                Some(stem) => stem,
                None => return false,
            },
        },
    };
    stem == "swagger"
        || stem == "openapi"
        || stem.ends_with(".swagger")
        || stem.ends_with("-swagger")
        || stem.ends_with("_swagger")
        || stem.ends_with(".openapi")
        || stem.ends_with("-openapi")
        || stem.ends_with("_openapi")
}

/// Read a diagram/text resource (no Markdown extension gate).
pub fn read_text(path: &Path) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

/// Write a diagram/text resource, creating parent directories as needed.
pub fn write_text(path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
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
        EntryKind::Markdown | EntryKind::Asset | EntryKind::Board | EntryKind::Diagram => {
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

/// Copy an external file or directory (from anywhere on disk) into the vault
/// under `target_folder`, choosing a collision-free leaf name. Returns the
/// imported entry's vault-relative path (forward-slashed).
pub fn import_external_path(
    root: &Path,
    source: &Path,
    target_folder: &str,
) -> Result<String, String> {
    if !source.exists() {
        return Err(format!("Source does not exist: {}", source.display()));
    }
    let name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Source has no file name.".to_string())?;

    let folder = target_folder.trim_matches('/');
    let base_relative = if folder.is_empty() {
        name.to_string()
    } else {
        format!("{folder}/{name}")
    };
    let relative = unique_relative_path(root, &base_relative)?;
    let dest = safe_join(root, &relative)?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    if source.is_dir() {
        copy_dir_all(source, &dest)?;
    } else {
        fs::copy(source, &dest).map_err(|error| error.to_string())?;
    }
    Ok(relative)
}

/// Pick a vault-relative path derived from `base_relative` that does not yet
/// exist, inserting " 2", " 3", … before the extension on collision.
fn unique_relative_path(root: &Path, base_relative: &str) -> Result<String, String> {
    if !safe_join(root, base_relative)?.exists() {
        return Ok(base_relative.to_string());
    }
    let (dir, leaf) = match base_relative.rsplit_once('/') {
        Some((d, l)) => (format!("{d}/"), l.to_string()),
        None => (String::new(), base_relative.to_string()),
    };
    // Keep dotfiles (".env") whole; only split a real "stem.ext".
    let (stem, ext) = match leaf.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_string(), format!(".{e}")),
        _ => (leaf.clone(), String::new()),
    };
    for n in 2..10_000 {
        let candidate = format!("{dir}{stem} {n}{ext}");
        if !safe_join(root, &candidate)?.exists() {
            return Ok(candidate);
        }
    }
    Err("Could not find a free name for the imported file.".to_string())
}

/// Recursively copy a directory tree from `src` to `dst`.
fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(src).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if from.is_dir() {
            copy_dir_all(&from, &to)?;
        } else {
            fs::copy(&from, &to).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
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

        if normalize_status(&frontmatter) == "draft" {
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
    // ONE walk gated by the shared predicate so the push set is decided by the
    // exact same rule as collect_files_recursive (sync-base) and
    // apply_cloud_documents (apply). Markdown notes, `.board` kanban views, and
    // diagram resources (Mermaid/Draw.io/Excalidraw/Swagger) all sync as opaque
    // text — see is_syncable_document_path.
    let files = collect_paths_where(root, is_syncable_document_path)?;
    let mut documents = Vec::new();

    for file in files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        if relative.starts_with(".jtype") {
            continue;
        }

        let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
        // `.board` and diagram files are opaque content — never publish them, and
        // don't parse them as Markdown frontmatter.
        let (title, status) = if is_board_path(&file) || is_diagram_path(&file) {
            (
                file.file_stem().and_then(|v| v.to_str()).unwrap_or("document").to_string(),
                "draft".to_string(),
            )
        } else {
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
            (title, normalize_status(&frontmatter).to_string())
        };

        documents.push(SyncDocument {
            relative_path: path_to_string(relative),
            title,
            status,
            content,
        });
    }

    Ok(documents)
}

pub fn collect_sync_folders(root: &Path) -> Result<Vec<SyncFolder>, String> {
    let mut folders = Vec::new();
    collect_sync_folders_inner(root, root, &mut folders)?;
    folders.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    Ok(folders)
}

fn collect_sync_folders_inner(
    root: &Path,
    current: &Path,
    folders: &mut Vec<SyncFolder>,
) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name == ".jtype" || name == ".git" || name == "node_modules" || name == "target" {
            continue;
        }
        let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
        folders.push(SyncFolder {
            relative_path: path_to_string(relative),
        });
        collect_sync_folders_inner(root, &path, folders)?;
    }
    Ok(())
}

pub fn save_sync_bases(root: &Path, documents: &[SyncBaseEntry]) -> Result<(), String> {
    let base_dir = root.join(".jtype").join("sync-base");
    for doc in documents {
        let target = safe_join_relative(&base_dir, &doc.relative_path)?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&target, &doc.content).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn delete_sync_bases(root: &Path, relative_paths: &[String]) -> Result<(), String> {
    let base_dir = root.join(".jtype").join("sync-base");
    for relative_path in relative_paths {
        let target = safe_join_relative(&base_dir, relative_path)?;
        if target.exists() {
            fs::remove_file(&target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn load_all_sync_bases(root: &Path) -> Result<HashMap<String, String>, String> {
    let base_dir = root.join(".jtype").join("sync-base");
    let mut result = HashMap::new();
    if !base_dir.exists() {
        return Ok(result);
    }
    collect_files_recursive(&base_dir, &base_dir, &mut result)?;
    Ok(result)
}

pub fn save_sync_folder_bases(root: &Path, folders: &[String]) -> Result<(), String> {
    let path = root.join(".jtype").join("sync-folder-bases.json");
    let json = serde_json::to_string(folders).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_sync_folder_bases(root: &Path, relative_paths: &[String]) -> Result<(), String> {
    let mut existing = load_sync_folder_bases(root)?;
    existing.retain(|p| !relative_paths.contains(p));
    save_sync_folder_bases(root, &existing)?;
    Ok(())
}

pub fn load_sync_folder_bases(root: &Path) -> Result<Vec<String>, String> {
    let path = root.join(".jtype").join("sync-folder-bases.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

/// Last-synced state for binary asset blobs. `bases` maps vault relative_path →
/// sha256 of the last content we synced (to detect local edits/deletions);
/// `clock` is the highest server blob updated_clock we've reconciled (for
/// incremental manifest pulls).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetSyncState {
    #[serde(default)]
    pub clock: i64,
    #[serde(default)]
    pub bases: HashMap<String, String>,
}

/// Collect vault-relative paths of binary asset files (images, PDFs) for blob
/// sync. Skips the `.jtype` metadata dir and common junk dirs.
pub fn collect_asset_paths(root: &Path) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    collect_asset_files_inner(root, &mut files)?;
    let mut relatives = Vec::new();
    for file in files {
        let relative = file.strip_prefix(root).map_err(|error| error.to_string())?;
        let rel = path_to_string(relative);
        if rel.starts_with(".jtype") {
            continue;
        }
        relatives.push(rel);
    }
    relatives.sort();
    Ok(relatives)
}

fn collect_asset_files_inner(current: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name == ".git" || file_name == "node_modules" || file_name == "target" || file_name == ".jtype" {
            continue;
        }
        if path.is_dir() {
            collect_asset_files_inner(&path, files)?;
        } else if is_asset_path(&path) {
            files.push(path);
        }
    }
    Ok(())
}

pub fn load_asset_sync_state(root: &Path) -> Result<AssetSyncState, String> {
    let file = root.join(".jtype").join("asset-sync.json");
    if !file.exists() {
        return Ok(AssetSyncState::default());
    }
    let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

pub fn save_asset_sync_state(root: &Path, state: &AssetSyncState) -> Result<(), String> {
    let dir = root.join(".jtype");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let file = dir.join("asset-sync.json");
    let json = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(file, json).map_err(|error| error.to_string())
}

fn collect_files_recursive(
    root: &Path,
    dir: &Path,
    result: &mut HashMap<String, String>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_files_recursive(root, &path, result)?;
        } else if is_syncable_document_path(&path) {
            // Must mirror collect_sync_documents' file set exactly: if a synced
            // file type is missing here, its sync-base never loads, which breaks
            // 3-way conflict detection and deletion propagation for that type
            // (silent lost-update / resurrection on next pull).
            let relative = path.strip_prefix(root).map_err(|e| e.to_string())?;
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            result.insert(path_to_string(relative), content);
        }
    }
    Ok(())
}

fn safe_join_relative(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = PathBuf::from(relative);
    if rel.is_absolute() {
        return Err("Path must be relative.".to_string());
    }
    let mut target = base.to_path_buf();
    for component in rel.components() {
        match component {
            Component::Normal(v) => target.push(v),
            _ => return Err("Path cannot escape base directory.".to_string()),
        }
    }
    Ok(target)
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
        } else if is_markdown_path(&path)
            || is_board_path(&path)
            || is_diagram_path(&path)
            || is_binary_document_path(&path)
        {
            // First-class tree entries: text documents + binary documents (pdf).
            // Inline images (is_image_path) are intentionally NOT listed — they are
            // markdown attachments, embedded via `![](path)`. They still sync as
            // blobs (collect_asset_paths is unchanged) so the embeds resolve.
            nodes.push(FileTreeNode {
                name: file_name,
                path: path_to_string(&path),
                relative_path: path_to_string(relative),
                kind: if is_board_path(&path) {
                    EntryKind::Board
                } else if is_markdown_path(&path) {
                    EntryKind::Markdown
                } else if is_diagram_path(&path) {
                    EntryKind::Diagram
                } else {
                    EntryKind::Asset
                },
                children: Vec::new(),
            });
        }
    }

    Ok(nodes)
}

/// Tree sort rank: folders first, then boards, markdown docs, diagrams, assets.
fn kind_rank(kind: &EntryKind) -> u8 {
    match kind {
        EntryKind::Folder => 0,
        EntryKind::Board => 1,
        EntryKind::Markdown => 2,
        EntryKind::Diagram => 3,
        EntryKind::Asset => 4,
    }
}

fn sort_nodes(nodes: &mut [FileTreeNode]) {
    nodes.sort_by(|a, b| {
        kind_rank(&a.kind)
            .cmp(&kind_rank(&b.kind))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
}

pub fn safe_join(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
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

/// Recursively collect files under `root` whose path matches `predicate`,
/// sorted. Skips VCS/build dirs (`.git`/`node_modules`/`target`); callers that
/// must drop `.jtype` metadata filter it after (collect_sync_documents does).
/// One walker so every "which files?" gate is just a predicate choice.
fn collect_paths_where(
    root: &Path,
    predicate: fn(&Path) -> bool,
) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    collect_paths_where_inner(root, predicate, &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_paths_where_inner(
    current: &Path,
    predicate: fn(&Path) -> bool,
    files: &mut Vec<PathBuf>,
) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name == ".git" || file_name == "node_modules" || file_name == "target" {
            continue;
        }
        if path.is_dir() {
            collect_paths_where_inner(&path, predicate, files)?;
        } else if predicate(&path) {
            files.push(path);
        }
    }
    Ok(())
}

/// Markdown-only walk (HTML export, AI context, link validation). For the sync
/// document set use collect_paths_where(root, is_syncable_document_path).
fn collect_markdown_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    collect_paths_where(root, is_markdown_path)
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

pub fn extract_title(content: &str) -> Option<String> {
    let frontmatter = parse_frontmatter(content);
    frontmatter
        .get("title")
        .cloned()
        .or_else(|| {
            content.lines().find_map(|line| {
                line.strip_prefix("# ")
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_string)
            })
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

fn normalize_status(frontmatter: &HashMap<String, String>) -> &'static str {
    if frontmatter
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

pub fn parse_frontmatter(content: &str) -> HashMap<String, String> {
    let mut frontmatter = HashMap::new();
    let normalized = content.replace("\r\n", "\n");
    let mut lines = normalized.lines();

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

/// Inline image attachments (png/jpg/…). These are embedded in Markdown via
/// `![](path)` and are NOT first-class tree entries — `read_children` hides them
/// from the file tree, but they still sync through the blob pipeline so the
/// embeds resolve. Mirrors `isImagePath` (shared) — keep extensions in lockstep.
pub fn is_image_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "webp" | "avif" | "bmp" | "ico" | "svg"
            )
        })
        .unwrap_or(false)
}

/// A first-class "binary document" (currently PDF): a standalone tree entry that
/// opens in its own viewer, as opposed to inline image attachments. Syncs via the
/// blob pipeline (NOT the text-document channel). Mirrors `isBinaryDocumentPath`
/// (shared) and `is_binary_document_path` (jtype-web). Extend as new types are
/// added (each also needs `content_type_for` + a viewer).
pub fn is_binary_document_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
}

/// Binary files that sync through the blob pipeline (`collect_asset_paths` +
/// `syncAssets`): inline images + first-class binary documents. The desktop
/// source of truth for the blob sync set; MUST mirror the image/pdf extensions
/// in shared/lib/fileTypes.ts (`IMAGE` + `PDF`) and the server's
/// `content_type_for` in jtype-web `handlers/blobs.rs`. NOTE: this is the SYNC
/// set, not the TREE set — `read_children` lists only `is_binary_document_path`
/// (pdf), hiding images, while this still collects both for syncing.
fn is_asset_path(path: &Path) -> bool {
    is_image_path(path) || is_binary_document_path(path)
}

/// `.board` files are kanban board views (JSON config over card-notes).
pub fn is_board_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("board"))
        .unwrap_or(false)
}

/// Single source of truth for "files that sync through the document pipeline as
/// opaque text" — Markdown, `.board` kanban views, and diagram resources.
///
/// EVERY gate that decides the synced document set must use THIS predicate, not
/// an inline `is_markdown_path || …` list: `collect_sync_documents` (push/up),
/// `collect_files_recursive` (sync-base load), and `apply_cloud_documents`
/// (pull/down write) must agree exactly. A type included in one gate but omitted
/// from another silently loses data — e.g. a `.board` that pushes up and lists
/// in the tree but is dropped on download, so a web-created board never appears
/// on desktop. Mirrors the markdown/board/diagram predicates in
/// shared/lib/fileTypes.ts.
pub fn is_syncable_document_path(path: &Path) -> bool {
    is_markdown_path(path) || is_board_path(path) || is_diagram_path(path)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardCardInfo {
    pub relative_path: String,
    pub path: String,
    pub title: String,
    pub status: String,
    pub position: i64,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub due: Option<String>,
    pub tags: Vec<String>,
    pub task_done: i64,
    pub task_total: i64,
    pub icon: Option<String>,
    pub excerpt: Option<String>,
    /// Markdown body (frontmatter stripped). Powers full-text card search and
    /// board embeds without a second file read.
    pub body: String,
    /// Attachment URLs/paths (frontmatter `attachments`, comma-separated).
    pub attachments: Vec<String>,
    /// Full frontmatter key/values, so the board can surface user-defined custom
    /// fields declared in the `.board` config without re-reading the file.
    pub properties: HashMap<String, String>,
    /// Card slugs this card is blocked by (frontmatter `blocked_by`).
    pub blocked_by: Vec<String>,
    /// Card slugs this card blocks (frontmatter `blocks`).
    pub blocks: Vec<String>,
    /// Card slugs this card relates to without direction (frontmatter `relates`).
    pub relates: Vec<String>,
    /// Parent card slug (frontmatter `parent`) — makes this card a sub-card.
    pub parent: Option<String>,
}

/// Parse a frontmatter `attachments` value (comma-separated URLs/paths) into a
/// list. Unlike tags, values are kept verbatim (no `#`/`[]` stripping).
fn parse_attachments(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect()
}

/// The body content after the frontmatter block (for previews/excerpts).
fn body_after_frontmatter(content: &str) -> &str {
    let normalized = content.strip_prefix('\u{feff}').unwrap_or(content);
    if let Some(rest) = normalized.strip_prefix("---\n").or_else(|| normalized.strip_prefix("---\r\n")) {
        if let Some(end) = rest.find("\n---") {
            let after = &rest[end + 4..];
            return after.trim_start_matches(['\r', '\n']);
        }
    }
    normalized
}

/// A short single-line preview of the card body (Notion's "Page content" card
/// preview): the first line with visible text, leading Markdown markers stripped.
fn body_excerpt(content: &str) -> Option<String> {
    for line in body_after_frontmatter(content).lines() {
        let stripped = line
            .trim()
            .trim_start_matches(['#', '>', '-', '*', '+', ' '])
            .trim_start_matches("[ ]")
            .trim_start_matches("[x]")
            .trim_start_matches("[X]")
            .trim();
        if stripped.is_empty() {
            continue;
        }
        let mut excerpt: String = stripped.chars().take(120).collect();
        if stripped.chars().count() > 120 {
            excerpt.push('…');
        }
        return Some(excerpt);
    }
    None
}

/// Parse a frontmatter `tags` value (`a, b, c` or `[a, b, c]`, optional `#`
/// prefixes) into a clean list. Frontmatter is flat strings, so this stays lenient.
fn parse_card_tags(raw: &str) -> Vec<String> {
    raw.trim()
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split(',')
        .map(|tag| tag.trim().trim_start_matches('#').trim())
        .filter(|tag| !tag.is_empty())
        .map(str::to_string)
        .collect()
}

/// Parse a frontmatter dependency value (`[[slug-a]], [[slug-b]]`) into a list of
/// card slugs, stripping the `[[ ]]` wikilink wrapper. Mirrors `parse_card_tags`
/// (flat, comma-separated, lenient) but additionally unwraps the brackets so the
/// stored references match the `[[name]]` link tokens used elsewhere.
fn parse_card_links(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|tok| {
            tok.trim()
                .trim_start_matches("[[")
                .trim_end_matches("]]")
                .trim()
        })
        .filter(|tok| !tok.is_empty())
        .map(str::to_string)
        .collect()
}

/// Count Markdown task checkboxes (`- [ ]` / `- [x]`) in a card body, returning
/// (done, total). Frontmatter lines are `key: value` so they never match.
fn count_tasks(content: &str) -> (i64, i64) {
    let mut done = 0;
    let mut total = 0;
    for line in content.lines() {
        let trimmed = line.trim_start();
        let after_bullet = trimmed
            .strip_prefix("- ")
            .or_else(|| trimmed.strip_prefix("* "))
            .or_else(|| trimmed.strip_prefix("+ "));
        let Some(rest) = after_bullet else { continue };
        let bytes = rest.as_bytes();
        if bytes.len() >= 3 && bytes[0] == b'[' && bytes[2] == b']' {
            total += 1;
            if bytes[1] == b'x' || bytes[1] == b'X' {
                done += 1;
            }
        }
    }
    (done, total)
}

/// Walk the vault for Markdown card-notes whose frontmatter `board == board_id`,
/// returning their card metadata (status/position/priority/assignee/due). This is
/// the Dataview-style scan that turns a board into a view over real `.md` notes.
pub fn scan_board_cards(root: &Path, board_id: &str) -> Result<Vec<BoardCardInfo>, String> {
    let mut cards = Vec::new();
    scan_board_cards_inner(root, root, board_id, &mut cards)?;
    cards.sort_by(|a, b| {
        a.status
            .cmp(&b.status)
            .then_with(|| a.position.cmp(&b.position))
    });
    Ok(cards)
}

fn scan_board_cards_inner(
    root: &Path,
    current: &Path,
    board_id: &str,
    cards: &mut Vec<BoardCardInfo>,
) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name == ".git" || file_name == "node_modules" || file_name == "target" || file_name == ".jtype" {
            continue;
        }
        if path.is_dir() {
            scan_board_cards_inner(root, &path, board_id, cards)?;
        } else if is_markdown_path(&path) {
            let content = fs::read_to_string(&path).unwrap_or_default();
            let fm = parse_frontmatter(&content);
            if fm.get("board").map(String::as_str) != Some(board_id) {
                continue;
            }
            let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
            let title = extract_title(&content).unwrap_or_else(|| {
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
                    .to_string()
            });
            let (task_done, task_total) = count_tasks(&content);
            cards.push(BoardCardInfo {
                relative_path: path_to_string(relative),
                path: path_to_string(&path),
                title,
                status: fm.get("status").cloned().unwrap_or_default(),
                position: fm
                    .get("position")
                    .and_then(|v| v.parse::<i64>().ok())
                    .unwrap_or(0),
                priority: fm.get("priority").cloned().filter(|v| !v.is_empty()),
                assignee: fm.get("assignee").cloned().filter(|v| !v.is_empty()),
                due: fm.get("due").cloned().filter(|v| !v.is_empty()),
                tags: fm.get("tags").map(|v| parse_card_tags(v)).unwrap_or_default(),
                task_done,
                task_total,
                icon: fm.get("icon").cloned().filter(|v| !v.is_empty()),
                excerpt: body_excerpt(&content),
                body: body_after_frontmatter(&content).to_string(),
                attachments: fm.get("attachments").map(|v| parse_attachments(v)).unwrap_or_default(),
                properties: fm.clone(),
                blocked_by: fm.get("blocked_by").map(|v| parse_card_links(v)).unwrap_or_default(),
                blocks: fm.get("blocks").map(|v| parse_card_links(v)).unwrap_or_default(),
                relates: fm.get("relates").map(|v| parse_card_links(v)).unwrap_or_default(),
                parent: fm
                    .get("parent")
                    .map(|v| parse_card_links(v))
                    .and_then(|links| links.into_iter().next()),
            });
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardColumnInfo {
    pub key: String,
    pub name: String,
}

/// A `.board` view file's summary: id / title / columns, without loading cards.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardSummaryInfo {
    pub relative_path: String,
    pub id: String,
    pub title: String,
    pub columns: Vec<BoardColumnInfo>,
}

/// Walk the vault for `.board` view files and parse each one's JSON config into a
/// summary (id / title / columns). The board's cards are NOT loaded — call
/// [`scan_board_cards`] with the returned `id` for that.
pub fn list_boards(root: &Path) -> Result<Vec<BoardSummaryInfo>, String> {
    let mut boards = Vec::new();
    list_boards_inner(root, root, &mut boards)?;
    boards.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(boards)
}

fn list_boards_inner(root: &Path, current: &Path, boards: &mut Vec<BoardSummaryInfo>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name == ".git" || file_name == "node_modules" || file_name == "target" || file_name == ".jtype" {
            continue;
        }
        if path.is_dir() {
            list_boards_inner(root, &path, boards)?;
        } else if is_board_path(&path) {
            let content = fs::read_to_string(&path).unwrap_or_default();
            let cfg: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::Value::Null);
            let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
            let stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("board")
                .to_string();
            let id = cfg
                .get("id")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or(&stem)
                .to_string();
            let title = cfg
                .get("title")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or(&id)
                .to_string();
            let columns = cfg
                .get("columns")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|c| {
                            let key = c.get("key").and_then(|v| v.as_str())?.to_string();
                            let name = c
                                .get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or(&key)
                                .to_string();
                            Some(BoardColumnInfo { key, name })
                        })
                        .collect()
                })
                .unwrap_or_default();
            boards.push(BoardSummaryInfo {
                relative_path: path_to_string(relative),
                id,
                title,
                columns,
            });
        }
    }
    Ok(())
}

/// Set (or, with `value == None`, remove) one flat frontmatter field, preserving
/// every other frontmatter line and the body verbatim. Creates a frontmatter
/// block if the content has none. The write-side counterpart to
/// [`parse_frontmatter`]: card mutations compose on it — move = set `status` +
/// `position`; edit = set `priority`/`assignee`/`due`/…; create = set the lot
/// onto a `# Title` body.
pub fn set_frontmatter_field(content: &str, key: &str, value: Option<&str>) -> String {
    let normalized = content.replace("\r\n", "\n");
    let (mut fm_lines, body): (Vec<String>, String) = match normalized.strip_prefix("---\n") {
        Some(rest) => match rest.find("\n---") {
            Some(end) => {
                let fm = rest[..end].lines().map(str::to_string).collect();
                // `rest[end + 1..]` starts at the closing `---`; drop it + leading newlines.
                let body = rest[end + 1..]
                    .strip_prefix("---")
                    .map(|b| b.trim_start_matches('\n').to_string())
                    .unwrap_or_default();
                (fm, body)
            }
            None => (Vec::new(), normalized.clone()),
        },
        None => (Vec::new(), normalized.clone()),
    };

    let pos = fm_lines.iter().position(|line| {
        line.split_once(':')
            .map(|(k, _)| k.trim() == key)
            .unwrap_or(false)
    });
    match (pos, value) {
        (Some(i), Some(v)) => fm_lines[i] = format!("{key}: {v}"),
        (Some(i), None) => {
            fm_lines.remove(i);
        }
        (None, Some(v)) => fm_lines.push(format!("{key}: {v}")),
        (None, None) => {}
    }

    if fm_lines.is_empty() {
        return body;
    }
    format!("---\n{}\n---\n{}", fm_lines.join("\n"), body)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardTemplateInfo {
    pub name: String,
    pub relative_path: String,
    pub path: String,
}

/// List card templates: `.md` files in `<board_dir>/.templates/`. Templates carry
/// no `board:` frontmatter, so they are never picked up as cards by the board scan.
pub fn scan_card_templates(root: &Path, board_dir: &str) -> Result<Vec<CardTemplateInfo>, String> {
    let dir = if board_dir.is_empty() {
        root.join(".templates")
    } else {
        root.join(board_dir).join(".templates")
    };
    let mut out = Vec::new();
    if !dir.exists() {
        return Ok(out);
    }
    for entry in fs::read_dir(&dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !is_markdown_path(&path) {
            continue;
        }
        let content = fs::read_to_string(&path).unwrap_or_default();
        let name = extract_title(&content).unwrap_or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Template")
                .to_string()
        });
        let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
        out.push(CardTemplateInfo {
            name,
            relative_path: path_to_string(relative),
            path: path_to_string(&path),
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
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

pub fn path_to_string(path: &Path) -> String {
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
        let trash_id_prefix = ts_str;
        collect_trash_items(&base, &base, &trash_id_prefix, &mut items, ts);
    }
    items.sort_by(|a, b| b.trashed_at.cmp(&a.trashed_at));
    Ok(items)
}

fn collect_trash_items(
    cur_dir: &Path,
    root_dir: &Path,
    trash_id_prefix: &str,
    items: &mut Vec<TrashItemInfo>,
    ts: u64,
) {
    if !cur_dir.is_dir() {
        return;
    }
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
            let relative_within_trash = format!("{trash_id_prefix}/{relative_str}");
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
            Component::Prefix(_) | Component::RootDir => {
                return Err("Absolute path not allowed.".to_string())
            }
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
    let relative = parts[1].trim_start_matches('/');
    validate_no_path_traversal(ts_dir)?;
    validate_no_path_traversal(relative)?;
    let src = trash_dir(root).join(ts_dir).join(relative);
    if !src.exists() {
        return Err(format!("Trash item not found: {}", trash_id));
    }
    let dest = root.join(relative);
    if dest.exists() {
        return Err(format!(
            "A file already exists at: {}. Remove it first.",
            relative
        ));
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
    let relative = parts[1].trim_start_matches('/');
    validate_no_path_traversal(relative)?;
    let path = trash_dir(root).join(parts[0]).join(relative);
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

// ── Folder operations ──

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderContentsSummary {
    pub folder_name: String,
    pub total_documents: usize,
    pub total_subfolders: usize,
    pub document_names: Vec<String>,
}

pub fn validate_folder_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Folder name cannot be empty.".to_string());
    }
    if name.len() > 255 {
        return Err("Folder name too long.".to_string());
    }
    for segment in name.split('/') {
        let segment = segment.trim();
        if segment.is_empty() {
            continue;
        }
        if segment == "." || segment == ".." || segment == ".jtype" || segment == ".git" || segment == "node_modules" || segment == "target" {
            return Err(format!("'{}' is a reserved name.", segment));
        }
        for c in segment.chars() {
            if matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') {
                return Err(format!("Invalid character '{}' in folder name.", c));
            }
        }
    }
    Ok(())
}

fn collect_docs_in_folder(root: &Path, folder_relative: &str) -> Result<Vec<String>, String> {
    let folder_path = safe_join(root, folder_relative)?;
    if !folder_path.is_dir() {
        return Ok(Vec::new());
    }
    let mut docs = Vec::new();
    collect_docs_recursive(&folder_path, root, &mut docs)?;
    Ok(docs)
}

fn collect_docs_recursive(dir: &Path, root: &Path, docs: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name == ".jtype" || name == ".git" || name == "node_modules" || name == "target" {
                continue;
            }
            collect_docs_recursive(&path, root, docs)?;
        } else if is_markdown_path(&path) {
            let relative = path.strip_prefix(root).map_err(|e| e.to_string())?;
            docs.push(path_to_string(relative));
        }
    }
    Ok(())
}

pub fn create_folder(root: &Path, folder_relative_path: &str) -> Result<(), String> {
    validate_folder_name(folder_relative_path)?;
    let folder_path = safe_join(root, folder_relative_path)?;
    if folder_path.exists() {
        return Err("Folder already exists.".to_string());
    }
    fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create folder: {}", e))
}

pub fn rename_folder(
    root: &Path,
    from_relative: &str,
    to_relative: &str,
) -> Result<Vec<String>, String> {
    let from_path = safe_join(root, from_relative)?;
    if !from_path.is_dir() {
        return Err("Source folder not found.".to_string());
    }
    validate_folder_name(to_relative)?;
    let to_path = safe_join(root, to_relative)?;
    if to_path.exists() {
        return Err("Target folder already exists.".to_string());
    }
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let impacted = collect_docs_in_folder(root, from_relative)?;
    fs::rename(&from_path, &to_path).map_err(|e| e.to_string())?;
    Ok(impacted)
}

pub fn move_folder(
    root: &Path,
    from_relative: &str,
    to_relative: &str,
) -> Result<Vec<String>, String> {
    if to_relative.starts_with(&format!("{}/", from_relative)) {
        return Err("Cannot move folder into itself.".to_string());
    }
    let from_path = safe_join(root, from_relative)?;
    if !from_path.is_dir() {
        return Err("Source folder not found.".to_string());
    }
    let to_path = safe_join(root, to_relative)?;
    if to_path.exists() {
        return Err("Target location already exists.".to_string());
    }
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let impacted = collect_docs_in_folder(root, from_relative)?;
    fs::rename(&from_path, &to_path).map_err(|e| e.to_string())?;
    Ok(impacted)
}

pub fn delete_folder(
    root: &Path,
    folder_relative_path: &str,
    soft_delete: bool,
) -> Result<Vec<String>, String> {
    let folder_path = safe_join(root, folder_relative_path)?;
    if !folder_path.is_dir() {
        return Err("Folder not found.".to_string());
    }
    let impacted = collect_docs_in_folder(root, folder_relative_path)?;
    if impacted.is_empty() {
        fs::remove_dir_all(&folder_path).map_err(|e| e.to_string())?;
        return Ok(Vec::new());
    }
    if soft_delete {
        for doc_relative_path in &impacted {
            trash_entry(root, doc_relative_path)?;
        }
        let _ = fs::remove_dir_all(&folder_path);
    } else {
        fs::remove_dir_all(&folder_path).map_err(|e| e.to_string())?;
    }
    Ok(impacted)
}

pub fn list_folder_contents(
    root: &Path,
    folder_relative_path: &str,
) -> Result<FolderContentsSummary, String> {
    let folder_path = safe_join(root, folder_relative_path)?;
    if !folder_path.is_dir() {
        return Err("Folder not found.".to_string());
    }
    let folder_name = Path::new(folder_relative_path)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or(folder_relative_path)
        .to_string();
    let mut total_documents = 0;
    let mut total_subfolders = 0;
    let mut document_names = Vec::new();
    let entries = fs::read_dir(&folder_path).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name == ".jtype" || name == ".git" || name == "node_modules" || name == "target" {
            continue;
        }
        if path.is_dir() {
            total_subfolders += 1;
        } else if is_markdown_path(&path) {
            total_documents += 1;
            document_names.push(name);
        }
    }
    Ok(FolderContentsSummary {
        folder_name,
        total_documents,
        total_subfolders,
        document_names,
    })
}

// ── Trash metadata for sync ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingTrashOp {
    #[serde(rename = "type")]
    pub op_type: String,
    #[serde(default)]
    pub trash_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashMetadata {
    pub items: Vec<TrashMetadataItem>,
    pub last_synced_clock: i64,
    #[serde(default)]
    pub pending_trash_ops: Vec<PendingTrashOp>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashMetadataItem {
    pub trash_id: String,
    pub relative_path: String,
    pub name: String,
    pub trashed_at: u64,
    pub source: String,
    pub cloud_trash_id: Option<String>,
}

fn trash_metadata_path(root: &Path) -> PathBuf {
    root.join(".jtype").join("trash-metadata.json")
}

pub fn load_trash_metadata(root: &Path) -> Result<TrashMetadata, String> {
    let path = trash_metadata_path(root);
    if !path.exists() {
        return Ok(TrashMetadata {
            items: Vec::new(),
            last_synced_clock: 0,
            pending_trash_ops: Vec::new(),
        });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_trash_metadata(root: &Path, metadata: &TrashMetadata) -> Result<(), String> {
    let path = trash_metadata_path(root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
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
    fn sync_bases_round_trip_board_and_diagram_files() {
        // Regression: load_all_sync_bases must return the SAME file set that
        // collect_sync_documents syncs (markdown + .board + diagram), or
        // conflict detection / deletion propagation silently breaks for the
        // missing types.
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();
        let entries = vec![
            SyncBaseEntry { relative_path: "note.md".into(), content: "# Note".into() },
            SyncBaseEntry { relative_path: "plan.board".into(), content: "{\"id\":\"b\"}".into() },
            SyncBaseEntry { relative_path: "flow.mmd".into(), content: "graph TD; A-->B".into() },
            SyncBaseEntry { relative_path: "arch.drawio".into(), content: "<mxfile/>".into() },
        ];
        save_sync_bases(dir.path(), &entries).unwrap();

        let loaded = load_all_sync_bases(dir.path()).unwrap();

        assert_eq!(loaded.get("note.md").map(String::as_str), Some("# Note"));
        assert_eq!(loaded.get("plan.board").map(String::as_str), Some("{\"id\":\"b\"}"));
        assert_eq!(loaded.get("flow.mmd").map(String::as_str), Some("graph TD; A-->B"));
        assert_eq!(loaded.get("arch.drawio").map(String::as_str), Some("<mxfile/>"));
    }

    #[test]
    fn syncable_document_predicate_covers_all_synced_text_types() {
        // Single source of truth shared by collect_sync_documents,
        // collect_files_recursive, and apply_cloud_documents. If `.board` (or any
        // synced text type) ever falls out of this set, a web-created board stops
        // appearing on desktop — exactly the bug this predicate prevents.
        for ok in [
            "note.md",
            "a.markdown",
            "23232.board",
            "flow.mmd",
            "diagram.mermaid",
            "arch.drawio",
            "sketch.excalidraw",
            "swagger.json",
            "petstore-openapi.yaml",
        ] {
            assert!(
                is_syncable_document_path(Path::new(ok)),
                "{ok} should sync as a document"
            );
        }
        // MUST MATCH the TS fixture in tests/unit/fileTypes.spec.ts.
        for no in [
            "photo.png",
            "doc.pdf",
            "data.csv",
            "notes.txt",
            "archive.zip",
            "image.drawio.svg", // a Draw.io export image — an asset, not a synced document
        ] {
            assert!(
                !is_syncable_document_path(Path::new(no)),
                "{no} should NOT sync as a document"
            );
        }
    }

    #[test]
    fn sync_collect_and_base_gates_agree() {
        // The push gate (collect_sync_documents — a vault walk) and the sync-base
        // gate (load_all_sync_bases → collect_files_recursive — a .jtype/sync-base
        // walk) must produce the SAME path set; both go through
        // is_syncable_document_path. The apply gate (apply_cloud_documents in
        // src-tauri) shares the same predicate and is covered by that crate's
        // tests. If any gate drops a type the others keep, this fails.
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();

        let syncable = [
            "note.md",
            "plan.board",
            "flow.mmd",
            "arch.drawio",
            "sketch.excalidraw",
            "swagger.json",
        ];
        for name in syncable {
            fs::write(dir.path().join(name), "x").unwrap();
        }
        // Non-syncable files that BOTH gates must exclude.
        for name in ["photo.png", "data.txt", "archive.zip"] {
            fs::write(dir.path().join(name), "x").unwrap();
        }

        let expected: std::collections::BTreeSet<String> =
            syncable.iter().map(|s| s.to_string()).collect();

        // Gate 1 — push set.
        let collected: std::collections::BTreeSet<String> = collect_sync_documents(dir.path())
            .unwrap()
            .into_iter()
            .map(|d| d.relative_path)
            .collect();
        assert_eq!(collected, expected, "collect_sync_documents set");

        // Gate 2 — sync-base set. Save bases for the syncable docs AND plant a
        // stray non-syncable base file; load_all_sync_bases must drop it.
        let entries: Vec<SyncBaseEntry> = collect_sync_documents(dir.path())
            .unwrap()
            .into_iter()
            .map(|d| SyncBaseEntry { relative_path: d.relative_path, content: d.content })
            .collect();
        save_sync_bases(dir.path(), &entries).unwrap();
        fs::write(
            dir.path().join(".jtype").join("sync-base").join("stray.png"),
            "x",
        )
        .unwrap();
        let base_keys: std::collections::BTreeSet<String> =
            load_all_sync_bases(dir.path()).unwrap().into_keys().collect();
        assert_eq!(base_keys, expected, "load_all_sync_bases (collect_files_recursive) set");
    }

    #[test]
    fn binary_document_predicate_is_pdf_only() {
        // First-class binary documents (tree entries, blob channel) vs inline
        // images. MUST MATCH the TS fixture in tests/unit/fileTypes.spec.ts.
        for ok in ["doc.pdf", "reports/q3.PDF"] {
            assert!(is_binary_document_path(Path::new(ok)), "{ok} is a binary document");
        }
        for no in ["note.md", "photo.png", "logo.svg", "flow.mmd", "23232.board"] {
            assert!(!is_binary_document_path(Path::new(no)), "{no} is not a binary document");
        }
        for img in ["photo.png", "logo.svg", "a.jpeg", "icon.webp"] {
            assert!(is_image_path(Path::new(img)), "{img} is an image");
        }
        assert!(!is_image_path(Path::new("doc.pdf")));
        // Binary documents sync via the blob channel, NOT the text-document channel.
        assert!(!is_syncable_document_path(Path::new("doc.pdf")));
    }

    #[test]
    fn tree_hides_images_keeps_binary_documents() {
        // Images are inline markdown attachments → hidden from the tree but still
        // collected for blob sync (so `![](path)` embeds resolve). PDFs are
        // first-class binary documents → shown in the tree.
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();
        fs::write(dir.path().join("note.md"), "# n").unwrap();
        fs::write(dir.path().join("doc.pdf"), b"%PDF-1.4").unwrap();
        fs::write(dir.path().join("photo.png"), b"x").unwrap();
        fs::write(dir.path().join("logo.svg"), b"<svg/>").unwrap();

        let snapshot = open_workspace(dir.path()).unwrap();
        let names: std::collections::BTreeSet<String> =
            snapshot.entries.iter().map(|e| e.name.clone()).collect();
        assert!(names.contains("note.md"), "markdown shown in tree");
        assert!(names.contains("doc.pdf"), "pdf (binary document) shown in tree");
        assert!(!names.contains("photo.png"), "png image hidden from tree");
        assert!(!names.contains("logo.svg"), "svg image hidden from tree");

        // Hidden ≠ not synced: images are still collected for the blob pipeline.
        let assets = collect_asset_paths(dir.path()).unwrap();
        assert!(assets.contains(&"photo.png".to_string()), "image still blob-synced");
        assert!(assets.contains(&"logo.svg".to_string()), "svg still blob-synced");
        assert!(assets.contains(&"doc.pdf".to_string()), "pdf blob-synced too");
    }

    #[test]
    fn collects_asset_paths_and_round_trips_sync_state() {
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();
        fs::create_dir_all(dir.path().join("images")).unwrap();
        fs::write(dir.path().join("images/a.png"), b"x").unwrap();
        // avif/bmp/ico must collect too — they're previewable images in the
        // shared registry, so omitting them from the allowlist silently drops
        // them from sync (regression guard).
        fs::write(dir.path().join("images/b.avif"), b"x").unwrap();
        fs::write(dir.path().join("images/c.bmp"), b"x").unwrap();
        fs::write(dir.path().join("favicon.ico"), b"x").unwrap();
        fs::write(dir.path().join("doc.pdf"), b"y").unwrap();
        fs::write(dir.path().join("note.md"), "# n").unwrap();

        let assets = collect_asset_paths(dir.path()).unwrap();
        assert_eq!(
            assets,
            vec![
                "doc.pdf".to_string(),
                "favicon.ico".to_string(),
                "images/a.png".to_string(),
                "images/b.avif".to_string(),
                "images/c.bmp".to_string(),
            ]
        );

        let mut bases = HashMap::new();
        bases.insert("images/a.png".to_string(), "deadbeef".to_string());
        save_asset_sync_state(dir.path(), &AssetSyncState { clock: 7, bases }).unwrap();
        let loaded = load_asset_sync_state(dir.path()).unwrap();
        assert_eq!(loaded.clock, 7);
        assert_eq!(loaded.bases.get("images/a.png").map(String::as_str), Some("deadbeef"));
    }

    #[test]
    fn imports_external_file_into_target_folder() {
        let vault = tempdir().unwrap();
        open_workspace(vault.path()).unwrap();
        let src = tempdir().unwrap();
        let source = src.path().join("photo.png");
        fs::write(&source, b"img-bytes").unwrap();

        let rel = import_external_path(vault.path(), &source, "assets").unwrap();

        assert_eq!(rel, "assets/photo.png");
        assert_eq!(
            fs::read(vault.path().join("assets").join("photo.png")).unwrap(),
            b"img-bytes"
        );
    }

    #[test]
    fn imports_dedupe_name_on_collision() {
        let vault = tempdir().unwrap();
        open_workspace(vault.path()).unwrap();
        let src = tempdir().unwrap();
        let source = src.path().join("doc.pdf");
        fs::write(&source, b"v1").unwrap();

        // First import lands as-is; second collides and gets " 2" before the ext.
        let first = import_external_path(vault.path(), &source, "").unwrap();
        let second = import_external_path(vault.path(), &source, "").unwrap();

        assert_eq!(first, "doc.pdf");
        assert_eq!(second, "doc 2.pdf");
        assert!(vault.path().join("doc.pdf").exists());
        assert!(vault.path().join("doc 2.pdf").exists());
    }

    #[test]
    fn imports_directory_recursively() {
        let vault = tempdir().unwrap();
        open_workspace(vault.path()).unwrap();
        let src = tempdir().unwrap();
        let tree = src.path().join("bundle");
        fs::create_dir_all(tree.join("nested")).unwrap();
        fs::write(tree.join("a.md"), "# A").unwrap();
        fs::write(tree.join("nested").join("b.png"), b"bin").unwrap();

        let rel = import_external_path(vault.path(), &tree, "imported").unwrap();

        assert_eq!(rel, "imported/bundle");
        assert_eq!(
            fs::read_to_string(vault.path().join("imported/bundle/a.md")).unwrap(),
            "# A"
        );
        assert!(vault.path().join("imported/bundle/nested/b.png").exists());
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
    fn classifies_diagram_resources() {
        // Diagram resources by extension and swagger/openapi filename convention.
        assert!(is_diagram_path(Path::new("flow.mmd")));
        assert!(is_diagram_path(Path::new("a/b/notes.mermaid")));
        assert!(is_diagram_path(Path::new("diagram.drawio")));
        assert!(is_diagram_path(Path::new("sketch.excalidraw")));
        assert!(is_diagram_path(Path::new("swagger.json")));
        assert!(is_diagram_path(Path::new("api/openapi.yaml")));
        assert!(is_diagram_path(Path::new("petstore.swagger.yml")));
        assert!(is_diagram_path(Path::new("my-openapi.json")));
        // Not diagram resources.
        assert!(!is_diagram_path(Path::new("note.md")));
        assert!(!is_diagram_path(Path::new("data.json")));
        assert!(!is_diagram_path(Path::new("config.yaml")));
        assert!(!is_diagram_path(Path::new("export.drawio.svg"))); // image export, not XML
        assert!(!is_diagram_path(Path::new("image.png")));
    }

    #[test]
    fn workspace_tree_marks_diagram_kind() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("flow.mmd"), "flowchart TD\n  A --> B").unwrap();
        fs::write(dir.path().join("api.swagger.json"), "{}").unwrap();
        fs::write(dir.path().join("note.md"), "# Hi").unwrap();

        let snapshot = open_workspace(dir.path()).unwrap();
        let kinds: HashMap<String, EntryKind> = snapshot
            .entries
            .iter()
            .map(|node| (node.name.clone(), node.kind.clone()))
            .collect();

        assert_eq!(kinds.get("flow.mmd"), Some(&EntryKind::Diagram));
        assert_eq!(kinds.get("api.swagger.json"), Some(&EntryKind::Diagram));
        assert_eq!(kinds.get("note.md"), Some(&EntryKind::Markdown));
    }

    #[test]
    fn read_write_text_round_trips_diagrams() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("sub/diagram.drawio");
        write_text(&file, "<mxfile></mxfile>").unwrap();
        assert_eq!(read_text(&file).unwrap(), "<mxfile></mxfile>");
    }

    #[test]
    fn sync_documents_include_diagrams_as_drafts() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("flow.mmd"), "graph TD").unwrap();
        fs::write(dir.path().join("note.md"), "# Hi").unwrap();

        let docs = collect_sync_documents(dir.path()).unwrap();
        let diagram = docs.iter().find(|d| d.relative_path == "flow.mmd");
        assert!(diagram.is_some(), "diagram file should sync");
        assert_eq!(diagram.unwrap().status, "draft");
        assert!(docs.iter().any(|d| d.relative_path == "note.md"));
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
    fn moves_nested_entries_to_trash_and_restores_them() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("docs")).unwrap();
        fs::write(dir.path().join("docs").join("first.md"), "# First").unwrap();

        trash_entry(dir.path(), "docs/first.md").unwrap();
        let items = list_trash(dir.path()).unwrap();

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].relative_path, "docs/first.md");
        assert!(!items[0].trash_id.contains("//"));
        restore_from_trash(dir.path(), &items[0].trash_id).unwrap();

        assert_eq!(
            fs::read_to_string(dir.path().join("docs").join("first.md")).unwrap(),
            "# First"
        );
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

    #[test]
    fn collects_sync_folders_including_empty_dirs() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("empty").join("nested")).unwrap();
        fs::create_dir_all(dir.path().join(".jtype")).unwrap();
        fs::create_dir_all(dir.path().join("notes")).unwrap();
        fs::write(dir.path().join("notes").join("first.md"), "# First").unwrap();

        let folders = collect_sync_folders(dir.path()).unwrap();
        let paths: Vec<String> = folders
            .into_iter()
            .map(|folder| folder.relative_path)
            .collect();

        assert!(paths.contains(&"empty".to_string()));
        assert!(paths.contains(&"empty/nested".to_string()));
        assert!(paths.contains(&"notes".to_string()));
        assert!(!paths.contains(&".jtype".to_string()));
    }

    #[test]
    fn creates_and_lists_folder() {
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();
        create_folder(dir.path(), "projects").unwrap();
        assert!(dir.path().join("projects").is_dir());
        // Duplicate creation should fail
        assert!(create_folder(dir.path(), "projects").is_err());
    }

    #[test]
    fn renames_folder_and_reports_impacted_docs() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("meetings")).unwrap();
        fs::write(dir.path().join("meetings").join("standup.md"), "# Standup").unwrap();
        fs::write(dir.path().join("meetings").join("retro.md"), "# Retro").unwrap();

        let impacted = rename_folder(dir.path(), "meetings", "meet-logs").unwrap();
        assert_eq!(impacted.len(), 2);
        assert!(dir.path().join("meet-logs").is_dir());
        assert!(!dir.path().join("meetings").exists());
    }

    #[test]
    fn move_folder_circular_check() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("a").join("b")).unwrap();
        let result = move_folder(dir.path(), "a", "a/b/a");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Cannot move folder into itself"));
    }

    #[test]
    fn deletes_folder_soft_delete_moves_docs_to_trash() {
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();
        fs::create_dir_all(dir.path().join("archive")).unwrap();
        fs::write(dir.path().join("archive").join("old.md"), "# Old").unwrap();

        let impacted = delete_folder(dir.path(), "archive", true).unwrap();
        assert_eq!(impacted.len(), 1);
        assert!(!dir.path().join("archive").exists());
        // Document should be in trash
        let trash_items = list_trash(dir.path()).unwrap();
        assert_eq!(trash_items.len(), 1);
        assert_eq!(trash_items[0].relative_path, "archive/old.md");
    }

    #[test]
    fn validates_folder_name_rejects_reserved() {
        assert!(validate_folder_name(".jtype").is_err());
        assert!(validate_folder_name("..").is_err());
        assert!(validate_folder_name("valid-folder").is_ok());
        assert!(validate_folder_name("a/b/<bad>").is_err());
    }

    #[test]
    fn list_folder_contents_counts_correctly() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("docs").join("sub")).unwrap();
        fs::write(dir.path().join("docs").join("a.md"), "# A").unwrap();
        fs::write(dir.path().join("docs").join("b.md"), "# B").unwrap();

        let summary = list_folder_contents(dir.path(), "docs").unwrap();
        assert_eq!(summary.total_documents, 2);
        assert_eq!(summary.total_subfolders, 1);
        assert_eq!(summary.folder_name, "docs");
    }

    #[test]
    fn trash_metadata_roundtrip() {
        let dir = tempdir().unwrap();
        open_workspace(dir.path()).unwrap();
        let metadata = TrashMetadata {
            items: vec![TrashMetadataItem {
                trash_id: "123/test.md".to_string(),
                relative_path: "test.md".to_string(),
                name: "test.md".to_string(),
                trashed_at: 1000,
                source: "local".to_string(),
                cloud_trash_id: None,
            }],
            last_synced_clock: 42,
            pending_trash_ops: Vec::new(),
        };
        save_trash_metadata(dir.path(), &metadata).unwrap();
        let loaded = load_trash_metadata(dir.path()).unwrap();
        assert_eq!(loaded.items.len(), 1);
        assert_eq!(loaded.last_synced_clock, 42);
        assert_eq!(loaded.items[0].source, "local");
    }

    #[test]
    fn scans_board_cards_by_frontmatter() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::create_dir_all(root.join("roadmap")).unwrap();
        fs::write(
            root.join("roadmap").join("a.md"),
            "---\nboard: rm\nstatus: todo\nposition: 0\npriority: high\nassignee: jack\ntags: api, #design\nicon: 🚀\n---\n# Design API\n\n- [x] sketch\n- [ ] review\n",
        )
        .unwrap();
        fs::write(
            root.join("roadmap").join("b.md"),
            "---\nboard: rm\nstatus: doing\nposition: 1\n---\n# Build UI\n",
        )
        .unwrap();
        // Different board + a plain note must be excluded.
        fs::write(root.join("other.md"), "---\nboard: zzz\nstatus: todo\n---\n# Other\n").unwrap();
        fs::write(root.join("plain.md"), "# Plain note\n").unwrap();

        let cards = scan_board_cards(root, "rm").unwrap();
        assert_eq!(cards.len(), 2);
        let a = cards.iter().find(|c| c.title == "Design API").unwrap();
        assert_eq!(a.status, "todo");
        assert_eq!(a.position, 0);
        assert_eq!(a.priority.as_deref(), Some("high"));
        assert_eq!(a.assignee.as_deref(), Some("jack"));
        assert_eq!(a.tags, vec!["api".to_string(), "design".to_string()]);
        assert_eq!(a.task_done, 1);
        assert_eq!(a.task_total, 2);
        assert_eq!(a.icon.as_deref(), Some("🚀"));
        assert_eq!(a.excerpt.as_deref(), Some("Design API"));
        let b = cards.iter().find(|c| c.title == "Build UI").unwrap();
        assert_eq!(b.status, "doing");
        assert_eq!(b.position, 1);
        assert!(b.priority.is_none());
        assert!(b.tags.is_empty());
        assert_eq!(b.task_total, 0);
    }

    #[test]
    fn set_frontmatter_field_updates_inserts_and_removes() {
        let base = "---\nboard: rm\nstatus: todo\n---\n# Card\n\nbody\n";
        // Update an existing key — this is the card "move" (change status).
        let moved = set_frontmatter_field(base, "status", Some("doing"));
        let fm = parse_frontmatter(&moved);
        assert_eq!(fm.get("status").map(String::as_str), Some("doing"));
        assert_eq!(fm.get("board").map(String::as_str), Some("rm"));
        assert!(moved.contains("# Card") && moved.contains("body"));
        // Insert a key that was absent.
        let with_pri = set_frontmatter_field(&moved, "priority", Some("high"));
        assert_eq!(
            parse_frontmatter(&with_pri).get("priority").map(String::as_str),
            Some("high")
        );
        // Remove a key (clear field).
        let cleared = set_frontmatter_field(&with_pri, "priority", None);
        assert!(parse_frontmatter(&cleared).get("priority").is_none());
        // Create a frontmatter block where the note had none.
        let created = set_frontmatter_field("# Plain\n", "board", Some("rm"));
        assert!(created.starts_with("---\nboard: rm\n---\n"));
    }

    #[test]
    fn list_boards_parses_board_files() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::write(
            root.join("roadmap.board"),
            r#"{"id":"rm","title":"Roadmap","columns":[{"key":"todo","name":"To do"},{"key":"doing","name":"Doing"}]}"#,
        )
        .unwrap();
        fs::write(root.join("note.md"), "# note\n").unwrap();
        let boards = list_boards(root).unwrap();
        assert_eq!(boards.len(), 1);
        assert_eq!(boards[0].id, "rm");
        assert_eq!(boards[0].title, "Roadmap");
        assert_eq!(boards[0].columns.len(), 2);
        assert_eq!(boards[0].columns[0].key, "todo");
        assert_eq!(boards[0].columns[0].name, "To do");
    }

    #[test]
    fn sync_collects_board_files_as_opaque_documents() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::create_dir_all(root.join("jcode")).unwrap();
        fs::write(root.join("jcode.board"), "{\"id\":\"jcode\",\"title\":\"J\",\"columns\":[]}").unwrap();
        fs::write(root.join("jcode").join("a.md"), "---\nboard: jcode\nstatus: todo\n---\n# Card\n").unwrap();

        let docs = collect_sync_documents(root).unwrap();
        let board = docs.iter().find(|d| d.relative_path == "jcode.board").expect("board file synced");
        assert!(board.content.contains("\"id\":\"jcode\""));
        assert_eq!(board.status, "draft"); // never published
        assert_eq!(board.title, "jcode");
        // the card .md syncs as a normal markdown document too
        assert!(docs.iter().any(|d| d.relative_path == "jcode/a.md"));
    }

    #[test]
    fn scans_card_templates_excluding_cards() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::create_dir_all(root.join("sprint").join(".templates")).unwrap();
        fs::write(
            root.join("sprint").join(".templates").join("bug.md"),
            "---\ntitle: Bug report\npriority: high\n---\nSteps to reproduce\n",
        )
        .unwrap();
        fs::write(
            root.join("sprint").join(".templates").join("feature.md"),
            "---\ntitle: Feature\n---\n",
        )
        .unwrap();
        // A real card in the board folder must NOT be listed as a template.
        fs::write(
            root.join("sprint").join("card.md"),
            "---\nboard: sprint\nstatus: todo\n---\n# Card\n",
        )
        .unwrap();

        let tpls = scan_card_templates(root, "sprint").unwrap();
        assert_eq!(tpls.len(), 2);
        // Sorted by name: "Bug report" < "Feature".
        assert_eq!(tpls[0].name, "Bug report");
        assert_eq!(tpls[1].name, "Feature");
        assert!(tpls.iter().all(|t| t.relative_path.contains(".templates")));
        // No templates folder -> empty, not an error.
        assert!(scan_card_templates(root, "other").unwrap().is_empty());
    }

    #[test]
    fn lists_board_files_as_board_kind() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::write(root.join("plan.board"), "{\"id\":\"plan\",\"title\":\"Plan\",\"columns\":[]}").unwrap();
        fs::write(root.join("note.md"), "# Note\n").unwrap();

        let snapshot = open_workspace(root).unwrap();
        let board = snapshot
            .entries
            .iter()
            .find(|e| e.name == "plan.board")
            .expect("board file listed in tree");
        assert!(matches!(board.kind, EntryKind::Board));
    }

    #[test]
    fn parse_card_links_unwraps_wikilinks() {
        assert_eq!(parse_card_links("[[a]], [[b]]"), vec!["a", "b"]);
        assert_eq!(parse_card_links("a, b"), vec!["a", "b"]);
        assert_eq!(parse_card_links("  [[x]]  "), vec!["x"]);
        assert!(parse_card_links("").is_empty());
        assert_eq!(parse_card_links("[[a]], , [[b]]"), vec!["a", "b"]);
    }

    #[test]
    fn scan_board_cards_reads_dependency_frontmatter() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::write(
            root.join("login.md"),
            "---\ntitle: Login\nboard: proj\nstatus: todo\nblocked_by: [[design]], [[api]]\nblocks: [[release]]\nrelates: [[research]]\n---\nbody",
        )
        .unwrap();
        fs::write(
            root.join("design.md"),
            "---\ntitle: Design\nboard: proj\nstatus: todo\n---\n",
        )
        .unwrap();

        let cards = scan_board_cards(root, "proj").unwrap();
        let login = cards.iter().find(|c| c.title == "Login").unwrap();
        assert_eq!(login.blocked_by, vec!["design", "api"]);
        assert_eq!(login.blocks, vec!["release"]);
        assert_eq!(login.relates, vec!["research"]);
        // A card without the keys yields empty vecs (not missing).
        let design = cards.iter().find(|c| c.title == "Design").unwrap();
        assert!(design.blocked_by.is_empty());
    }
}
