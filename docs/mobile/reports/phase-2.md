# Phase 2：External vault provider and mobile integration

日期：2026-07-18

Feature branch：`codex/mobile-app`

当前 app code commit：`18fbeb8`

本报告状态：进行中；2A provider contract 已完成，2B 已完成 Android SAF 系统目录选择、persistable permission、native-only provider record、首次原子镜像和冷启动恢复。Android reconcile/write-back/重新授权、iOS security-scoped folder provider 尚未实现。

## 本增量结论

现有 app-private vault 已成为第一个 `VaultProvider` 实现。共享 React 产品层仍使用同一套 `AppState`、commands、`Sidebar`、`VaultHome`、`EditorShell`、Document Info、Board 和相对路径模型；移动端没有新增另一套文件树、编辑器或预览。

Android SAF 的首个实现增量同样没有新增 mobile 产品 UI：native picker 与 opaque tree URI 被封装在 Android/Rust provider adapter 内，选中的目录先镜像到 app-private root，再返回现有 `WorkspaceSnapshot`。正式入口保持关闭，直到 reconcile、write-back 和权限恢复完成；因此用户当前不会误以为对 mirror 的编辑已经写回外部来源。

本增量建立的边界包括：

- provider identity：稳定的 `providerId`，移动默认库固定为 `app-private:default`。
- provider kind：`appPrivate`、`localDirectory`、`externalMirror`。
- access state：`ready`、`authorizationRequired`、`sourceUnavailable`、`error`。
- storage mode：`direct` 与 `mirror`。
- capability：read/write/create/rename/delete/watch/reconcile/reauthorize。
- external native record：区分 Android SAF tree 与 iOS security-scoped bookmark，包含 mirror root、只读状态、source revision 和最后 reconcile 时间。
- versioned provider store schema：当前版本 `1`。

`open_default_vault` 与 `open_workspace` 先解析 provider，再继续调用现有 `jtype-core` / workspace 实现，因此 `WorkspaceSnapshot`、前端 state 和 command callback 没有变化。后续 SAF/bookmark 会先 reconcile 到 app-private mirror，再复用当前 workspace 文件操作；其余 read/write/rename/delete 命令仍需在后续增量逐步接入 provider adapter。

## 安全边界

WebView 只能获得 canonical `VaultProviderDescriptor`：

```text
providerId, kind, displayName, localRootPath,
accessState, storageMode, capabilities
```

Android persistable tree URI 与 iOS security-scoped bookmark 只存在于 Rust/native record 的 `opaqueSourceReference`。descriptor 序列化测试确认不会输出 `content://`、bookmark 或 `opaqueSourceReference`，前端 canonical type 也没有这些字段。

Android provider store 使用 app config 目录内的 `vault-providers.json`，写入采用同目录 temporary file → rename 的原子替换。SAF mirror 也先写入同目录 staging tree，完整枚举成功后才 rename 为稳定 provider root；失败会删除 staging tree，不会暴露半成品 vault。

## Provider 验证

### Rust contract

六条 provider 单测覆盖：

1. mobile 默认库解析为 `appPrivate` / `direct`。
2. desktop/local directory provider ID 跨解析保持稳定。
3. external mirror capability 正确，native source reference 不进入 descriptor JSON。
4. 缺省 store JSON 迁移到 schema version 1。
5. Android/iOS source kind 与 opaque source reference 共同生成稳定、隔离的 external provider ID。
6. provider store 能幂等 upsert，并按 source 或 mirror root 恢复记录。

本轮 `cargo test --manifest-path src-tauri/Cargo.toml` 结果为 11/11，其中 provider tests 6/6。

### Android Emulator：2A app-private contract

环境：`JType_API_36_1`，Android 16 / API 36，arm64，1080×2424；app code commit `309aebb`。

通过 Tauri IPC 实际读取默认库 descriptor：

```text
localRootPath  /data/user/0/net.jcode.jtype/vaults/default
providerId     app-private:default
kind           appPrivate
displayName    On this device
accessState    ready
storageMode    direct
capabilities   read/write/create/rename/delete/watch = true
               reconcile/reauthorize = false
```

随后打开同一个默认库，选择 Local only，冷启动最新 APK 后共享 `VaultHome` 正常恢复：

![Android app-private provider](assets/phase-2/provider-contract-android.png)

### Android Emulator：2B SAF 首次导入

环境：`JType_API_36_1`，Android 16 / API 36，arm64，1080×2424；app code commit `18fbeb8`。

测试源目录位于系统 Documents provider 的 `JTypeExternal0718`，包含：

```text
intro.md                 91 bytes
guides/setup.md          72 bytes
```

实际执行链路：

1. 调用 native-only `initialize_android_external_vault` 调试入口。
2. 系统 `ACTION_OPEN_DOCUMENT_TREE` picker 打开 `Documents/JTypeExternal0718`。
3. 用户点击 `USE THIS FOLDER` 并在系统确认框点击 `ALLOW`。
4. Android 使用 result intent 的实际 read/write flags 调用 `takePersistableUriPermission`。
5. native plugin 递归枚举 tree，复制到 app-private staging tree，再原子 rename 为稳定 mirror root。
6. Rust 写入 native provider record，并用现有 workspace implementation 返回文件树。

![Android SAF folder picker](assets/phase-2/android-saf-initial-import.png)

首次导入的安全响应为：

```text
providerId          external:41922042f61ba816
kind                externalMirror
displayName         JTypeExternal0718
localRootPath       /data/user/0/net.jcode.jtype/vaults/external/41922042f61ba816
accessState         ready
storageMode         mirror
capabilities        read/watch = true
                    write/create/rename/delete/reconcile/reauthorize = false
imported            2 files, 1 directory, 163 bytes
```

