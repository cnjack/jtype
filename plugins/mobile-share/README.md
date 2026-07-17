# JType mobile share adapter

Internal Tauri plugin that materializes the current Markdown editor buffer in app cache and opens the Android or iOS system share sheet.

The adapter is Rust-only and intentionally exposes no JavaScript permissions. Desktop export continues to use the existing save-dialog implementation.
