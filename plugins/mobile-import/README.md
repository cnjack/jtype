# JType mobile import adapter

Internal Tauri plugin that copies Android `content://` references and iOS picked/security-scoped file URLs into a short-lived app-cache file. JType Rust commands then feed that regular path into the existing vault import implementation.

The adapter is Rust-only and intentionally exposes no JavaScript permissions.
