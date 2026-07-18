# Phase 2D：Mobile partial workspace runtime

日期：2026-07-19

Feature branch：`codex/mobile-app`

实现 commit：`1a92435`

状态：移动端 partial `WorkspaceSnapshot`、共享 loaded-first/native-fallback 查询、folder page hydration 与 mutation/sync/watch partial re-bootstrap 已接入；Desktop 继续完整打开。后续 `231aa18` 已完成 Android 5,008-entry cold open、IPC/snapshot、连续分页、RSS 与尾部打开 gate，并把重复的 DOM/native Show more 合并为一个共享操作。`5865737` 已纠正 iOS archive 身份误判并修复启动 share-plugin 主线程等待。`a74b43a` 进一步加入有界 shallow-page cache 与 revision cursor；Android 5,008-entry、iOS clean-static 5,406-entry 的交互式第二页均为 `cache=hit elapsed_ms=0`。

## 结论

本增量没有创建 mobile-only 文件列表、编辑器、Preview、Document Info 或操作层，也没有复用 web landing page、docs website 或 dashboard。Android/iOS 继续运行根目录 `src/` 的 Desktop `AppState`、`VaultHome`、`Sidebar`、`QuickSwitcher`、`EditorShell`、Board 与 commands；平台兼容只位于 runtime capability、Tauri/Rust query 和 provider adapter。

移动端现在以 canonical `WorkspaceSnapshot` 的 partial 形态启动：

- root 首批最多加载 160 个直接子项，snapshot 明确携带 `completeness=partial` 与每个目录的 page state；Desktop 仍调用完整 `open_workspace`。
- Sidebar 展开目录或点击 **Show more** 时读取 shallow page，并 immutable merge 回同一个 workspace tree；没有第二份 mobile tree state。
- VaultHome、Sidebar search 与 Quick Open 先显示已加载结果；partial snapshot 再调用 native 全 vault search，失败时保留已加载结果。
- exact path、wikilink、通知/deep-link 与移动文档定位先解析已加载节点，缺失或 partial 歧义再走 native resolver。
- rename/move/delete 的 link impact 在 partial runtime 下走 native full-vault query，并保留当前未保存 editor buffer。
- filesystem mutation、cloud sync、cloud event、file watcher 与 Board refresh 统一通过 runtime adapter 重新取得 partial snapshot，避免把完整 mutation response 留回移动 state。

405-document E2E fixture 证明：首屏仍是 Desktop 共用 workbench；root 与 nested folder 可继续分页；Quick Open 可以直接找到并打开未加载的尾部文档。Rust fixture 的 205 篇 Markdown 加一个 folder/metadata vault 首屏为 160/207 个可见 root entries。

## 契约边界

`WorkspaceSnapshot` 仍是唯一产品数据模型。新增字段只描述完整性和 page progress，complete Desktop snapshot 对旧调用方保持兼容。shared components 不读取平台类型；只有 `usesPartialWorkspace` capability 决定 bootstrap adapter 选择完整或 partial command。

当前限制：

1. 首次读取目录仍会枚举并排序全部直接子项；后续页复用最多 32 个目录、合计 50,000 项的 LRU cache。它仍不是 provider-native streaming cursor。
2. external vault 首次 mirror 与每次 native source manifest/hash scan 仍可能遍历完整 source；partial runtime 当前作用于 app-private mirror 的 workspace state。
3. page cursor 绑定目录 metadata revision；目录变化后旧 cursor 明确判 stale，共享 hook 自动 refresh 当前文件夹首屏。mutation/watch 的全 workspace re-bootstrap 保持不变。
4. Android Simulator 的 5,008-entry cold open、连续分页与 RSS，以及 iOS Simulator 的 5,406-entry clean-static cold open/tail restore/交互式第二页已通过；双平台 physical-device peak/memory-warning、低内存恢复仍待测。

## 自动化与构建

| 验证 | 结果 |
| --- | --- |
| `pnpm build` | PASS；Android 当前源码构建的 `beforeBuildCommand` 完成 TypeScript/Vite production build |
| `pnpm test:unit` | PASS，73/73；含 opaque cursor、partial merge、loaded/native resolver、native failure fallback 与 partial bootstrap byte/time metrics |
| `pnpm test:e2e` | PASS，56/56；含 405-document partial bootstrap、root/nested page 与未加载尾部 Quick Open |
| `cargo test --manifest-path services/jtype-core/Cargo.toml` | PASS，46/46；含 cache hit、mutation invalidation 与 LRU bound |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | PASS，29/29 |
| `CI=true pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| `CI=true pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS；静态 archive 构建通过，当前 Simulator 静态运行 gate 见下文 |

