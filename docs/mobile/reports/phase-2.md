# Phase 2：External vault provider and mobile integration

日期：2026-07-18

Feature branch：`codex/mobile-app`

当前 app code commit：`231a2dc`

本报告状态：进行中；2A provider contract 已完成。2B 已完成 Android SAF 系统目录选择、persistable permission、native-only provider record、首次原子镜像、permission health、目录失效检测、重新授权、内容哈希 baseline、安全 pull reconcile、冲突阻断和冷启动恢复。Android write-back / 正式 UI 与 iOS security-scoped folder provider 尚未实现。

## 本增量结论

现有 app-private vault 已成为第一个 `VaultProvider` 实现。共享 React 产品层仍使用同一套 `AppState`、commands、`Sidebar`、`VaultHome`、`EditorShell`、Document Info、Board 和相对路径模型；移动端没有新增另一套文件树、编辑器或预览。

Android SAF 的实现同样没有新增 mobile 产品 UI：native picker 与 opaque tree URI 被封装在 Android/Rust provider adapter 内，选中的目录先镜像到 app-private root，再返回现有 `WorkspaceSnapshot`。正式入口保持关闭，直到 write-back 与冲突恢复 UI 完成；因此用户当前不会误以为对 mirror 的编辑已经写回外部来源。permission health、重新授权与安全 pull 已经进入 provider adapter，且继续复用同一 provider identity、mirror 与 workspace state。

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

本轮 `cargo test --manifest-path src-tauri/Cargo.toml` 结果为 20/20，其中 provider tests 6/6、reconcile tests 9/9。

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

### Android Emulator：2B permission health 与重新授权

环境：同一台 `JType_API_36_1`，Android 16 / API 36，arm64；app code commit `0b69f16`。

本增量在每次恢复 external provider descriptor 时向 Android 原生层复核 persisted URI permission 与 source root 可用性，并把实际 access state 原子写回 provider store。Android provider 现在输出 `canReauthorize = true`；iOS 在对应 native command 完成前仍为 `false`。`canReconcile` 继续为 `false`，read/write/create/rename/delete 也没有提前开放。

真实授权丢失测试没有伪造返回值：先备份测试 app 的 provider store 与 mirror，精确卸载并重装 `net.jcode.jtype` 以清除 Android 对该 UID 的 persisted permission，再恢复 store 与 mirror。此时 `dumpsys activity` 确认没有 tree permission，descriptor 状态链为：

```text
ready -> authorizationRequired -> ready
```

处于 `authorizationRequired` 时，现有 app-private mirror 仍可通过 `open_workspace` 只读恢复，用户的本地快照不会因为 source 暂时不可访问而消失。重新选择原目录后：

- provider ID 仍为 `external:41922042f61ba816`；
- mirror root 保持不变；
- persisted permission 恢复；
- force-stop / cold launch 后 descriptor 仍为 `ready`。

随后将系统 Documents provider 中的测试目录移动并更名，旧 tree URI 能被准确识别为 `sourceUnavailable`，状态链为：

```text
ready -> sourceUnavailable -> ready
```

通过同一 provider 的 reauthorize command 选择 replacement tree 后，provider ID、mirror root 与本地 workspace state 保持不变；display name 与 native-only source reference 更新，旧 `sourceRevision` / `lastReconciledAt` 被清空，避免把新 source 误判为已经 reconcile。原 tree permission 在提交 replacement record 前被显式释放；最终 `dumpsys activity` 对 UID `10226` 只显示：

```text
content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FJTypeExternal0718Moved3 [prefix]
```

WebView 的 reauthorize 响应和后续 descriptor 仍不包含 `content://`、`opaqueSourceReference` 或其他原生授权材料。精确卸载只用于可恢复的测试 app 数据夹具；外部 source fixture 被保留，供下一增量的 reconcile 测试继续使用。

### Android Emulator：2B 内容哈希 baseline、安全 pull 与冲突阻断

环境：`JType_API_36_1`，Android 16 / API 36，arm64，1080×2424；reconcile app code commit `f9537f2`，open recovery fix `231a2dc`。

