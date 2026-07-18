# Phase 2D：External provider 按需物化

日期：2026-07-18

Feature branch：`codex/mobile-app`

实现 commit：`5970d15`

状态：工程实现与自动化 gate 已完成；Android/iOS 原生 provider 的本轮 Simulator 交互复测未完成，不作为真实 provider 性能证据。

## 结论

Android SAF 与 iOS security-scoped provider 的 reconcile、write-back 前置 pull、write-back verification 和逐路径冲突解决不再把整个外部目录复制到短期 app-private snapshot。新的流程是：

1. native provider 递归读取并计算 SHA-256 manifest，但不复制文件；
2. Rust 继续使用现有 source / baseline / mirror 三方模型生成 `ReconcilePlan`；
3. 只把 plan 中需要从 source upsert 的文件和目录 materialize 到临时 staging；
4. 继续使用原有原子 mirror transaction、write-back journal、冲突模型和 shared provider banner。

这次没有建立 mobile-only 文件树、编辑器、预览、Document Info 或操作页。`WorkspaceSnapshot`、`AppState`、`Sidebar`、`VaultHome`、`EditorShell`、Board、commands 和 provider UI 仍与 Desktop 共用；平台差异只存在于 mobile-import native adapter 与 Rust provider adapter。

## 明确边界

本增量解决的是 external provider **reconcile/write-back 阶段的选择性物化**，不是零拷贝 provider：

- 首次选择外部 vault 仍完整 mirror 到 app-private root，保证离线可用和既有 Desktop filesystem contract 不变。
- native scan 仍会完整枚举目录并读取所有文件内容以计算 SHA-256；它消除了整库临时复制，但尚未消除整库 hash I/O。
- app-private mirror 的 `WorkspaceSnapshot` 仍完整枚举；原生分页枚举、partial snapshot 与真正的 lazy document open 继续留在后续增量。
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

## Simulator 复测状态

本轮准备了两份各 120 个 Markdown 文件的外部 provider fixture：

- Android：API 36.1 `JType_API_36_1` 的 `Download/JType-OnDemand-20260718`。
- iOS：iPhone 17 Pro / iOS 26.5 的 local Files provider `JTypeOnDemand20260718`。

iOS 清理旧的 6,202-file app-private 压力测试容器并重装后，native Tauri app 能正常显示与 Desktop 共用的 Welcome；旧容器完整备份在 `/tmp/jtype-ios-container-before-ondemand`，外部 Files fixture 未删除。但 Xcode 26.6 Device Hub 的 canvas 在本轮 Computer Use 会话中只产生 WebView hover，不转发 click，无法进入系统 folder picker。

Android APK 已安装，Android Studio 完成 Gradle sync 并识别正在运行的 `JType_API_36_1`；当前独立 qemu 窗口不是 Computer Use 可寻址 app，Android Studio 也没有为该外部启动的 AVD 打开可操作的 Running Device canvas。

因此本报告不宣称以下 gate 已通过，也不记录虚构的 native elapsed/materialized 数字：

- 原生 folder picker 选择 120-file fixture；
- 修改 1 个 source 文件后显示 `scanned=120 / materialized=1`；
- 第二次 unchanged reconcile 显示 `materialized=0`；
- 双端本轮 `external_source_scan` / `external_source_materialize` 实机日志。

旧的 Android SAF/iOS security-scoped 选择、mirror、write-back 与 shared editor 截图仍证明既有 provider 产品链路，但不能替代本增量的按需物化性能 gate。

## 下一步

1. 从 Android Studio 启动嵌入式 AVD，并在可操作的 Running Device canvas 重跑 120-file `1 changed / 0 changed` 两轮 reconcile。
2. 在可转发 touch 的 iOS Simulator/physical iPhone 重跑相同 Files provider flow。
3. 记录 native scan elapsed、materialized file/bytes、reconcile total time 和峰值存储增长。
4. 在保持 shared Desktop contract 的前提下，再拆分 native 分页枚举、partial `WorkspaceSnapshot` 与按文档读取；首次 mirror 的离线策略单独决策。
