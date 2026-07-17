# Phase 1.6 — Mobile secure credential storage

> 日期：2026-07-18
>
> 实现 commit：`5110c83`
>
> 分支：`codex/mobile-app`

## 范围与结论

本段把 cloud token 从移动端 WebView `localStorage` 和 `cloud-profile.json` 中移除，并保持 desktop 现有存储行为不变。

- Android：token 由 Android Keystore 中的 AES-GCM key 加密，密文保存在 app-private `SharedPreferences`。模拟器已完成保存、进程重启、恢复和清理验证。
- iOS：token 使用 Security.framework generic-password Keychain，accessibility 为 `AfterFirstUnlockThisDeviceOnly`；`Sign to Run Locally` Simulator build 已完成 legacy JSON 迁移、冷启动恢复和 browser OAuth 写回验证。
- React：mobile build 会清理旧版 `jtype.sync.token`，不再把敏感字段写入 WebView storage；账号名、site URL 等非敏感状态仍复用现有 reducer/storage 路径。
- Rust：`load_cloud_profile` / `save_cloud_profile` 仍是前端唯一接口。旧版 JSON 明文 token 只会在安全存储写入成功后才从 JSON 擦除，避免迁移中丢失唯一副本。
- 插件只从 Rust command 调用，没有暴露给页面 JavaScript 的 permission。

## 验证环境

| 平台 | 设备 | 系统 | 结果 |
| --- | --- | --- | --- |
| Android | `JType_API_36_1` / arm64 emulator | API 36.1 | Keystore 保存、恢复和清理通过 |
| iOS | iPhone 17 Pro Simulator `BD64DE20-5397-486C-8899-4B974425A0AD` | iOS 26.5 | signed Keychain 保存、迁移、冷启动恢复与 OAuth 写回通过 |
| Desktop | Chromium Playwright desktop capability | macOS host | 33/33 app E2E 通过 |

## 自动化与构建

| 命令 | 结果 |
| --- | --- |
| `cargo check --manifest-path plugins/secure-storage/Cargo.toml` | PASS |
| `cargo test --locked --manifest-path src-tauri/Cargo.toml` | PASS，4/4 |
| `pnpm build` | PASS |
| `pnpm exec playwright test tests/e2e/app.spec.ts` | PASS，33/33 |
| `pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| `pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS |

## Android 运行时证据

在 Android WebView 调试连接中先放入旧版 localStorage token，再安装本段 mobile build，随后通过现有 `save_cloud_profile` / `load_cloud_profile` command 验证：

1. 启动后旧版 `localStorage["jtype.sync.token"]` 为 `null`。
2. 保存 profile 后，`cloud-profile.json` 的 `token` 为 `""`。
3. `jtype-secure-storage.xml` 只包含 AES-GCM IV/ciphertext，不含明文 token。
4. force-stop 并重新启动后，`load_cloud_profile` 返回与保存前一致的 token，同时 localStorage 仍为 `null`。
5. 验证结束后使用空 token 删除测试 credential，`SharedPreferences` 恢复为空 map。

报告不记录或截图任何测试 token。

## iOS signed 运行时证据

使用 Xcode Simulator 的 `Sign to Run Locally` 构建安装 JType；签名 entitlement 包含 `application-identifier` 和应用 Keychain access group。运行时完成：

1. 从 legacy `cloud-profile.json` 迁移 token，迁移后磁盘 token 长度为 0。
2. terminate/launch 冷启动后，`load_cloud_profile` 仍返回同一用户名和 64 字符 token。
3. 从 Account Dialog 断开后重新完成 browser OAuth；新 token 再次写入 Keychain，JSON 仍为空。
4. 安装包含容器路径迁移修复的更新 build 后，应用恢复新的 data-container 路径、vault binding 和 cloud settings，Keychain credential 同时保持可读。

签名只作用于临时 Simulator app，不改动仓库发布配置；测试 token 和 profile 均在验证后清理。

## 截图

Android：安全存储运行时验证完成后的 app-private vault。

![Android secure storage smoke](assets/phase-1/secure-storage-android.png)

iOS：最终无签名构建正常启动。该截图当时记录的首次启动中文欢迎内容横向溢出，已在 Phase 2 通过共享 App shell Grid 约束修复，并由完整中文 locale E2E 与 iPhone archive 复验；见 `docs/mobile/reports/phase-2.md`（`232222c`、`309aebb`）。

![iOS secure storage launch](assets/phase-1/secure-storage-ios.png)

## 后续边界

- 真机 Apple Development / distribution signing 与卸载后的 Keychain 生命周期属于 Phase 3 store readiness。
- app 被系统终止时的 pending device OAuth 状态恢复属于 Phase 2；最终 token 已经安全持久化。
