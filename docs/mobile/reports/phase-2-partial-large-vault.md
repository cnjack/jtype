# Phase 2D：Mobile partial 5,000-entry vault gate

日期：2026-07-19

Feature branch：`codex/mobile-app`

实现 commit：`231aa18`

状态：Android API 36 的 5,008-entry partial cold open、连续分页、尾部搜索/打开与内存采样通过；Desktop/shared 自动化和双平台编译通过。iOS 当前 Xcode 26.6 / iOS 26.5 Simulator 的静态 custom-scheme 启动仍复现既有空白 WebView，因此本报告不宣称 iOS 5,000-entry runtime 或 physical-device low-memory gate 通过。

## 结论

这次没有创建 mobile-only Markdown 列表、编辑器、Preview、Document Info 或操作层，也没有把 web landing page、docs website 或 dashboard 放进 app。Android/iOS 继续使用根 `src/` 的 Desktop `Sidebar`、`QuickSwitcher`、`EditorShell` 和 commands；移动差异仍只存在于 runtime capability、Tauri/Rust shallow page 与 provider adapter。

`231aa18` 做了两项收口：

1. 将 shared `TreeNodeList` 的 DOM 渐进 window 与 native shallow page 合并为一个 **Show more** 操作。真实 Android 5,008-entry 运行曾暴露两个同名按钮（一个扩展已加载 DOM、一个读取 native page）；现在每次点击同时扩展可见 window，并在 partial cursor 存在时读取下一页，加载期间通过 `aria-busy`/`disabled` 防止重复请求。Desktop complete snapshot 仍只扩展 DOM window，不调用 native page。
2. mobile partial bootstrap 记录完整 JavaScript → Tauri IPC 耗时和 UTF-8 snapshot 字节数。指标位于内部 runtime adapter，Desktop 完整 `open_workspace` 路径不变。

## Android 性能与连续分页

环境：Android API 36 arm64 emulator，1080×2424；app-private default vault 根目录共 5,008 个 entry，其中 5,000 个为确定性 Markdown fixture。

| 指标 | 结果 |
| --- | ---: |
| Activity cold launch `TotalTime` | 302 ms |
| native partial root page | 16 ms |
| JavaScript → Tauri partial bootstrap | 22.4 ms |
| initial serialized snapshot | 30,580 bytes |
| 首批 | 160 / 5,008 entries |
| 第二个 native page | 21 ms，累计 320 / 5,008 |
| cold stable memory（5 秒） | PSS 126,056 KB；RSS 304,012 KB；swap PSS 106 KB |
| 第二页后 memory | PSS 119,549 KB；RSS 298,260 KB；swap PSS 47 KB |

第二页后的采样没有出现随分页增长的 RSS；单次模拟器样本不能替代 physical-device peak/memory-warning gate。早期 complete snapshot 基线 `85dee2f` 在同族 5,003-document fixture 的 native full open 为 131 ms；本轮 native 首批为 16 ms，但旧报告没有记录完整 snapshot 的 IPC bytes/RSS，因此只记录 core 枚举时延变化，不推导完整端到端内存降幅。

原始数值保存在 [`android-partial-large-vault-performance.txt`](assets/phase-2/android-partial-large-vault-performance.txt)。

连续分页后只保留一个共享操作，徽标显示剩余 4,688 项：

![Android partial large vault page](assets/phase-2/android-partial-large-vault-page.png)

native 全 vault search 直接命中尚未加载的 `performance-note-04999.md`：

![Android partial large vault tail search](assets/phase-2/android-partial-large-vault-search.png)

命中项继续由 Desktop 共用 `EditorShell` 和原有 read command 打开唯一正文：

![Android partial large vault shared editor](assets/phase-2/android-partial-large-vault-editor.png)

现有 `tests/mobile/android-large-vault.yaml` 在最终 APK 上通过 Documents → tail search → open → unique body 完整 flow，总 wall time 约 28.8 秒（包含 Maestro driver 和断言）。

## iOS 当前 gate

同一源码的 no-sign aarch64 Simulator archive 编译/归档通过。安装后静态 custom-scheme WebView 仍为空白：

![iOS static archive baseline-reproducible blank WebView](assets/phase-2/ios-partial-large-vault-static-blank.png)

该现象已在改动前基线 `434757d`、当前 `231aa18` 以及 clean archive 中重复出现。Tauri dev 首启还受到当前 Simulator 本地网络授权/WebView 主线程阻塞，Maestro XCUITest driver 也无法取得稳定 hierarchy；因此没有用 dev build 伪装 iOS 5,000-entry 静态产物验收。准确结论是：iOS compile/archive **PASS**，本轮 5,000-entry static runtime **BLOCKED BY BASELINE-REPRODUCIBLE ENVIRONMENT ISSUE**。

## 构建产物与回归

```text
Android universal debug APK
394,161,686 bytes
SHA-256 ec3f72e7ebea809348148f769de6b0d624fe8af8c53812f647095b73cc05d6c9

iOS Simulator archive app binary
108,871,656 bytes
SHA-256 7a66b01464e04e0f31cea73c2cc3283296909707e1e8f875b5592af39f859694
```

| 验证 | 结果 |
| --- | --- |
| `pnpm build` | PASS |
| `pnpm test:unit` | PASS，72/72；新增 bootstrap count、elapsed clamp 与 UTF-8 snapshot byte 测试 |
| `pnpm test:e2e` | PASS，56/56；405-entry partial fixture 连续读取三页，并断言始终只有一个 Show more、末页后消失 |
| `cargo test --manifest-path services/jtype-core/Cargo.toml` | PASS，44/44 |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | PASS，29/29 |
| Android aarch64 universal debug APK | PASS；安装、cold launch、连续分页、tail search/open 与 memory sample 完成 |
| iOS aarch64-sim no-sign archive | PASS；当前环境静态 runtime 不通过，未标记功能/性能 PASS |

截图 SHA-256：

```text
11ae9a0d299083f43bc61274bf2e71b2fbd62570a63427138ff40b46cd5b4f51  android-partial-large-vault-page.png
1ca1c4256e06381bd0c43516e1e76e6f1cc283b44e5b2e10554d0c772802853a  android-partial-large-vault-search.png
a71e5b1dd6357c5844d389fdc06002db09e25c3a568bc56a55600120938d75d2  android-partial-large-vault-editor.png
daa7a7b60c0bd3aea0f8af773e91f5c59b0744f22447ef2beff64b4b9f290bdc  ios-partial-large-vault-static-blank.png
```

## 剩余边界

1. 当前每页仍会重新枚举并排序目标目录的全部直接子项；它减少 snapshot/IPC，不是 provider-native streaming cursor。
2. external vault 首次 mirror 与 source manifest/hash scan 仍会遍历完整 source。
3. physical Android/iPhone 的 peak RSS、memory warning、后台恢复与低存储 gate 未完成。
4. iOS 必须在 physical iPhone、不同稳定 Xcode/Simulator 组合或上游 custom-scheme 修复后重跑静态 archive、5,000-entry 和 Files provider gate。
