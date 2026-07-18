# Phase 2C：iOS security-scoped external vault

日期：2026-07-18

Feature branch：`codex/mobile-app`

App code commit：`2e52c8b`

## 结论

iOS external vault 的工程实现与 Simulator gate 已完成。移动端继续复用 desktop 的 Open vault action、`AppState`、commands、`VaultHome`、文件树、`EditorShell`、Preview、Document Info、Board 和 provider banner；没有引入 landing page、帮助文档页、Web dashboard，也没有复制一份移动编辑器或文件列表。

iOS 差异只存在于 native/provider adapter：系统 folder picker 返回 security-scoped bookmark，Rust 将目录镜像到 app-private provider root，并继续复用 Android 已建立的 baseline、三方 reconcile、mutation journal、write-back、冲突处理与 progress contract。

## 实现边界

- `UIDocumentPickerViewController` 使用 folder/open-in-place 模式选择目录。
- bookmark 与 source reference 仅写入 native provider store，不返回 WebView。
- provider identity 使用 volume/file resource identifier；bookmark 刷新不会改变 provider ID。
- 每次目录操作成对调用 `startAccessingSecurityScopedResource` / `stopAccessingSecurityScopedResource`。
- stale bookmark 在 access health check 中刷新并原子回写 store。
- 首次导入先写 sibling staging tree，完整成功后再移动为稳定 mirror root。
- native 遍历限制为 64 层、50,000 entries，拒绝 symbolic link、不安全路径和 reserved directory。
- provider store schema 升级到 version 2，为旧 Android record 自动补 `sourceIdentity`。
- Tauri external-vault commands 泛化为 mobile contract；desktop command surface、参数和返回类型不变。

folder picker 最初暴露了一个真实生命周期问题：同步 Tauri command 从 iOS 主线程调用 plugin，而 picker 又需要主线程 present，造成 main run loop 持续 busy。初始化、重新授权、reconcile 和冲突解决现在通过 blocking worker 执行；Swift 可以正常回到主线程呈现系统 picker，WebView 也不会被长操作占住。

## 容器迁移

iOS Simulator 在覆盖安装后会给 app 分配新的 data-container UUID，同时迁移 Application Support。provider store 中原先保存的 absolute mirror path、WebView 的 last path 和 Recent 因此可能继续指向旧 UUID。

本增量在两个层次完成迁移：

1. Rust 读取 provider store 时，根据稳定 provider ID 把每个 mirror root 重建到当前 app-data root，并原子保存。
2. 共享前端启动迁移从当前 default vault 推导 `/vaults` root，同时重写 `/vaults/default/**` 与 `/vaults/external/**` 的 last path 和 Recent。

实际连续覆盖安装后，container 从旧 UUID 切换到 `BAEB895F-…`；app 冷启动仍直接恢复 `File Provider Storage / JTypeMobileVault / intro.md`，provider store、当前文档和 Recent 均指向新容器。

## Simulator 验证

环境：iPhone 17 Pro Simulator，iOS 26.5，arm64；Maestro 2.6.1；no-sign simulator archive。

真实 source 位于 Files 的 `File Provider Storage/JTypeMobileVault/intro.md`。完成的链路包括：

1. 共享 Welcome 的“打开库”打开 iOS 原生 folder picker。
2. 选择目录后建立 bookmark、稳定 identity 和 app-private mirror。
3. 共享 `VaultHome` 显示目录与 Markdown 文档，打开后进入同一 `EditorShell`。
4. terminate/launch 与两次覆盖安装后，provider 和当前文档仍可恢复。
5. 在 shared editor 中写入 marker 并点击 shared Save；mirror 与 Files source 的 `intro.md` 同时出现相同 marker。
6. Maestro hierarchy 确认 Save bounds 为 `[305,111][337,143]`，完整位于 402pt viewport 内。

真实键盘测试还发现 iOS 会在聚焦小于 16px 的 textarea 时自动缩放整个 WebView，导致 header actions 离开屏幕。compact workbench 现在给共享 Markdown editor 设置 16px 字号下限；desktop 仍使用原 13px × zoom 规则。E2E 同时验证 compact editor 字号下限和 Save 右边界。

![iOS security-scoped vault in the shared editor](assets/phase-2/ios-security-scoped-shared-editor.png)

可重复的 native picker smoke flow 位于 `tests/mobile/ios-external-vault.yaml`，覆盖 clean state → Open vault → system Browse → On My iPhone。目录 fixture 的首次导入、冷恢复、容器迁移和写回使用真实 Files source 完成，未将机器相关 bookmark 或绝对路径纳入仓库。

## 门禁

| 验证 | 结果 |
| --- | --- |
| `npm run build` | PASS |
| `npm run build --prefix services/jtype-web/frontend` | PASS |
| `npm run test:unit` | PASS，47/47 |
| `npx playwright test tests/e2e/app.spec.ts` | PASS，44/44 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS，28/28 |
| `cargo check --manifest-path plugins/mobile-import/Cargo.toml` | PASS |
| root/plugin `cargo fmt --check` | PASS |
| `cargo check --release --manifest-path src-tauri/Cargo.toml` | PASS |
| `cargo check --manifest-path services/jtype-web/Cargo.toml` | PASS |
| `pnpm tauri android build --debug --target aarch64 --apk --ci` | PASS |
| `pnpm tauri ios build --debug --target aarch64-sim --no-sign --archive-only --ci` | PASS |
| iOS native picker smoke | PASS |
| iOS initial mirror / cold restore / container rebase / shared editor write-back | PASS |

截图 SHA-256：

```text
c213478f4fe7e1bde3d85447c08b9793b4559dc36de2cd40b80c065572bf876f  ios-security-scoped-shared-editor.png
```

## 剩余终验

2C 的代码与 Simulator gate 已收口。security-scoped bookmark 在 provider 失效后的重新选择已具备同一 canonical command/UI contract，共享 provider tests 覆盖对应状态；实际 iOS bookmark 失效与 physical iPhone 的 Files/iCloud/第三方 provider 行为仍放在 Phase 2 最终真实设备 gate，不将 Simulator 结果冒充真机结论。

下一段进入 2D：share target / share extension、pending OAuth 冷恢复、无障碍、草稿恢复、大 vault、低内存与弱网终验。
