// Native plugin listener commands are exposed to the shared frontend so a warm
// Android ACTION_SEND can wake the same external-source drain used at startup.
// All import/materialization commands remain Rust-only.
const COMMANDS: &[&str] = &["registerListener", "removeListener"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
