use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const MANIFEST_VERSION: u32 = 1;
const MAX_DEPTH: usize = 64;
const MAX_ENTRIES: usize = 50_000;
const BASELINE_FILE: &str = "external-vault-base.json";
const WRITE_BACK_JOURNAL_FILE: &str = "external-vault-writeback.json";
const LOCAL_MUTATION_MARKER_VERSION: &str = "1\n";
pub(crate) const WRITE_BACK_JOURNAL_VERSION: u32 = 1;
const RESERVED_DIRECTORIES: [&str; 4] = [".jtype", ".git", "node_modules", "target"];

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ManifestEntryKind {
    Directory,
    File,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManifestEntry {
    pub kind: ManifestEntryKind,
    pub bytes: u64,
    pub content_hash: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VaultManifest {
    pub version: u32,
    pub revision: String,
    pub entries: BTreeMap<String, ManifestEntry>,
}

impl VaultManifest {
    fn from_entries(entries: BTreeMap<String, ManifestEntry>) -> Self {
        let revision = manifest_revision(&entries);
        Self {
            version: MANIFEST_VERSION,
            revision,
            entries,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ReconcileConflictReason {
    BaselineRequired,
    BothModified,
    SourceDeletedMirrorModified,
    SourceModifiedMirrorDeleted,
    SourceRemovedParentWithLocalChanges,
    UnsafeTypeChange,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReconcileConflict {
    pub relative_path: String,
    pub reason: ReconcileConflictReason,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ReconcileStatus {
    BaselineEstablished,
    Unchanged,
    Pulled,
    LocalChangesPending,
    Conflict,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum WriteBackStatus {
    Unchanged,
    Reconciled,
    Written,
    Conflict,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReconcileOperation {
    relative_path: String,
    source: Option<ManifestEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ReconcilePlan {
    operations: Vec<ReconcileOperation>,
    pub conflicts: Vec<ReconcileConflict>,
    expected_mirror: VaultManifest,
    pub baseline_was_missing: bool,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum WriteBackOperationKind {
    UpsertDirectory,
    UpsertFile,
    Delete,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WriteBackOperation {
    pub relative_path: String,
    pub kind: WriteBackOperationKind,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct WriteBackPlan {
    pub operations: Vec<WriteBackOperation>,
    pub conflicts: Vec<ReconcileConflict>,
}

impl WriteBackPlan {
    pub fn written_files(&self) -> u64 {
        self.operations
            .iter()
            .filter(|operation| operation.kind == WriteBackOperationKind::UpsertFile)
            .count() as u64
    }

    pub fn created_directories(&self) -> u64 {
        self.operations
            .iter()
            .filter(|operation| operation.kind == WriteBackOperationKind::UpsertDirectory)
            .count() as u64
    }

    pub fn deleted_entries(&self) -> u64 {
        self.operations
            .iter()
            .filter(|operation| operation.kind == WriteBackOperationKind::Delete)
            .count() as u64
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WriteBackJournal {
    pub version: u32,
    pub provider_id: String,
    pub source_revision_before: String,
    pub target_revision: String,
    pub operations: Vec<WriteBackOperation>,
    pub created_at: u64,
    pub attempts: u32,
}

impl ReconcilePlan {
    pub fn has_operations(&self) -> bool {
        !self.operations.is_empty()
    }

    pub fn status(&self, source: &VaultManifest) -> ReconcileStatus {
        if !self.conflicts.is_empty() {
            return ReconcileStatus::Conflict;
        }
        if self.baseline_was_missing {
            return ReconcileStatus::BaselineEstablished;
        }
        if !self.operations.is_empty() {
            return ReconcileStatus::Pulled;
        }
        if self.expected_mirror.entries != source.entries {
            return ReconcileStatus::LocalChangesPending;
        }
        ReconcileStatus::Unchanged
    }

    pub fn pulled_files(&self) -> u64 {
        self.operations
            .iter()
            .filter(|operation| {
                operation
                    .source
                    .as_ref()
                    .is_some_and(|entry| entry.kind == ManifestEntryKind::File)
            })
            .count() as u64
    }

    pub fn pulled_directories(&self) -> u64 {
        self.operations
            .iter()
            .filter(|operation| {
                operation
                    .source
                    .as_ref()
                    .is_some_and(|entry| entry.kind == ManifestEntryKind::Directory)
            })
            .count() as u64
    }

    pub fn deleted_entries(&self) -> u64 {
        self.operations
            .iter()
            .filter(|operation| operation.source.is_none())
            .count() as u64
    }

    pub fn pending_local_changes(&self, source: &VaultManifest) -> u64 {
        differing_entry_count(&self.expected_mirror.entries, &source.entries) as u64
    }
}

pub(crate) fn build_manifest(root: &Path) -> Result<VaultManifest, String> {
    if !root.is_dir() {
        return Err(format!(
            "Vault manifest root is unavailable: {}",
            root.display()
        ));
    }
    let mut entries = BTreeMap::new();
    collect_manifest_entries(root, root, 0, &mut entries)?;
    Ok(VaultManifest::from_entries(entries))
}

fn collect_manifest_entries(
    root: &Path,
    current: &Path,
    depth: usize,
    entries: &mut BTreeMap<String, ManifestEntry>,
) -> Result<(), String> {
    if depth > MAX_DEPTH {
        return Err("The external vault exceeds the maximum folder depth".to_string());
    }
    let mut children = fs::read_dir(current)
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    children.sort_by_key(|entry| entry.file_name());

    for child in children {
        let file_type = child.file_type().map_err(|error| error.to_string())?;
        let name = child
            .file_name()
            .into_string()
            .map_err(|_| "External vault paths must be valid UTF-8".to_string())?;
        if file_type.is_dir() && RESERVED_DIRECTORIES.contains(&name.as_str()) {
            continue;
        }
        if file_type.is_symlink() {
            return Err(format!(
                "Symbolic links are not supported in external vault mirrors: {name}"
            ));
        }
        if entries.len() >= MAX_ENTRIES {
            return Err("The external vault contains too many entries".to_string());
        }

        let path = child.path();
        let relative_path = normalized_relative_path(root, &path)?;
        if file_type.is_dir() {
            entries.insert(
                relative_path,
                ManifestEntry {
                    kind: ManifestEntryKind::Directory,
                    bytes: 0,
                    content_hash: None,
                },
            );
            collect_manifest_entries(root, &path, depth + 1, entries)?;
        } else if file_type.is_file() {
            let (bytes, content_hash) = hash_file(&path)?;
            entries.insert(
                relative_path,
                ManifestEntry {
                    kind: ManifestEntryKind::File,
                    bytes,
                    content_hash: Some(content_hash),
                },
            );
        } else {
            return Err(format!(
                "Unsupported external vault entry: {}",
                path.display()
            ));
        }
    }
    Ok(())
}

fn normalized_relative_path(root: &Path, path: &Path) -> Result<String, String> {
    let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
    let mut parts = Vec::new();
    for component in relative.components() {
        match component {
            Component::Normal(part) => parts.push(
                part.to_str()
                    .ok_or_else(|| "External vault paths must be valid UTF-8".to_string())?,
            ),
            _ => return Err("External vault paths must stay relative".to_string()),
        }
    }
    if parts.is_empty() {
        return Err("External vault entry has an empty relative path".to_string());
    }
    Ok(parts.join("/"))
}

fn hash_file(path: &Path) -> Result<(u64, String), String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    let mut bytes = 0_u64;
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        bytes += read as u64;
    }
    Ok((bytes, hex::encode(hasher.finalize())))
}

fn manifest_revision(entries: &BTreeMap<String, ManifestEntry>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(MANIFEST_VERSION.to_le_bytes());
    for (path, entry) in entries {
        hasher.update((path.len() as u64).to_le_bytes());
        hasher.update(path.as_bytes());
        hasher.update([match entry.kind {
            ManifestEntryKind::Directory => 0,
            ManifestEntryKind::File => 1,
        }]);
        hasher.update(entry.bytes.to_le_bytes());
        if let Some(content_hash) = &entry.content_hash {
            hasher.update(content_hash.as_bytes());
        }
    }
    hex::encode(hasher.finalize())
}

pub(crate) fn load_baseline(root: &Path) -> Result<Option<VaultManifest>, String> {
    let path = baseline_path(root);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let manifest: VaultManifest =
        serde_json::from_str(&content).map_err(|error| error.to_string())?;
    if manifest.version != MANIFEST_VERSION {
        return Err(format!(
            "Unsupported external vault baseline version: {}",
            manifest.version
        ));
    }
    if manifest.revision != manifest_revision(&manifest.entries) {
        return Err("External vault baseline integrity check failed".to_string());
    }
    Ok(Some(manifest))
}

pub(crate) fn trusted_baseline<'a>(
    baseline: Option<&'a VaultManifest>,
    recorded_revision: Option<&str>,
) -> Option<&'a VaultManifest> {
    baseline.filter(|manifest| recorded_revision == Some(manifest.revision.as_str()))
}

pub(crate) fn save_baseline(root: &Path, manifest: &VaultManifest) -> Result<(), String> {
    let metadata_dir = root.join(".jtype");
    fs::create_dir_all(&metadata_dir).map_err(|error| error.to_string())?;
    let target = baseline_path(root);
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let temporary = metadata_dir.join(format!(".{BASELINE_FILE}.tmp-{nonce}"));
    let json = serde_json::to_vec_pretty(manifest).map_err(|error| error.to_string())?;
    fs::write(&temporary, json).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&temporary, &target) {
        let _ = fs::remove_file(&temporary);
        return Err(error.to_string());
    }
    Ok(())
}

fn baseline_path(root: &Path) -> PathBuf {
    root.join(".jtype").join(BASELINE_FILE)
}

pub(crate) fn plan_reconcile(
    baseline: Option<&VaultManifest>,
    source: &VaultManifest,
    mirror: &VaultManifest,
) -> ReconcilePlan {
    let baseline_was_missing = baseline.is_none();
    if baseline.is_none() {
        let conflicts = differing_paths(&source.entries, &mirror.entries)
            .into_iter()
            .map(|relative_path| ReconcileConflict {
                relative_path,
                reason: ReconcileConflictReason::BaselineRequired,
            })
            .collect();
        return ReconcilePlan {
            operations: Vec::new(),
            conflicts,
            expected_mirror: mirror.clone(),
            baseline_was_missing,
        };
    }

    let baseline = baseline.expect("baseline checked above");
    let paths = all_paths(&baseline.entries, &source.entries, &mirror.entries);
    let mut operations = Vec::new();
    let mut conflicts = BTreeMap::new();
    let mut mirror_changed_paths = BTreeSet::new();

    for path in &paths {
        let base_entry = baseline.entries.get(path);
        let source_entry = source.entries.get(path);
        let mirror_entry = mirror.entries.get(path);
        let source_changed = source_entry != base_entry;
        let mirror_changed = mirror_entry != base_entry;
        if mirror_changed {
            mirror_changed_paths.insert(path.clone());
        }

        if source_changed && mirror_changed && source_entry != mirror_entry {
            conflicts.insert(path.clone(), conflict_reason(source_entry, mirror_entry));
        } else if source_changed && source_entry != mirror_entry {
            operations.push(ReconcileOperation {
                relative_path: path.clone(),
                source: source_entry.cloned(),
            });
        }
    }

    for operation in &operations {
        let base_was_directory = baseline
            .entries
            .get(&operation.relative_path)
            .is_some_and(|entry| entry.kind == ManifestEntryKind::Directory);
        let source_is_directory = operation
            .source
            .as_ref()
            .is_some_and(|entry| entry.kind == ManifestEntryKind::Directory);
        if !base_was_directory || source_is_directory {
            continue;
        }
        let prefix = format!("{}/", operation.relative_path);
        for changed_path in mirror_changed_paths
            .iter()
            .filter(|path| path.starts_with(&prefix))
        {
            if source.entries.get(changed_path) != mirror.entries.get(changed_path) {
                conflicts
                    .entry(changed_path.clone())
                    .or_insert(ReconcileConflictReason::SourceRemovedParentWithLocalChanges);
            }
        }
    }

    let mut expected_entries = mirror.entries.clone();
    if conflicts.is_empty() {
        for operation in &operations {
            if let Some(source_entry) = &operation.source {
                expected_entries.insert(operation.relative_path.clone(), source_entry.clone());
            } else {
                expected_entries.remove(&operation.relative_path);
            }
        }
    }

    ReconcilePlan {
        operations,
        conflicts: conflicts
            .into_iter()
            .map(|(relative_path, reason)| ReconcileConflict {
                relative_path,
                reason,
            })
            .collect(),
        expected_mirror: VaultManifest::from_entries(expected_entries),
        baseline_was_missing,
    }
}

fn conflict_reason(
    source: Option<&ManifestEntry>,
    mirror: Option<&ManifestEntry>,
) -> ReconcileConflictReason {
    match (source, mirror) {
        (None, Some(_)) => ReconcileConflictReason::SourceDeletedMirrorModified,
        (Some(_), None) => ReconcileConflictReason::SourceModifiedMirrorDeleted,
        _ => ReconcileConflictReason::BothModified,
    }
}

fn all_paths(
    first: &BTreeMap<String, ManifestEntry>,
    second: &BTreeMap<String, ManifestEntry>,
    third: &BTreeMap<String, ManifestEntry>,
) -> BTreeSet<String> {
    first
        .keys()
        .chain(second.keys())
        .chain(third.keys())
        .cloned()
        .collect()
}

fn differing_paths(
    first: &BTreeMap<String, ManifestEntry>,
    second: &BTreeMap<String, ManifestEntry>,
) -> Vec<String> {
    first
        .keys()
        .chain(second.keys())
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .filter(|path| first.get(path) != second.get(path))
        .collect()
}

fn differing_entry_count(
    first: &BTreeMap<String, ManifestEntry>,
    second: &BTreeMap<String, ManifestEntry>,
) -> usize {
    differing_paths(first, second).len()
}

pub(crate) fn plan_write_back(source: &VaultManifest, mirror: &VaultManifest) -> WriteBackPlan {
    let paths = source
        .entries
        .keys()
        .chain(mirror.entries.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    let mut operations = Vec::new();
    let mut conflicts = Vec::new();

    for path in paths {
        let source_entry = source.entries.get(&path);
        let mirror_entry = mirror.entries.get(&path);
        if source_entry == mirror_entry {
            continue;
        }
        if source_entry
            .zip(mirror_entry)
            .is_some_and(|(source, mirror)| source.kind != mirror.kind)
        {
            conflicts.push(ReconcileConflict {
                relative_path: path,
                reason: ReconcileConflictReason::UnsafeTypeChange,
            });
            continue;
        }
        let kind = match mirror_entry.map(|entry| entry.kind) {
            Some(ManifestEntryKind::Directory) => WriteBackOperationKind::UpsertDirectory,
            Some(ManifestEntryKind::File) => WriteBackOperationKind::UpsertFile,
            None => WriteBackOperationKind::Delete,
        };
        operations.push(WriteBackOperation {
            relative_path: path,
            kind,
        });
    }

    operations.sort_by(|first, second| {
        let first_key = write_back_order(first);
        let second_key = write_back_order(second);
        first_key.cmp(&second_key)
    });
    WriteBackPlan {
        operations,
        conflicts,
    }
}

fn write_back_order(operation: &WriteBackOperation) -> (u8, usize, &str) {
    match operation.kind {
        WriteBackOperationKind::UpsertDirectory => (
            0,
            path_depth(&operation.relative_path),
            &operation.relative_path,
        ),
        WriteBackOperationKind::UpsertFile => (
            1,
            path_depth(&operation.relative_path),
            &operation.relative_path,
        ),
        WriteBackOperationKind::Delete => (
            2,
            usize::MAX - path_depth(&operation.relative_path),
            &operation.relative_path,
        ),
    }
}

pub(crate) fn load_write_back_journal(root: &Path) -> Result<Option<WriteBackJournal>, String> {
    let path = write_back_journal_path(root);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let journal: WriteBackJournal =
        serde_json::from_str(&content).map_err(|error| error.to_string())?;
    if journal.version != WRITE_BACK_JOURNAL_VERSION {
        return Err(format!(
            "Unsupported external vault write-back journal version: {}",
            journal.version
        ));
    }
    Ok(Some(journal))
}

pub(crate) fn save_write_back_journal(
    root: &Path,
    journal: &WriteBackJournal,
) -> Result<(), String> {
    let metadata_dir = root.join(".jtype");
    fs::create_dir_all(&metadata_dir).map_err(|error| error.to_string())?;
    let target = write_back_journal_path(root);
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let temporary = metadata_dir.join(format!(".{WRITE_BACK_JOURNAL_FILE}.tmp-{nonce}"));
    let json = serde_json::to_vec_pretty(journal).map_err(|error| error.to_string())?;
    fs::write(&temporary, json).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&temporary, &target) {
        let _ = fs::remove_file(&temporary);
        return Err(error.to_string());
    }
    Ok(())
}

pub(crate) fn clear_write_back_journal(root: &Path) -> Result<bool, String> {
    let path = write_back_journal_path(root);
    if !path.exists() {
        return Ok(false);
    }
    fs::remove_file(path).map_err(|error| error.to_string())?;
    Ok(true)
}

fn write_back_journal_path(root: &Path) -> PathBuf {
    root.join(".jtype").join(WRITE_BACK_JOURNAL_FILE)
}

/// Restores a mirror when the app stopped while an existing shared command was
/// changing local files, before a SAF write-back journal could be established.
/// A write-back journal means the local mutation completed and source recovery
/// must continue forward instead of rolling the mirror back.
pub(crate) fn recover_interrupted_local_mutation(mirror_root: &Path) -> Result<bool, String> {
    let marker = transaction_sibling(mirror_root, "local-mutation")?;
    let backup = transaction_sibling(mirror_root, "local-mutation-backup")?;
    let failed = transaction_sibling(mirror_root, "local-mutation-failed")?;
    let temporary = transaction_sibling(mirror_root, "local-mutation.tmp")?;

    if temporary.exists() {
        fs::remove_file(&temporary).map_err(|error| error.to_string())?;
    }

    if !marker.exists() {
        if backup.exists() {
            fs::remove_dir_all(&backup).map_err(|error| error.to_string())?;
        }
        if failed.exists() {
            fs::remove_dir_all(&failed).map_err(|error| error.to_string())?;
        }
        return Ok(false);
    }

    if mirror_root.is_dir() && write_back_journal_path(mirror_root).exists() {
        return Ok(true);
    }

    if backup.exists() {
        if mirror_root.exists() {
            if failed.exists() {
                fs::remove_dir_all(&failed).map_err(|error| error.to_string())?;
            }
            fs::rename(mirror_root, &failed).map_err(|error| {
                format!("Could not isolate interrupted external vault mutation: {error}")
            })?;
        }
        if let Err(error) = fs::rename(&backup, mirror_root) {
            if failed.exists() && !mirror_root.exists() {
                let _ = fs::rename(&failed, mirror_root);
            }
            return Err(format!(
                "Could not restore interrupted external vault mutation: {error}"
            ));
        }
    }

    if !mirror_root.is_dir() {
        return Err("External vault mirror is unavailable after mutation recovery".to_string());
    }
    if failed.exists() {
        fs::remove_dir_all(&failed).map_err(|error| error.to_string())?;
    }
    fs::remove_file(&marker).map_err(|error| error.to_string())?;
    Ok(false)
}

pub(crate) fn begin_local_mutation(mirror_root: &Path) -> Result<(), String> {
    if recover_interrupted_local_mutation(mirror_root)?
        || write_back_journal_path(mirror_root).exists()
    {
        return Err(
            "External vault has a pending write-back; recover it before another mutation"
                .to_string(),
        );
    }
    let marker = transaction_sibling(mirror_root, "local-mutation")?;
    let backup = transaction_sibling(mirror_root, "local-mutation-backup")?;
    copy_tree(mirror_root, &backup)?;

    let temporary = transaction_sibling(mirror_root, "local-mutation.tmp")?;
    fs::write(&temporary, LOCAL_MUTATION_MARKER_VERSION).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&temporary, &marker) {
        let _ = fs::remove_file(&temporary);
        let _ = fs::remove_dir_all(&backup);
        return Err(error.to_string());
    }
    Ok(())
}

pub(crate) fn rollback_local_mutation(mirror_root: &Path) -> Result<(), String> {
    let marker = transaction_sibling(mirror_root, "local-mutation")?;
    let backup = transaction_sibling(mirror_root, "local-mutation-backup")?;
    if !marker.exists() || !backup.exists() {
        return recover_interrupted_local_mutation(mirror_root).map(|_| ());
    }
    if write_back_journal_path(mirror_root).exists() {
        return Err("External vault mutation already has a pending write-back".to_string());
    }
    recover_interrupted_local_mutation(mirror_root).map(|_| ())
}

pub(crate) fn commit_local_mutation(mirror_root: &Path) -> Result<(), String> {
    let marker = transaction_sibling(mirror_root, "local-mutation")?;
    let backup = transaction_sibling(mirror_root, "local-mutation-backup")?;
    let failed = transaction_sibling(mirror_root, "local-mutation-failed")?;
    if backup.exists() {
        fs::remove_dir_all(&backup).map_err(|error| error.to_string())?;
    }
    if failed.exists() {
        fs::remove_dir_all(&failed).map_err(|error| error.to_string())?;
    }
    if marker.exists() {
        fs::remove_file(marker).map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub(crate) fn recover_interrupted_reconcile(mirror_root: &Path) -> Result<(), String> {
    let stage = transaction_sibling(mirror_root, "reconciling")?;
    let backup = transaction_sibling(mirror_root, "reconcile-backup")?;

    if !mirror_root.exists() && backup.exists() {
        fs::rename(&backup, mirror_root).map_err(|error| {
            format!("Could not restore interrupted external vault reconcile: {error}")
        })?;
    }
    if mirror_root.exists() && backup.exists() {
        fs::remove_dir_all(&backup).map_err(|error| error.to_string())?;
    }
    if stage.exists() {
        fs::remove_dir_all(&stage).map_err(|error| error.to_string())?;
    }
    if !mirror_root.is_dir() {
        return Err("External vault mirror is unavailable".to_string());
    }
    Ok(())
}

pub(crate) fn apply_reconcile_plan(
    mirror_root: &Path,
    source_snapshot: &Path,
    plan: &ReconcilePlan,
) -> Result<(), String> {
    if !plan.conflicts.is_empty() {
        return Err("A reconcile plan with conflicts can not be applied".to_string());
    }
    recover_interrupted_reconcile(mirror_root)?;
    let stage = transaction_sibling(mirror_root, "reconciling")?;
    let backup = transaction_sibling(mirror_root, "reconcile-backup")?;
    copy_tree(mirror_root, &stage)?;

    let result = (|| {
        let mut deletions = plan.operations.iter().collect::<Vec<_>>();
        deletions.sort_by_key(|operation| std::cmp::Reverse(path_depth(&operation.relative_path)));
        for operation in deletions {
            let target = safe_relative_join(&stage, &operation.relative_path)?;
            if target.exists() {
                remove_node(&target)?;
            }
        }

        let mut directories = plan
            .operations
            .iter()
            .filter(|operation| {
                operation
                    .source
                    .as_ref()
                    .is_some_and(|entry| entry.kind == ManifestEntryKind::Directory)
            })
            .collect::<Vec<_>>();
        directories.sort_by_key(|operation| path_depth(&operation.relative_path));
        for operation in directories {
            let target = safe_relative_join(&stage, &operation.relative_path)?;
            fs::create_dir_all(target).map_err(|error| error.to_string())?;
        }

        for operation in plan.operations.iter().filter(|operation| {
            operation
                .source
                .as_ref()
                .is_some_and(|entry| entry.kind == ManifestEntryKind::File)
        }) {
            let source = safe_relative_join(source_snapshot, &operation.relative_path)?;
            let target = safe_relative_join(&stage, &operation.relative_path)?;
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            fs::copy(source, target).map_err(|error| error.to_string())?;
        }

        let staged_manifest = build_manifest(&stage)?;
        if staged_manifest.entries != plan.expected_mirror.entries {
            return Err("Reconciled mirror failed its manifest integrity check".to_string());
        }
        Ok(())
    })();
    if let Err(error) = result {
        let _ = fs::remove_dir_all(&stage);
        return Err(error);
    }

    fs::rename(mirror_root, &backup).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&stage, mirror_root) {
        let rollback = fs::rename(&backup, mirror_root);
        let _ = fs::remove_dir_all(&stage);
        return match rollback {
            Ok(()) => Err(format!("Could not activate reconciled mirror: {error}")),
            Err(rollback_error) => Err(format!(
                "Could not activate reconciled mirror ({error}) or restore its backup ({rollback_error})"
            )),
        };
    }
    fs::remove_dir_all(&backup).map_err(|error| error.to_string())?;
    Ok(())
}

/// Atomically replaces one conflicted path (including its managed subtree)
/// in the mirror with the current source version. The regular reconcile plan
/// remains responsible for advancing the baseline after all conflicts have
/// converged.
pub(crate) fn apply_source_conflict_resolution(
    mirror_root: &Path,
    source_snapshot: &Path,
    relative_path: &str,
) -> Result<(), String> {
    // Validate the path even when neither side currently contains it.
    safe_relative_join(mirror_root, relative_path)?;
    safe_relative_join(source_snapshot, relative_path)?;

    let source = build_manifest(source_snapshot)?;
    let mirror = build_manifest(mirror_root)?;
    let prefix = format!("{relative_path}/");
    let affected_paths = source
        .entries
        .keys()
        .chain(mirror.entries.keys())
        .filter(|path| path.as_str() == relative_path || path.starts_with(&prefix))
        .cloned()
        .collect::<BTreeSet<_>>();
    if affected_paths.is_empty() {
        return Err("The external vault conflict path no longer exists".to_string());
    }

    let operations = affected_paths
        .iter()
        .map(|path| ReconcileOperation {
            relative_path: path.clone(),
            source: source.entries.get(path).cloned(),
        })
        .collect::<Vec<_>>();
    let mut expected_entries = mirror.entries.clone();
    expected_entries.retain(|path, _| path.as_str() != relative_path && !path.starts_with(&prefix));
    for path in &affected_paths {
        if let Some(entry) = source.entries.get(path) {
            expected_entries.insert(path.clone(), entry.clone());
        }
    }

    apply_reconcile_plan(
        mirror_root,
        source_snapshot,
        &ReconcilePlan {
            operations,
            conflicts: Vec::new(),
            expected_mirror: VaultManifest::from_entries(expected_entries),
            baseline_was_missing: false,
        },
    )
}

fn transaction_sibling(root: &Path, suffix: &str) -> Result<PathBuf, String> {
    let parent = root
        .parent()
        .ok_or_else(|| "External vault mirror has no parent directory".to_string())?;
    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "External vault mirror has an invalid name".to_string())?;
    Ok(parent.join(format!(".{name}.{suffix}")))
}

fn safe_relative_join(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.is_empty() || relative_path.contains('\\') {
        return Err("External vault reconcile path is invalid".to_string());
    }
    let mut target = root.to_path_buf();
    for component in Path::new(relative_path).components() {
        match component {
            Component::Normal(part) => target.push(part),
            _ => return Err("External vault reconcile path must stay relative".to_string()),
        }
    }
    Ok(target)
}

fn copy_tree(source: &Path, target: &Path) -> Result<(), String> {
    if target.exists() {
        return Err(format!(
            "External vault transaction path already exists: {}",
            target.display()
        ));
    }
    fs::create_dir(target).map_err(|error| error.to_string())?;
    let result = copy_tree_contents(source, target);
    if result.is_err() {
        let _ = fs::remove_dir_all(target);
    }
    result
}

fn copy_tree_contents(source: &Path, target: &Path) -> Result<(), String> {
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let file_type = entry.file_type().map_err(|error| error.to_string())?;
        if file_type.is_symlink() {
            return Err(format!(
                "Symbolic links are not supported in external vault mirrors: {}",
                entry.path().display()
            ));
        }
        let destination = target.join(entry.file_name());
        if file_type.is_dir() {
            fs::create_dir(&destination).map_err(|error| error.to_string())?;
            copy_tree_contents(&entry.path(), &destination)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), destination).map_err(|error| error.to_string())?;
        } else {
            return Err(format!(
                "Unsupported external vault mirror entry: {}",
                entry.path().display()
            ));
        }
    }
    Ok(())
}

fn remove_node(path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path).map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() {
        return Err("Symbolic links are not supported in external vault mirrors".to_string());
    }
    if metadata.is_dir() {
        // Managed descendants are removed deepest-first by the plan. A
        // remaining excluded/local-only entry must stop the transaction rather
        // than being swallowed by a recursive parent deletion.
        fs::remove_dir(path).map_err(|error| error.to_string())
    } else {
        fs::remove_file(path).map_err(|error| error.to_string())
    }
}

fn path_depth(path: &str) -> usize {
    path.bytes().filter(|byte| *byte == b'/').count()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(root: &Path, relative: &str, content: &str) {
        let path = root.join(relative);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, content).unwrap();
    }

    #[test]
    fn manifest_hashes_content_and_ignores_reserved_directories() {
        let root = tempfile::tempdir().unwrap();
        write(root.path(), "intro.md", "hello");
        write(root.path(), "guides/setup.md", "setup");
        write(root.path(), ".jtype/private.json", "ignored");

        let first = build_manifest(root.path()).unwrap();
        assert_eq!(first.entries.len(), 3);
        assert!(first.entries.contains_key("guides"));
        assert!(!first.entries.contains_key(".jtype"));

        write(root.path(), "intro.md", "changed");
        let second = build_manifest(root.path()).unwrap();
        assert_ne!(first.revision, second.revision);
        assert_ne!(first.entries["intro.md"], second.entries["intro.md"]);
    }

    #[test]
    fn reconcile_pulls_only_source_changes_when_mirror_matches_baseline() {
        let fixture = tempfile::tempdir().unwrap();
        let baseline_root = fixture.path().join("baseline");
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        for root in [&baseline_root, &source_root, &mirror_root] {
            fs::create_dir_all(root).unwrap();
            write(root, "intro.md", "base");
            write(root, "removed.md", "remove me");
        }
        write(&source_root, "intro.md", "source edit");
        fs::remove_file(source_root.join("removed.md")).unwrap();
        write(&source_root, "guides/setup.md", "new");

        let baseline = build_manifest(&baseline_root).unwrap();
        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let plan = plan_reconcile(Some(&baseline), &source, &mirror);

        assert!(plan.conflicts.is_empty());
        assert_eq!(plan.status(&source), ReconcileStatus::Pulled);
        assert_eq!(plan.pulled_files(), 2);
        assert_eq!(plan.pulled_directories(), 1);
        assert_eq!(plan.deleted_entries(), 1);
        assert_eq!(plan.pending_local_changes(&source), 0);
    }

    #[test]
    fn reconcile_reports_both_modified_without_overwriting() {
        let fixture = tempfile::tempdir().unwrap();
        let baseline_root = fixture.path().join("baseline");
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        for root in [&baseline_root, &source_root, &mirror_root] {
            fs::create_dir_all(root).unwrap();
        }
        write(&baseline_root, "intro.md", "base");
        write(&source_root, "intro.md", "source");
        write(&mirror_root, "intro.md", "mirror");

        let baseline = build_manifest(&baseline_root).unwrap();
        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let plan = plan_reconcile(Some(&baseline), &source, &mirror);

        assert_eq!(plan.status(&source), ReconcileStatus::Conflict);
        assert_eq!(
            plan.conflicts,
            vec![ReconcileConflict {
                relative_path: "intro.md".to_string(),
                reason: ReconcileConflictReason::BothModified,
            }]
        );
    }

    #[test]
    fn source_conflict_resolution_replaces_only_the_selected_subtree() {
        let fixture = tempfile::tempdir().unwrap();
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        for root in [&source_root, &mirror_root] {
            fs::create_dir_all(root).unwrap();
            write(root, "untouched.md", "same");
        }
        write(&source_root, "notes/conflict.md", "source");
        write(&source_root, "notes/source-only.md", "source child");
        write(&mirror_root, "notes/conflict.md", "mirror");
        write(&mirror_root, "notes/mirror-only.md", "mirror child");

        apply_source_conflict_resolution(&mirror_root, &source_root, "notes").unwrap();

        assert_eq!(
            fs::read_to_string(mirror_root.join("notes/conflict.md")).unwrap(),
            "source"
        );
        assert!(mirror_root.join("notes/source-only.md").is_file());
        assert!(!mirror_root.join("notes/mirror-only.md").exists());
        assert_eq!(
            fs::read_to_string(mirror_root.join("untouched.md")).unwrap(),
            "same"
        );
    }

    #[test]
    fn source_parent_removal_conflicts_with_local_descendant_addition() {
        let fixture = tempfile::tempdir().unwrap();
        let baseline_root = fixture.path().join("baseline");
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        for root in [&baseline_root, &source_root, &mirror_root] {
            fs::create_dir_all(root).unwrap();
        }
        write(&baseline_root, "guides/setup.md", "base");
        write(&mirror_root, "guides/setup.md", "base");
        write(&mirror_root, "guides/local.md", "local");

        let baseline = build_manifest(&baseline_root).unwrap();
        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let plan = plan_reconcile(Some(&baseline), &source, &mirror);

        assert!(plan.conflicts.iter().any(|conflict| {
            conflict.relative_path == "guides/local.md"
                && conflict.reason == ReconcileConflictReason::SourceRemovedParentWithLocalChanges
        }));
    }

    #[test]
    fn missing_baseline_only_bootstraps_equal_trees() {
        let fixture = tempfile::tempdir().unwrap();
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        fs::create_dir_all(&source_root).unwrap();
        fs::create_dir_all(&mirror_root).unwrap();
        write(&source_root, "intro.md", "same");
        write(&mirror_root, "intro.md", "same");

        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let clean = plan_reconcile(None, &source, &mirror);
        assert_eq!(clean.status(&source), ReconcileStatus::BaselineEstablished);
        assert!(clean.conflicts.is_empty());

        write(&mirror_root, "intro.md", "different");
        let changed_mirror = build_manifest(&mirror_root).unwrap();
        let guarded = plan_reconcile(None, &source, &changed_mirror);
        assert_eq!(guarded.status(&source), ReconcileStatus::Conflict);
        assert_eq!(
            guarded.conflicts[0].reason,
            ReconcileConflictReason::BaselineRequired
        );
    }

    #[test]
    fn baseline_is_trusted_only_when_the_provider_revision_matches() {
        let root = tempfile::tempdir().unwrap();
        write(root.path(), "intro.md", "base");
        let baseline = build_manifest(root.path()).unwrap();

        assert!(trusted_baseline(Some(&baseline), Some(&baseline.revision)).is_some());
        assert!(trusted_baseline(Some(&baseline), Some("stale-revision")).is_none());
        assert!(trusted_baseline(Some(&baseline), None).is_none());
    }

    #[test]
    fn apply_plan_swaps_atomically_and_preserves_private_metadata() {
        let fixture = tempfile::tempdir().unwrap();
        let baseline_root = fixture.path().join("baseline");
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        for root in [&baseline_root, &source_root, &mirror_root] {
            fs::create_dir_all(root).unwrap();
            write(root, "intro.md", "base");
            write(root, "removed.md", "remove");
        }
        write(&mirror_root, ".jtype/workspace.json", "private");
        write(&source_root, "intro.md", "source");
        fs::remove_file(source_root.join("removed.md")).unwrap();
        write(&source_root, "guides/setup.md", "new");

        let baseline = build_manifest(&baseline_root).unwrap();
        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let plan = plan_reconcile(Some(&baseline), &source, &mirror);
        apply_reconcile_plan(&mirror_root, &source_root, &plan).unwrap();

        assert_eq!(build_manifest(&mirror_root).unwrap(), source);
        assert_eq!(
            fs::read_to_string(mirror_root.join(".jtype/workspace.json")).unwrap(),
            "private"
        );
        assert!(!fixture.path().join(".mirror.reconciling").exists());
        assert!(!fixture.path().join(".mirror.reconcile-backup").exists());
    }

    #[test]
    fn interrupted_swap_restores_backup_before_reconcile() {
        let fixture = tempfile::tempdir().unwrap();
        let mirror_root = fixture.path().join("mirror");
        let backup = fixture.path().join(".mirror.reconcile-backup");
        fs::create_dir_all(&backup).unwrap();
        write(&backup, "intro.md", "safe");

        recover_interrupted_reconcile(&mirror_root).unwrap();

        assert_eq!(
            fs::read_to_string(mirror_root.join("intro.md")).unwrap(),
            "safe"
        );
        assert!(!backup.exists());
    }

    #[test]
    fn parent_deletion_does_not_swallow_excluded_local_content() {
        let fixture = tempfile::tempdir().unwrap();
        let baseline_root = fixture.path().join("baseline");
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        for root in [&baseline_root, &source_root, &mirror_root] {
            fs::create_dir_all(root).unwrap();
        }
        write(&baseline_root, "guides/setup.md", "base");
        write(&mirror_root, "guides/setup.md", "base");
        write(&mirror_root, "guides/.git/config", "local metadata");

        let baseline = build_manifest(&baseline_root).unwrap();
        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let plan = plan_reconcile(Some(&baseline), &source, &mirror);
        assert!(plan.conflicts.is_empty());

        let error = apply_reconcile_plan(&mirror_root, &source_root, &plan).unwrap_err();
        assert!(!error.is_empty());
        assert_eq!(
            fs::read_to_string(mirror_root.join("guides/.git/config")).unwrap(),
            "local metadata"
        );
        assert_eq!(
            fs::read_to_string(mirror_root.join("guides/setup.md")).unwrap(),
            "base"
        );
    }

    #[test]
    fn write_back_plan_orders_create_write_and_deep_delete() {
        let fixture = tempfile::tempdir().unwrap();
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        fs::create_dir_all(&source_root).unwrap();
        fs::create_dir_all(&mirror_root).unwrap();
        write(&source_root, "old/nested/deleted.md", "old");
        write(&source_root, "edited.md", "source");
        write(&mirror_root, "edited.md", "mirror");
        write(&mirror_root, "new/created.md", "new");

        let source = build_manifest(&source_root).unwrap();
        let mirror = build_manifest(&mirror_root).unwrap();
        let plan = plan_write_back(&source, &mirror);

        assert!(plan.conflicts.is_empty());
        assert_eq!(plan.created_directories(), 1);
        assert_eq!(plan.written_files(), 2);
        assert_eq!(plan.deleted_entries(), 3);
        assert_eq!(
            plan.operations[0],
            WriteBackOperation {
                relative_path: "new".to_string(),
                kind: WriteBackOperationKind::UpsertDirectory,
            }
        );
        assert_eq!(plan.operations.last().unwrap().relative_path, "old");
    }

    #[test]
    fn write_back_plan_rejects_file_directory_type_changes() {
        let fixture = tempfile::tempdir().unwrap();
        let source_root = fixture.path().join("source");
        let mirror_root = fixture.path().join("mirror");
        fs::create_dir_all(&source_root).unwrap();
        fs::create_dir_all(&mirror_root).unwrap();
        write(&source_root, "entry", "file");
        fs::create_dir(mirror_root.join("entry")).unwrap();

        let plan = plan_write_back(
            &build_manifest(&source_root).unwrap(),
            &build_manifest(&mirror_root).unwrap(),
        );
        assert_eq!(plan.operations.len(), 0);
        assert_eq!(
            plan.conflicts,
            vec![ReconcileConflict {
                relative_path: "entry".to_string(),
                reason: ReconcileConflictReason::UnsafeTypeChange,
            }]
        );
    }

    #[test]
    fn write_back_journal_round_trips_and_clears() {
        let root = tempfile::tempdir().unwrap();
        let journal = WriteBackJournal {
            version: WRITE_BACK_JOURNAL_VERSION,
            provider_id: "external:fixture".to_string(),
            source_revision_before: "source".to_string(),
            target_revision: "target".to_string(),
            operations: vec![WriteBackOperation {
                relative_path: "intro.md".to_string(),
                kind: WriteBackOperationKind::UpsertFile,
            }],
            created_at: 42,
            attempts: 1,
        };

        save_write_back_journal(root.path(), &journal).unwrap();
        assert_eq!(load_write_back_journal(root.path()).unwrap(), Some(journal));
        assert!(clear_write_back_journal(root.path()).unwrap());
        assert_eq!(load_write_back_journal(root.path()).unwrap(), None);
        assert!(!clear_write_back_journal(root.path()).unwrap());
    }

    #[test]
    fn local_mutation_rollback_restores_the_complete_mirror() {
        let fixture = tempfile::tempdir().unwrap();
        let mirror = fixture.path().join("mirror");
        fs::create_dir(&mirror).unwrap();
        write(&mirror, "kept.md", "original");
        write(&mirror, "folder/removed.md", "restore me");

        begin_local_mutation(&mirror).unwrap();
        write(&mirror, "kept.md", "partial change");
        fs::remove_file(mirror.join("folder/removed.md")).unwrap();
        write(&mirror, "created.md", "partial create");
        rollback_local_mutation(&mirror).unwrap();

        assert_eq!(
            fs::read_to_string(mirror.join("kept.md")).unwrap(),
            "original"
        );
        assert_eq!(
            fs::read_to_string(mirror.join("folder/removed.md")).unwrap(),
            "restore me"
        );
        assert!(!mirror.join("created.md").exists());
        assert!(!fixture.path().join(".mirror.local-mutation").exists());
        assert!(!fixture
            .path()
            .join(".mirror.local-mutation-backup")
            .exists());
    }

    #[test]
    fn cold_recovery_rolls_back_before_a_write_back_journal_exists() {
        let fixture = tempfile::tempdir().unwrap();
        let mirror = fixture.path().join("mirror");
        fs::create_dir(&mirror).unwrap();
        write(&mirror, "intro.md", "original");

        begin_local_mutation(&mirror).unwrap();
        write(&mirror, "intro.md", "interrupted");

        assert!(!recover_interrupted_local_mutation(&mirror).unwrap());
        assert_eq!(
            fs::read_to_string(mirror.join("intro.md")).unwrap(),
            "original"
        );
    }

    #[test]
    fn cold_recovery_preserves_forward_state_when_write_back_is_journaled() {
        let fixture = tempfile::tempdir().unwrap();
        let mirror = fixture.path().join("mirror");
        fs::create_dir(&mirror).unwrap();
        write(&mirror, "intro.md", "original");
        begin_local_mutation(&mirror).unwrap();
        write(&mirror, "intro.md", "forward state");
        let journal = WriteBackJournal {
            version: WRITE_BACK_JOURNAL_VERSION,
            provider_id: "external:fixture".to_string(),
            source_revision_before: "source".to_string(),
            target_revision: "target".to_string(),
            operations: vec![WriteBackOperation {
                relative_path: "intro.md".to_string(),
                kind: WriteBackOperationKind::UpsertFile,
            }],
            created_at: 42,
            attempts: 1,
        };
        save_write_back_journal(&mirror, &journal).unwrap();

        assert!(recover_interrupted_local_mutation(&mirror).unwrap());
        assert_eq!(
            fs::read_to_string(mirror.join("intro.md")).unwrap(),
            "forward state"
        );
        commit_local_mutation(&mirror).unwrap();
        assert_eq!(load_write_back_journal(&mirror).unwrap(), Some(journal));
        assert!(!fixture.path().join(".mirror.local-mutation").exists());
        assert!(!fixture
            .path()
            .join(".mirror.local-mutation-backup")
            .exists());
    }
}
