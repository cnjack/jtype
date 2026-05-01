mod workspace;

use std::{env, path::PathBuf};

use workspace::{
    AiIndexResult, EntryKind, PublishResult, SyncDocument, ValidationResult, WorkspaceSnapshot,
};

#[tauri::command]
fn initial_open_paths() -> Vec<String> {
    env::args()
        .skip(1)
        .filter(|arg| workspace::is_markdown_path(&PathBuf::from(arg)))
        .collect()
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    workspace::read_markdown(&PathBuf::from(path))
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    workspace::write_markdown(&PathBuf::from(path), &content)
}

#[tauri::command]
fn open_workspace(path: String) -> Result<WorkspaceSnapshot, String> {
    workspace::open_workspace(&PathBuf::from(path))
}

#[tauri::command]
fn create_workspace_entry(
    root_path: String,
    relative_path: String,
    kind: EntryKind,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::create_entry(&root, &relative_path, kind)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn rename_workspace_entry(
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::rename_entry(&root, &from_relative_path, &to_relative_path)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn delete_workspace_entry(
    root_path: String,
    relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::delete_entry(&root, &relative_path)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn export_static_site(
    root_path: String,
    output_relative_path: String,
) -> Result<PublishResult, String> {
    workspace::export_static_site(&PathBuf::from(root_path), &output_relative_path)
}

#[tauri::command]
fn validate_workspace(root_path: String) -> Result<ValidationResult, String> {
    workspace::validate_workspace(&PathBuf::from(root_path))
}

#[tauri::command]
fn build_ai_index(root_path: String) -> Result<AiIndexResult, String> {
    workspace::build_ai_index(&PathBuf::from(root_path))
}

#[tauri::command]
fn collect_sync_documents(root_path: String) -> Result<Vec<SyncDocument>, String> {
    workspace::collect_sync_documents(&PathBuf::from(root_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            initial_open_paths,
            read_markdown_file,
            write_markdown_file,
            open_workspace,
            create_workspace_entry,
            rename_workspace_entry,
            delete_workspace_entry,
            export_static_site,
            validate_workspace,
            build_ai_index,
            collect_sync_documents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
