# Phase 2：External vault provider and mobile integration

日期：2026-07-18

Feature branch：`codex/mobile-app`

当前 app code commit：`309aebb`

本报告状态：进行中；当前完成 2A provider contract 的第一个可验证增量，Android SAF、iOS security-scoped folder provider 与 reconcile 尚未实现。

## 本增量结论

现有 app-private vault 已成为第一个 `VaultProvider` 实现。共享 React 产品层仍使用同一套 `AppState`、commands、`Sidebar`、`VaultHome`、`EditorShell`、Document Info、Board 和相对路径模型；移动端没有新增另一套文件树、编辑器或预览。

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

## Provider 验证

### Rust contract

四条 provider 单测覆盖：

1. mobile 默认库解析为 `appPrivate` / `direct`。
2. desktop/local directory provider ID 跨解析保持稳定。
3. external mirror capability 正确，native source reference 不进入 descriptor JSON。
4. 缺省 store JSON 迁移到 schema version 1。

本轮 `cargo test --manifest-path src-tauri/Cargo.toml` 结果为 9/9，其中 provider tests 4/4。

### Android Emulator

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

## 自动化与构建结果

| 验证 | 结果 |
| --- | --- |
| `npm run build` | PASS |
| `npm run test:unit` | PASS，47/47 |
| `npx playwright test tests/e2e/app.spec.ts` | PASS，42/42 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS，9/9；provider 4/4 |
| `pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| `pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS |
| Android latest APK install / cold launch / shared VaultHome | PASS |
| iOS clean install / Maestro default vault flow / localized shell | PASS |

Android debug APK：

- `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
- 370,972,835 bytes
- SHA-256 `a227ef9d5a22778de01918ee0d3a91f09d7ddb77fcab9203df25f09c53908086`

iOS archive：

- `src-tauri/gen/apple/build/jtype_iOS.xcarchive`
- no-sign simulator archive，约 99 MB

截图 SHA-256：

```text
9e7588d5c42ca9e76f8ac5b102cbb5f87a3c1d294035aaa737e86f172c50a0ea  localized-welcome-ios.png
4ca09fcf784119fb175202638907e2dec1a0bc8c7fd6da10652111b6b5c1e64c  provider-contract-android.png
d0c3678bbb8ae7c24e69044f53a501ac52a6c66a924da3263a76a4f7edee0055  provider-contract-ios.png
```

## 下一增量：2B Android SAF

下一段按已冻结的 contract 实现：

1. Android native folder picker 与 persistable tree URI permission。
2. source reference 只写入 native provider store；WebView 只接收 descriptor。
3. 为 external provider 创建 app-private mirror，完成首次枚举与导入。
4. 让 shared app 仍通过现有 root path / relative path / workspace commands 打开 mirror。
5. 定义并测试 source ↔ mirror 的增量 reconcile、删除与冲突规则。
6. 模拟权限撤销并验证 `authorizationRequired` → 重新授权恢复。

iOS security-scoped bookmark 会在 Android SAF contract 与 reconcile 行为稳定后复用同一 store、descriptor 和 mirror 状态机。