WebView 响应中不存在 `content://` 或 `opaqueSourceReference`。模拟器 native store 内保留实际 tree URI，`dumpsys activity` 同时确认 UID `10225` 持有对应的 `[prefix]` UriPermission；mirror 中的两份 Markdown 内容与 source fixture 完全一致。

重复选择同一 source 后 provider ID 和 mirror root 不变，返回 `0 files / 0 directories / 0 bytes`，没有重复复制；原子 provider store 更新没有遗留 `.vault-providers.json.tmp-*`。随后 force-stop/cold launch，`describe_vault_provider` 与 `open_workspace` 均从 native store 恢复同一个 descriptor 和嵌套文件树。

当前 native import 防护包括：mirror root 必须位于 app-private `vaults/external`、最大目录深度 64、最大 entry 数 50,000、拒绝 virtual documents、清理不安全文件名并拒绝清理后的同名项、跳过 `.jtype` / `.git` / `node_modules` / `target` source directory。

本增量有意保持以下限制：

- 正式 external vault UI capability 仍关闭；系统 picker 只通过调试 IPC 验证。
- mirror 是只读 provider；常规写入、创建、重命名和删除尚未路由回 SAF source。
- source 变化检测、双向 reconcile、删除/冲突规则尚未实现。
- permission health 尚未在每次 descriptor 恢复时向 Android provider 复核，因此权限丢失后的 `authorizationRequired` 与重新授权属于下一增量。

### iPhone Simulator

环境：iPhone 17 Pro Simulator，iOS 26.5，arm64；app code commit `309aebb`。

使用 no-sign simulator archive 干净安装，通过 Maestro/XCTest 执行“使用默认库”→“仅本地”并断言“库已就绪”。实际 provider root 为 simulator app container 内的：

```text
Library/Application Support/net.jcode.jtype/vaults/default
```

它经同一个 native resolver 输出 `app-private:default` / `appPrivate` / `direct`，并交给共享 `VaultHome`：

![iOS app-private provider](assets/phase-2/provider-contract-ios.png)

## 本轮发现并修复的共享壳层问题

iOS 中文 locale 暴露出 desktop 共享壳层的隐式 Grid 列会按中文 Header/状态栏最小内容宽度撑开。修复没有建立 mobile-only 页面，而是在唯一 `App` shell 上显式使用 `minmax(0, 1fr)`，并给 shell、内容轨道和 content panel 增加 `min-width: 0`。

E2E 现在以完整中文 locale 在 390×844 viewport 验证：content panel 与 Welcome 的 `scrollWidth <= clientWidth`，且 panel 右边界不超过 viewport。iOS 实际 archive 的中文标题、说明和 Recent 也完整换行：

![iOS localized shared shell](assets/phase-2/localized-welcome-ios.png)

相关 commits：

- `232222c`：Welcome 内容的窄屏约束。
- `309aebb`：修复真正根因——共享 App shell 隐式 Grid 列宽，并增加完整中文 locale 回归。
- `18fbeb8`：Android SAF picker、persistable permission、native provider record、原子首次 mirror 与冷启动恢复。

## 自动化与构建结果

| 验证 | 结果 |
| --- | --- |
| `npm run build` | PASS |
| `npm run test:unit` | PASS，47/47 |
| `npx playwright test tests/e2e/app.spec.ts` | PASS，42/42 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS，11/11；provider 6/6 |
| `cargo check --manifest-path plugins/mobile-import/Cargo.toml` | PASS |
| `pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| Android SAF picker / initial mirror / persisted permission / idempotent reselect / cold restore | PASS |
| `pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS（2A contract 增量；本次 Android-only commit 未改 iOS 路径） |
| iOS clean install / Maestro default vault flow / localized shell | PASS（2A contract 增量） |

Android debug APK：

- `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
- 372,076,411 bytes
- SHA-256 `8b5b04d350566756542810470f54dceef97cbb94e6dd01c7cb83a3c3b5cb5f3c`

iOS archive：

- `src-tauri/gen/apple/build/jtype_iOS.xcarchive`
- no-sign simulator archive，约 99 MB

截图 SHA-256：

```text
9e7588d5c42ca9e76f8ac5b102cbb5f87a3c1d294035aaa737e86f172c50a0ea  localized-welcome-ios.png
4ca09fcf784119fb175202638907e2dec1a0bc8c7fd6da10652111b6b5c1e64c  provider-contract-android.png
d0c3678bbb8ae7c24e69044f53a501ac52a6c66a924da3263a76a4f7edee0055  provider-contract-ios.png
fab1577c4ac914eb86df29678fbbc6310af83dc4c8db9346ca8a5f8bb5113c66  android-saf-initial-import.png
```

## 下一增量：2B Android SAF permission health 与 reconcile

下一段继续按已冻结的 contract 实现：

1. native permission health command：复核 persisted permission 与 source root 可用性，准确输出 `ready` / `authorizationRequired` / `sourceUnavailable`。
2. 重新授权使用同一 provider ID 绑定 replacement tree URI，不丢弃现有 mirror 和 workspace state。
3. 冻结并测试 source ↔ mirror 的增量 reconcile、删除、rename 与冲突规则。
4. 实现 pull/reconcile 后再实现受控 write-back，并逐项开启 descriptor capability。
5. 权限丢失、外部 app 修改与冲突恢复全部通过后，再将入口接入复用的 Welcome/VaultHome action callback。

iOS security-scoped bookmark 会在 Android SAF contract 与 reconcile 行为稳定后复用同一 store、descriptor 和 mirror 状态机。
