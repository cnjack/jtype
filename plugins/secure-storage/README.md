# JType Secure Storage Plugin

Internal Tauri mobile adapter. Android encrypts values with an AES-GCM key held
by Android Keystore; iOS stores values as generic passwords in Keychain. The
plugin exposes no JavaScript commands: JType's Rust profile commands are the
only caller.
