# Native commands are discovered through Tauri annotations.
-keep @app.tauri.annotation.TauriPlugin class * { *; }
-keepclassmembers class * {
    @app.tauri.annotation.Command <methods>;
}
