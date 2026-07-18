# Phase 2D：External provider 按需物化

日期：2026-07-18；Android/iOS 原生复测补录于 2026-07-19

Feature branch：`codex/mobile-app`

实现 commit：`5970d15`；iOS Simulator gate follow-up：`264db8a`

状态：工程实现与自动化 gate 已完成；Android API 36 原生 SAF 与 iPhone 17 Pro / iOS 26.5 Simulator 的 security-scoped Files provider 均已通过 120-file `1 changed / 0 changed` 交互、日志与 shared UI gate。physical iPhone 的 bookmark 失效/重新授权、iCloud/第三方 Files provider 和真机资源指标仍保留到最终验收。

## 结论

Android SAF 与 iOS security-scoped provider 的 reconcile、write-back 前置 pull、write-back verification 和逐路径冲突解决不再把整个外部目录复制到短期 app-private snapshot。新的流程是：

1. native provider 递归读取并计算 SHA-256 manifest，但不复制文件；
2. Rust 继续使用现有 source / baseline / mirror 三方模型生成 `ReconcilePlan`；
3. 只把 plan 中需要从 source upsert 的文件和目录 materialize 到临时 staging；
4. 继续使用原有原子 mirror transaction、write-back journal、冲突模型和 shared provider banner。

这次没有建立 mobile-only 文件树、编辑器、预览、Document Info 或操作页。`WorkspaceSnapshot`、`AppState`、`Sidebar`、`VaultHome`、`EditorShell`、Board、commands 和 provider UI 仍与 Desktop 共用；平台差异只存在于 mobile-import native adapter 与 Rust provider adapter。

Android 真实 SAF 复测确认这一边界实际成立：系统 folder picker 授权 `Download/JType-OnDemand-20260718` 后，应用回到同一 `VaultHome`，显示 120 篇 Markdown；单文件 source 变化只 materialize 1 个文件，紧接着的 unchanged reconcile 只扫描、不 materialize。

iOS local Files provider 复测得到相同结论：已有 security-scoped bookmark 解析 `File Provider Storage`，源中只保留 `JTypeOnDemand20260718` 这一个 120-file fixture 时，baseline 与立即复扫都只生成 native manifest；只修改 `note-001.md` 的中间轮次严格 materialize 1 path / 1 file / 72 bytes。产品层仍显示 Desktop 共用的 `VaultProviderBanner`、`VaultHome` 与文档 routes。

## 明确边界

本增量解决的是 external provider **reconcile/write-back 阶段的选择性物化**，不是零拷贝 provider：

- 首次选择外部 vault 仍完整 mirror 到 app-private root，保证离线可用和既有 Desktop filesystem contract 不变。
- native scan 仍会完整枚举目录并读取所有文件内容以计算 SHA-256；它消除了整库临时复制，但尚未消除整库 hash I/O。
- 在本实现 commit `5970d15` 中，app-private mirror 的 `WorkspaceSnapshot` 仍完整枚举；后续 `1a92435` 已让 mobile runtime 使用 partial snapshot 与打开时读取正文。external 首次 mirror、完整 source hash scan 与 provider-native streaming 仍未改变。
- source 只在 plan 要求 pull/upsert 或 `UseSource` 冲突选择时 materialize；纯删除、无变化检查和 `UseJtype` verification 不复制 source 文件。

因此不能把这次实现描述成“external vault 已完全 lazy loading”。准确状态是“full native scan + plan-driven source materialization”。

## 实现

### Native contract

`tauri-plugin-mobile-import` 新增两个 native-only command：

- `scanDirectory`：返回相对路径、entry kind、bytes、SHA-256、文件/目录计数和 native elapsed time。
- `materializeDirectoryEntries`：接受经过 Rust plan 选择的相对路径，只复制这些 entry 到受控 app-private staging root。

Android 使用 `DocumentsContract` 和 persisted tree permission 读取 SAF stream；iOS 使用 security-scoped URL 与 `CryptoKit.SHA256`。两端保留既有最大深度 64、最大 50,000 entry、reserved directory、unsafe/duplicate name、virtual document/symlink 和 destination containment 防护。

### Rust reconcile

`VaultManifest::from_native_entries` 将 native manifest 转换为与 filesystem manifest 相同的 canonical revision，并再次验证路径、entry metadata 与 SHA-256。`ReconcilePlan::source_materialization_paths` 只选择包含 source upsert 的 operation：