reconcile 使用 source / last-reconciled baseline / mirror 三方比较，file equality 以 SHA-256 内容哈希与字节数为准，directory rename 明确定义为旧路径删除 + 新路径创建：

- baseline 缺失且 source 与 mirror 完全相同：只建立 baseline，不修改 mirror。
- source 已变、mirror 仍等于 baseline：允许 pull 对应路径。
- mirror 已变、source 仍等于 baseline：保留本地变化并报告 pending local changes。
- source 与 mirror 均变化且结果不同：整次事务返回 conflict，不推进 baseline，不修改 mirror。
- source 删除/替换父目录但其下有本地变化：阻止事务；manifest 排除的本地目录也不会被递归删除吞掉。
- replacement tree 重新授权清空 record revision 后，旧 baseline 不再可信；只有新 source 与 mirror 完全一致时才能重新建立 baseline。

初次对已有 provider 执行 reconcile，真实返回：

```text
status              baselineEstablished
pulledFiles         0
pulledDirectories   0
deletedEntries      0
pendingLocalChanges 0
conflicts           []
```

随后直接在 Android Documents source 中执行三类外部变化：修改 `intro.md`、新增 `research/remote.md`、删除 `guides/setup.md`。第二次 reconcile 返回：

```text
status              pulled
pulledFiles         2
pulledDirectories   1
deletedEntries      1
pendingLocalChanges 0
conflicts           []
```

mirror 内容与 source 一致，原 `.jtype/workspace.json` / publish metadata 保留，且 `vaults/external` 下没有遗留 `.reconciling`、`.reconcile-backup` 或 `.source-snapshot-*`。实现先复制现有 mirror 到 staging，在 staging 中应用 path delta 并重新计算 manifest；校验通过后才执行 mirror → backup、staging → mirror 的可恢复切换。若进程在两次 rename 之间终止，下一次 external describe/open/reconcile 会恢复 backup。

冲突测试分别把 source 与 mirror 的 `intro.md` 改成不同内容。返回值为：

```text
status              conflict
pulledFiles         0
pendingLocalChanges 1
conflicts           [{ relativePath: "intro.md", reason: "bothModified" }]
```

测试前后的 provider store SHA-256 完全相同，mirror 保留本地内容，baseline revision 没有推进；force-stop / cold launch 后同一个 conflict 再次被确定性识别。因为正式 external-vault UI 尚未开放，以下截图使用明确标注的 test-only audit overlay 呈现真实 cold-start IPC 结果；它不是产品 UI，截图后已通过冷启动清除：

![Android SAF reconcile conflict audit](assets/phase-2/android-saf-reconcile-conflict.png)

将 source 与 mirror 收敛到相同内容后，reconcile 返回 `unchanged` / 0 pending / 0 conflict 并安全推进 baseline。随后把 source 的 `research/remote.md` rename 为 `research/renamed.md`，真实结果为 `pulledFiles=1`、`deletedEntries=1`，mirror 与 `WorkspaceSnapshot` 均只保留新路径。安装最终 APK 并再次 cold launch 后，reconcile 返回 `unchanged`，provider ID、mirror root、baseline 与唯一 persisted tree grant 都保持稳定。

最后精确构造事务中断状态：force-stop app，将 active mirror 改名为固定 `.41922042f61ba816.reconcile-backup`，确认 active path 不存在后冷启动 `231a2dc`。第一次 `describe_vault_provider` 自动恢复 backup，紧接着 `open_workspace` 返回完整树；最终只剩 active mirror，backup/staging 均不存在。该恢复 hook 与 reconcile 共用同一操作锁，open 不会撞上正在进行的原子切换。

Rust reconcile tests 9/9 覆盖：内容 hash / reserved metadata 排除、source-only pull、both-modified conflict、父目录删除与本地子项冲突、无 baseline bootstrap guard、record revision trust、原子 mirror swap、进程中断 backup 恢复、排除目录不被递归删除。

本增量有意保持以下限制：

