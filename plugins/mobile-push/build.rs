const COMMANDS: &[&str] = &[
    "registration",
    "takePendingRoute",
    "takePendingRefresh",
    "registerListener",
    "removeListener",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