构建产物：

```text
Android universal debug APK
396,017,062 bytes（`a74b43a` follow-up）
SHA-256 29e4a2d7aef730d9a2d6ba32af1d4f07ff27ea42b4357fb30e6b691cb7947623

iOS Simulator archive app binary（`a74b43a` follow-up）
109,370,520 bytes
SHA-256 610ccbe0d80124492543ca1abaef4095616e763d61b07b255db4584f83e5ff42
```

Android API 36 arm64 emulator 覆盖安装最终 APK 后显式 cold launch 成功，`TotalTime=336 ms`。已有 120-document SAF mirror 恢复到同一 `VaultHome`，首屏显示 12 个 Markdown 条目：

![Android partial workspace runtime](assets/phase-2/android-partial-workspace-runtime.png)

iPhone 17 Pro / iOS 26.5 Simulator 使用 signed Tauri dev build 与临时 HTTPS `devUrl` 启动同一 Rust/native shell 和根 `src/` 产品层；app-private 405-document fixture 显示 partial `VaultHome` 首批 12 项：

![iOS partial workspace runtime](assets/phase-2/ios-partial-workspace-runtime.png)

截图哈希：

```text
112bf22683c9d7820110e0a60019f8897bf28c208cbe0fb3cf21a2f71406cecf  android-partial-workspace-runtime.png
929676bc2800c83f09fe0cac5f61b290bc51e2b5df442e7374017dcdcc99b73f  ios-partial-workspace-runtime.png
```

### iOS 静态产物说明（纠正）

此前的“clean no-sign archive 静态 custom-scheme 空白”结论不准确：`tauri ios dev` 会覆盖与静态构建相同的 `jtype_iOS.xcarchive` 路径，先前安装的 binary 不包含当前 `dist/index.html` 的入口 JS/CSS。重新执行静态 build、且不再运行 dev 命令后，静态包可以显示共享 Welcome。仓库现由 `mobile:ios:verify-static` 在安装前比对 `dist/index.html` 入口资源与 archive binary，避免再次混淆 artifact。

大库恢复还暴露了另一项真实兼容问题：同步 `initial_external_file_sources` 在 WebView 主线程等待 iOS native plugin，而 plugin response queue 又需要主线程完成上一条 listener response，造成首帧无法提交。`5865737` 将该调用放入 Tauri background worker，并让 bounded share-inbox drain 在 native command 内完成。修复后的 clean static archive 在 iPhone 17 Pro / iOS 26.5 Simulator 上以 160 / 5,406 partial root 启动，并冷恢复打开未加载的 `performance-note-04999.md` 到 Desktop 共用 `EditorShell`。

准确 gate 状态是：iOS compile/archive、静态 artifact identity、5,406-entry partial cold open、unloaded tail cold restore 与交互式第二页 **PASS**。`a74b43a` follow-up 的 Maestro/XCUITest flow 已成功执行 Show more，native 日志为 `cache=hit elapsed_ms=0`；Files provider 性能、RSS/memory warning 与 physical iPhone 仍未完成。详见 [`phase-2-partial-page-cache.md`](phase-2-partial-page-cache.md)。

Android 与 iOS Tauri build 继续串行执行，因为两者的 `beforeBuildCommand` 共用根 `dist/`。

## 下一步

Android 5,008-entry Simulator follow-up、日志、截图与 artifact hash 见 [`phase-2-partial-large-vault.md`](phase-2-partial-large-vault.md)。

1. 在双平台 physical device 补交互式 tail search、连续 folder paging、峰值 RSS、memory warning 和后台恢复；Simulator 第二页已完成。
2. 评估 provider-native streaming cursor 与增量 source manifest，分别减少目录首次枚举和 external full hash I/O；连续 shallow page 已由有界 cache 收口。
3. 在 physical iPhone 补齐 signed static archive、Files provider 与 low-memory gate；Simulator 静态 cold-launch/tail restore 已通过，不再归类为 custom-scheme 环境阻塞。