- 正式 external vault UI capability 仍关闭；系统 picker 只通过调试 IPC 验证。
- mirror 仍是只读 provider；常规写入、创建、重命名和删除尚未路由回 SAF source，descriptor 对这些 capability 继续返回 `false`。
- source 内容变化检测、安全 pull、删除/rename 与冲突阻断已经实现；双向 write-back、冲突选择/合并与 mutation journal 尚未实现。
- 当前每次 reconcile 仍完整枚举并 materialize source 到短期 app-private snapshot，再按 manifest delta 更新 mirror；真正的按需 source materialization 与大 vault 性能优化留在 2D。
- permission health、replacement tree 重新授权与 pull command 已完成，但正式 UI 提示/入口要在 write-back 行为稳定后才接入复用的 Welcome/VaultHome action callback。

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
- `0b69f16`：Android SAF permission health、`authorizationRequired` / `sourceUnavailable` 状态恢复、replacement tree 重新授权与旧 grant 释放。
- `f9537f2`：SHA-256 manifest baseline、三方 reconcile plan、原子安全 pull、delete/rename 与 conflict guard。
- `231a2dc`：external describe/open 在事务中断后先恢复 mirror backup，再返回 provider/workspace。

## 自动化与构建结果

| 验证 | 结果 |
| --- | --- |
| `npm run build` | PASS |
| `npm run test:unit` | PASS，47/47 |
| `npx playwright test tests/e2e/app.spec.ts` | PASS，42/42 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS，20/20；provider 6/6，reconcile 9/9 |
| `cargo check --manifest-path plugins/mobile-import/Cargo.toml` | PASS |
| `cargo fmt --manifest-path plugins/mobile-import/Cargo.toml --check` | PASS |
| `pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| Android SAF picker / initial mirror / persisted permission / idempotent reselect / cold restore | PASS |
| Android persisted permission loss / source move / replacement reauthorization / old grant release | PASS |
| Android baseline bootstrap / source edit-create-delete / rename / both-modified conflict / cold restore / cleanup | PASS |
| Android interrupted mirror transaction → cold describe/open backup recovery | PASS |
| `pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS；Android reconcile 增量未开启 iOS capability |
| iOS clean install / Maestro default vault flow / localized shell | PASS（2A contract 增量；本次只重跑 compile gate） |

Android debug APK：

- `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
- 374,307,155 bytes
- SHA-256 `538ac39ec2d77eb2162f17381b669622c99a8626ed622f543a5ceebd9eb82b23`

iOS archive：

- `src-tauri/gen/apple/build/jtype_iOS.xcarchive`
- no-sign simulator archive，约 99 MB

截图 SHA-256：

```text
9e7588d5c42ca9e76f8ac5b102cbb5f87a3c1d294035aaa737e86f172c50a0ea  localized-welcome-ios.png
4ca09fcf784119fb175202638907e2dec1a0bc8c7fd6da10652111b6b5c1e64c  provider-contract-android.png
d0c3678bbb8ae7c24e69044f53a501ac52a6c66a924da3263a76a4f7edee0055  provider-contract-ios.png
fab1577c4ac914eb86df29678fbbc6310af83dc4c8db9346ca8a5f8bb5113c66  android-saf-initial-import.png
12aed07f2bcc35c8a59f006b695444ef94b279fe5168db99738e85f351b68dc2  android-saf-reconcile-conflict.png
```

## 下一增量：2B Android SAF mutation routing 与受控 write-back

下一段继续按已冻结的 contract 实现：

1. 让 shared workbench 的 write/create/rename/delete command 先解析 provider，并为 external mirror 记录确定性的 pending mutation，而不是直接把本地成功误认为 source 已写入。
2. 在 Android native adapter 实现受控 create/write/rename/delete，并以 mutation journal + idempotency 保证中断后可重试。
3. write-back 前再次比较 baseline/source/mirror；source 已被其他 app 修改时复用当前 conflict contract 阻止覆盖。
4. 完成部分失败、磁盘不足、权限中途失效与进程终止恢复测试后，逐项开启 descriptor 的 write/create/rename/delete capability。
5. 双向闭环稳定后，再把入口、reconcile 状态和重新授权提示接入复用的 Welcome/VaultHome/EditorShell callbacks。

iOS security-scoped bookmark 会在 Android SAF contract 与 reconcile 行为稳定后复用同一 store、descriptor 和 mirror 状态机。