- source-only create/update：materialize；
- source directory create：materialize directory；
- source delete：不 materialize；
- unchanged / mirror-only local change：不 materialize；
- conflict：在用户作出选择前不 materialize。

逐路径 `UseSource` 只 materialize 被选 subtree；`UseJtype` 写回后通过重新扫描 source manifest 验证，不再复制整棵 source。

### 可观测性

debug build 新增两类日志：

```text
[JTypePerformance] external_source_scan provider=... entries=... files=... bytes=... elapsed_ms=...
[JTypePerformance] external_source_materialize provider=... requested_paths=... files=... directories=... bytes=...
```

共享 operation log 在 reconcile 后显示扫描 entry 数和实际 materialized file 数。未变化时明确显示 `Scanned N entries without materializing files.`，避免把完整扫描误称为零 I/O。

## 自动化与构建

| 验证 | 结果 |
| --- | --- |
| `cargo check --manifest-path plugins/mobile-import/Cargo.toml` | PASS |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS，29/29；新增 native manifest canonical revision/path guard，并验证 reconcile plan 只选择 source upsert 路径 |
| `pnpm build` | PASS |
| `pnpm test:unit` | PASS，59/59 |
| `pnpm test:e2e` | PASS，55/55；shared Android SAF flow 断言 5,001 entry unchanged scan 的 materialization 为 0 |
| `pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| `pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS |
| `tests/mobile/ios-on-demand-provider.yaml` | PASS；iOS shared provider banner → Check external changes |

2026-07-19 follow-up 又在当前分支重跑 `pnpm build`、unit 73/73、app E2E 56/56、jtype-core 46/46、Tauri 29/29、Android universal APK、iOS static Simulator archive verifier 和 iOS Maestro flow，全部 PASS。

Android universal debug APK：

```text
393,946,022 bytes
SHA-256 991e4cd6baefbf2dad308873db417b2ca3b5f886fd1f0913a44eeb563b90cb40
```

iOS Simulator archive app binary：

```text
105,495,392 bytes
SHA-256 3b63cefc875c63f2c489c5e684ecb046ff575e3916be4c97b6478cda5099666d
```

2026-07-19 follow-up artifacts：

```text
Android universal debug APK: 397,894,430 bytes
SHA-256 3d393346d2ca7f9671e14ef3904215fdb286f7283f31eab069ca3efa2a8efb7f
iOS Simulator app binary: 109,370,520 bytes
SHA-256 ff64226e3d970834c9b444cd709a837a633b17cefce620ff4364a839f017c1ee
```

## Simulator 复测状态

本轮准备了两份各 120 个 Markdown 文件的外部 provider fixture：

- Android：API 36.1 `JType_API_36_1` 的 `Download/JType-OnDemand-20260718`。
- iOS：iPhone 17 Pro / iOS 26.5 的 local Files provider `JTypeOnDemand20260718`。

iOS follow-up 使用已由 shared **Open another vault** 与系统 Files picker 建立的真实 security-scoped bookmark。Simulator 暴露的 local provider root 同时含一个旧的 1-file fixture；门禁前将该 sibling 精确移动到 `/tmp`，使 bookmark 下只剩 `JTypeOnDemand20260718` 的 120 个文件，门禁后恢复 sibling、恢复 `note-001.md` 原文并再次 reconcile。最终 source 与 mirror 都回到原始 121-file 状态，没有把测试改动留在模拟器。

Android Studio 从 IDE 启动 AVD 后提供了可操作的 Running Devices canvas。安装已由 CLI 验证的 arm64 universal debug APK 后，使用 Computer Use 完成：

1. shared Sidebar 的 **Open another vault** → Android 系统 SAF picker；
2. 选择 `Download/JType-OnDemand-20260718`、授权并回到 shared `VaultHome`；
3. unchanged baseline scan；
4. 外部修改 `note-001.md` 后再次检查；
5. 不再修改 source，立即做第三次检查。

| 轮次 | entries | files | source bytes | native scan | materialized |
| --- | ---: | ---: | ---: | ---: | --- |
| unchanged baseline | 120 | 120 | 5,040 | 559 ms | 0；无 materialize 事件 |
| `note-001.md` changed | 120 | 120 | 5,087 | 551 ms | 1 path / 1 file / 89 bytes |
| immediate unchanged | 120 | 120 | 5,087 | 540 ms | 0；无 materialize 事件 |

shared 状态栏在 changed run 显示 `External vault updated: 1 files pulled after scanning 120 entries...`；截图原文件为 [`assets/phase-2/android-on-demand-reconcile.png`](assets/phase-2/android-on-demand-reconcile.png)，原生日志为 [`assets/phase-2/android-on-demand-reconcile.txt`](assets/phase-2/android-on-demand-reconcile.txt)。

iOS 通过同一 shared provider banner 的 **Check external changes** 连续执行三轮。`entries=121` 是 120 个 Markdown 文件加 1 个 `JTypeOnDemand20260718` 目录；unchanged 轮没有 materialize 日志：

| 轮次 | entries | files | source bytes | native scan | materialized |
| --- | ---: | ---: | ---: | ---: | --- |
| unchanged baseline | 121 | 120 | 4,560 | 15 ms | 0；无 materialize 事件 |
| `note-001.md` changed | 121 | 120 | 4,594 | 17 ms | 1 path / 1 file / 72 bytes |
| immediate unchanged | 121 | 120 | 4,594 | 16 ms | 0；无 materialize 事件 |

截图 [`assets/phase-2/ios-on-demand-reconcile.png`](assets/phase-2/ios-on-demand-reconcile.png) 显示 Desktop 共用 `VaultHome`、provider banner 和 `JTypeOnDemand20260718/note-001.md` 等相对路径；首屏“显示 12 个 Markdown 文件”来自现有 shared progressive window，不是 mobile-only 文档列表。完整原生日志保存在 [`assets/phase-2/ios-on-demand-reconcile.txt`](assets/phase-2/ios-on-demand-reconcile.txt)。

![iOS Files provider one-change reconciliation in shared VaultHome](assets/phase-2/ios-on-demand-reconcile.png)

Android Studio 的普通 **Run app** 还暴露了一个独立的开发体验问题：IDE 默认选择 `armDebug`，而当前 AVD 是 `arm64-v8a`，Tauri task 因 ABI 不匹配退出。该失败不属于 APK/runtime gate；同一源码的 `pnpm tauri android build --debug --target aarch64 --apk --ci` artifact 已成功安装并完成上述流程。后续应给 IDE run configuration 固定 arm64 variant，避免开发者误入错误 flavor。

证据哈希：

```text
53ef21ae9cf84ee62cffebed9912375d2ae802e4b61971ba2c1a33f9b0ec9790  android-on-demand-reconcile.png
e646299f60e8b7ad70d3dc16e7ce41a8dc882c99c3d51fc4e8b4c0d9d2ce63a0  ios-shared-welcome.jpeg
0c3d652d5c5244944caad33d5de572f4eaadefa3dbc56b019c793e79cedd7a1d  ios-on-demand-reconcile.png
991e4cd6baefbf2dad308873db417b2ca3b5f886fd1f0913a44eeb563b90cb40  app-universal-debug.apk
3d393346d2ca7f9671e14ef3904215fdb286f7283f31eab069ca3efa2a8efb7f  follow-up app-universal-debug.apk
ff64226e3d970834c9b444cd709a837a633b17cefce620ff4364a839f017c1ee  follow-up JType iOS binary
```

## 下一步

1. 在 physical iPhone 补 bookmark 失效/重新授权、iCloud/第三方 Files provider 与 signed build；Simulator local Files provider 120-file gate 已完成，不替代真机权限生命周期。
2. 补充双端 reconcile total time、峰值 RSS/存储增长；双端 native scan/materialized file/bytes 已有 Simulator 数据。
3. shared shallow page contract 与 canonical `WorkspaceSnapshot` merger 已在 `3f945c4` 建立，未加载 entry native query 已在 `1060d1c` 建立，shared loaded-first/native-fallback resolver、mobile partial bootstrap、folder hydration 与按打开读取正文已在 `1a92435` 接通。首次 mirror 的离线策略与 provider-native streaming 仍单独决策，详见 [`phase-2-workspace-pagination.md`](phase-2-workspace-pagination.md)、[`phase-2-unloaded-entry-resolution.md`](phase-2-unloaded-entry-resolution.md) 与 [`phase-2-partial-workspace-runtime.md`](phase-2-partial-workspace-runtime.md)。
4. 为 Android Studio 提供明确的 arm64 run configuration/variant，避免 IDE 默认 `armDebug` 与 arm64 AVD 不匹配。
