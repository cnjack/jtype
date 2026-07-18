# JType Mobile Roadmap & Tracking

> 最后更新：2026-07-18  
> Feature branch：`codex/mobile-app`  
> 当前阶段：Phase 2 — External vaults and mobile integration
> 状态说明：`[ ]` 未开始、`[~]` 进行中、`[x]` 已完成；只有附上真实测试证据后才能标记完成。

## 目标

在不改变现有 desktop 行为的前提下，让同一套 JType 应用代码运行于 macOS、Windows、Linux、Android 和 iOS。

移动端以 **desktop 产品体验** 为基准，而不是以 web dashboard 为基准。以下 desktop 功能属于移动端范围：

- vault 与 Markdown 文档列表
- Markdown 编辑器
- Write / Preview，以及屏幕允许时的 Split
- Document Info（Properties、Outline、Publish、Links）
- Board
- 搜索、Quick open、命令和账户/云同步

移动端不包含 web landing page、help/docs website、web dashboard 导航等网站内容。首次启动可以有必要的 vault 初始化或登录引导，但不能演变成营销 landing page。

## 架构约束

1. **单一产品前端**：desktop、Android、iOS 都使用根目录 `src/`；不建立第二套 mobile React app。
2. **单一 Tauri 后端**：共用 `src-tauri/` 和 `services/jtype-core/`；平台差异通过 `cfg`、Tauri platform config 和 adapter 处理。
3. **UI 内容复用**：Header、Sidebar、EditorShell、Document Info、Board、dialogs 的业务组件只维护一份。移动端只增加 adaptive container，不复制 `MobileEditorShell` 一类平行实现。
4. **行为能力集中判断**：平台差异统一收口到 canonical `RuntimeCapabilities`、filesystem adapter 和 lifecycle adapter，组件内不散落 user-agent 判断。
5. **shared 层保持纯净**：`shared/` 继续遵守 props-in / callbacks-out，不直接引入 Tauri API 或平台判断。
6. **desktop 默认不变**：没有 mobile capability 时继续走当前 desktop 路径；每一阶段都必须执行 desktop build、Rust test/check 和 app E2E。
7. **证据驱动验收**：Android 和 iOS 每阶段都要在模拟器实际启动并执行该阶段的 smoke flow，截图保存到仓库的 report assets 中。

## 每段工作的固定闭环

每个可独立验证的工作段都遵循以下顺序：

1. 在本文件更新本段状态与验收项。
2. 实现代码，避免混入无关改动。
3. 执行与改动风险相称的单元、构建、E2E 和 desktop 回归。
4. 分别在 Android Emulator 与 iOS Simulator 运行 smoke flow。
5. 将截图保存到 `docs/mobile/reports/assets/<phase>/`。
6. 在 `docs/mobile/reports/phase-<n>.md` 写入设备、系统版本、命令、测试结果、已知问题和截图。
7. 回写本 tracking 文档的证据链接和 commit hash。
8. 在同一个 `codex/mobile-app` 分支提交；一个 commit 只覆盖一个可说明的工作段。

任何阶段都不能仅凭 TypeScript build、Rust check 或浏览器响应式预览宣称移动端通过。

## Phase 0 — Mobile foundation

目标：在不改变 desktop 产品行为的前提下，生成可维护的 Android/iOS 工程，使共享应用壳能在两个模拟器启动，并建立后续兼容层。

预计：4–6 个工作日。

### 0.1 Roadmap 与基线

- [x] 创建统一 feature branch：`codex/mobile-app`
- [x] 落地本 roadmap/tracking 文档
- [x] 记录 desktop 基线：frontend build、Tauri Rust tests、app E2E
- [x] 保存 desktop 基线报告：`docs/mobile/reports/desktop-baseline.md`

### 0.2 工具链与工程生成

- [x] 安装 Rust Android targets：`aarch64-linux-android`、`armv7-linux-androideabi`、`i686-linux-android`、`x86_64-linux-android`
- [x] 安装 Rust iOS targets：`aarch64-apple-ios`、`aarch64-apple-ios-sim`、`x86_64-apple-ios`
- [x] 配置 Android SDK / NDK / emulator，并创建、冷启动 Android Virtual Device `JType_API_36_1`
- [x] 安装 iOS Simulator runtime，并启动 iOS 26.5 / iPhone 17 Pro Simulator
- [x] 运行 `tauri android init` 与 `tauri ios init`，将生成工程纳入版本控制
- [x] 增加便于重复执行的 mobile dev/build scripts

### 0.3 平台配置与 capability

- [x] 增加 `tauri.android.conf.json` 和 `tauri.ios.conf.json`
- [x] 移动端只创建 `main` window，不创建 desktop splash window
- [x] desktop updater、process restart、window drag 和 desktop path opener 权限不进入 mobile capability
- [x] 保持现有 desktop capability、native-tls 与 updater 配置行为不变
- [x] 确认 Android/iOS identifier 为 `net.jcode.jtype`，display name 为 JType，最低 Android 24 / iOS 14

### 0.4 运行时兼容层

- [x] 在 `src/lib/types.ts` 定义 canonical `RuntimeCapabilities`
- [x] 增加唯一的 capability provider/hook，区分 touch、compact layout、window drag、updater、file drop、external vault 等能力
- [x] Tauri mobile lifecycle 能被应用层订阅，desktop 继续使用当前行为
- [x] 将 `HOME/Documents` / `~/.config` 依赖改造为 Tauri app data/config path；desktop 路径迁移保持向后兼容
- [x] 为文件 URI 与真实 filesystem path 建立 adapter 边界，不让 `content://` / security-scoped URL 直接进入现有 `std::fs` 命令

### 0.5 Phase 0 验收

- [x] `pnpm build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] `pnpm exec playwright test tests/e2e/app.spec.ts`（31 passed）
- [x] macOS desktop binary 原生启动无崩溃；empty / vault home / document 等模式由同一轮 app E2E 验证
- [x] Android Emulator 启动 JType，共享 React app 显示成功，无启动崩溃，并创建 app-private 默认库
- [x] iOS Simulator 启动 JType，共享 React app 显示成功，无启动崩溃
- [x] Android 与 iOS 截图已保存，报告：`docs/mobile/reports/phase-0.md`
- [x] tracking 已记录 Phase 0 commit hash

## Phase 1 — Desktop feature parity on mobile

目标：在 app-private vault 上交付可离线使用的核心 JType 体验，复用 desktop UI 和操作模型，并用 adaptive container 适配触摸与小屏。

预计：4–6 周。

### 1.1 App shell 与导航

- [x] 共用现有 AppState、commands、hooks 和 mode routing
- [x] `AdaptiveAppShell`：desktop/tablet 使用固定 sidebar；phone 使用复用 Sidebar 内容的 Headless UI drawer
- [x] 复用 Sidebar 内容组件，保证 vault 文件树、搜索、收藏、Library、Publish、Account 只有一份业务实现
- [x] app shell 顶/底 safe area、dynamic viewport、Android/iOS 软件键盘、phone 横竖屏与核心 44×44pt actions 已完成真实模拟器审计（证据：`docs/mobile/reports/phase-1.md`）
- [x] desktop header drag region 与 mobile safe-area header 由 capability 决定

### 1.2 Markdown 文档工作台

- [x] 复用 `EditorShell`、Markdown pipeline、toolbar 与 command system
- [x] phone 使用 Write / Preview tabs，tablet 与 desktop 保持 Write / Split / Preview；断点由 capability provider 统一输出
- [x] selection、滚动同步、编辑器聚焦和 unsaved state 复用现有实现；Android/iOS 软件键盘真实触控与编辑区适配已通过（证据：`docs/mobile/reports/phase-1.md`）
- [x] desktop 右键动作在 touch 上通过 Headless UI action sheet 显式提供，动作 callback 与 desktop context menu 复用一份
- [x] 文件列表、创建、重命名、移动、删除与保存均有触控入口；创建 → 编辑 → 保存已有 390×844 E2E 覆盖

### 1.3 Document Info

- [x] Document Info sections 只有一份渲染与业务实现，由 desktop inspector 和 mobile sheet 共用
- [x] desktop 继续作为右侧 inspector
- [x] phone 使用 Headless UI `Dialog` / `DialogPanel` 底部 sheet，tablet 与 desktop 使用同一个右侧 inspector
- [x] Properties、Outline、Publish、Links 的字段、校验和动作与 desktop 一致

### 1.4 Board

- [x] 复用 shared `BoardSurface`、`BoardPeek` 和现有数据 / action adapter，不建立 mobile 平行实现
- [x] compact / touch props 默认关闭，desktop 继续保持多列、hover action 与 pointer drag 行为
- [x] phone 使用横向 snap 列滚动、常驻显式 card action、move menu 和全宽 card detail
- [x] touch 已禁用易与滚动冲突的 pointer drag；Android/iOS 均已通过显式 status/move action 将真实 card 从 To do 移到 Doing（证据：`docs/mobile/reports/phase-1.md`）

### 1.5 本地 vault、导入与文件打开

- [x] 默认 vault 位于 app-private storage，可离线创建、编辑和保存 Markdown
- [x] Android `content://` 与 iOS picked URL 通过 native materialization adapter 接入现有 app-private vault import 流程
- [x] 共用 desktop EditorShell 的 Export → Markdown action；mobile 通过内部 adapter 分享当前编辑缓冲区，Android/iOS 系统分享面板均已实机模拟器验证（证据：`docs/mobile/reports/phase-1-share-export.md`）
- [x] 共用 desktop EditorShell 的 Export → PDF action 与 renderer；mobile 将同一 PDF 交给 app-scoped cache / native Share Sheet，Android 实际 renderer 产物与双平台系统面板均已验证（证据：`docs/mobile/reports/phase-1-pdf-export.md`）
- [x] 导入与系统 file association / open-with 基础 adapter 已接入；第三方 provider、真实设备 Open with 与大文件生命周期作为 Phase 2 provider/system-integration 验收继续
- [x] app-private vault 继续使用 `jtype-core` 与现有相对路径模型
- [x] iOS app 更新导致 data-container UUID 变化时，默认 vault binding、settings、last paths 与 recent items 自动迁移到当前容器（实现：`ad5a9ef`）

### 1.6 Account 与 cloud sync

- [x] `useCloudSync`、vault binding 和现有 API contract 已复用；Android/iOS 双模拟器真实服务 push/pull 与连接 smoke test 已通过（证据：`docs/mobile/reports/phase-1-sync-recovery.md`）
- [x] 冲突模型与现有解决回调已复用；phone 使用 capability 驱动的单面板比较器，Android/iOS 均完成真实服务 conflict → manual merge → resolved 闭环（证据：`docs/mobile/reports/phase-1-conflict.md`）
- [x] token 已从 mobile localStorage / profile JSON 移除；Android Keystore 跨进程恢复和 iOS signed simulator Keychain 迁移/冷启动恢复均已验证（证据：`docs/mobile/reports/phase-1-secure-storage.md`、`docs/mobile/reports/phase-1-sync-recovery.md`）
- [x] canonical capability 输出 `clientType=mobile`；REST、sync push/pull 与 WebSocket 共用现有链路；0024 migration 扩展 `document_versions.source`
- [x] 保存、恢复前台和网络恢复时触发受控同步；WebView suspend 后能正确重连并去重（证据：`docs/mobile/reports/phase-1-sync-recovery.md`）
- [x] mobile browser OAuth 使用固定无凭据 callback；Android 与 signed iOS 均完成真实服务审批、系统回跳、poll 和 secure token 写回，desktop OAuth request/body 保持不变（证据：`docs/mobile/reports/phase-1-oauth-deep-link.md`）

### 1.7 Phase 1 验收

- [x] desktop app E2E 42/42 通过，mobile capability 与 desktop 默认行为同轮回归
- [x] Android/iOS：首次启动 → 创建/打开 vault → 新建文档 → 编辑 → Preview → 保存 → 重启后恢复（证据：`docs/mobile/reports/phase-1.md`）
- [x] Android/iOS：打开 Document Info 并编辑 properties；查看 Outline / Publish / Links（证据：`docs/mobile/reports/phase-1.md`）
- [x] Android/iOS：打开 Board、查看列、打开/移动 card（证据：`docs/mobile/reports/phase-1.md`）
- [x] Android 离线编辑/网络恢复、iOS suspend/resume cloud sync 与双平台真实服务重叠编辑冲突可见/手动解决均已通过（证据：`docs/mobile/reports/phase-1-sync-recovery.md`、`docs/mobile/reports/phase-1-conflict.md`）
- [x] phone / tablet、横竖屏及 Android/iOS 软件键盘 smoke test 已通过，iPad actual Split / right inspector 已验证（证据：`docs/mobile/reports/phase-1.md`）
- [x] 双平台 phone、iPad tablet 截图与 `docs/mobile/reports/phase-1.md` 已提交
- [x] tracking 已记录当前 Phase 1 commit hashes

## Phase 2 — External vaults and mobile integration

目标：支持用户选择外部目录作为 vault，并完成面向真实移动设备的系统集成、可靠性和性能工作。

预计：4–6 周。

### 执行顺序

1. **2A Provider contract（约 3–5 天）**：先冻结 provider identity、capability、mirror metadata、reconcile plan 和错误模型；现有 app-private filesystem 成为第一个 provider 实现，UI/AppState/commands 不改调用语义。
2. **2B Android SAF（约 1–2 周）**：目录选择、persistable tree URI、mirror 初次导入、双向增量 reconcile、权限丢失重新授权；Android 模拟器逐段留截图与报告。
3. **2C iOS folder provider（约 1–2 周）**：folder picker、security-scoped bookmark、访问生命周期、mirror reconcile 和失效恢复；signed Simulator 与真机分别验收。
4. **2D 系统集成与可靠性（约 1–2 周）**：share target、pending OAuth 冷恢复、无障碍、草稿恢复、大 vault/弱网测试；最后执行双平台真实设备 gate。

每个增量继续复用 desktop `Sidebar`、`VaultHome`、`EditorShell`、Document Info、Board、commands 和 sync model。provider 差异只能进入 Rust/provider adapter 与 canonical capability，不允许出现第二套 mobile 文件树或编辑器。

### 2.1 External vault provider

- [x] 定义 `VaultBackend` / `VaultProvider` descriptor、identity、access state、capability 与 versioned native record 边界；现有 app-private/local vault 已通过 provider resolver 打开，UI、AppState、commands、相对路径和 sync document model 不变（证据：`docs/mobile/reports/phase-2.md`，实现：`002fd18`）
- [~] Android Storage Access Framework：系统目录选择、persistable permission、原子首次 mirror、permission health、重新授权、SHA-256 baseline、三方安全 pull、both-modified guard、中断后 open recovery、versioned mutation journal，以及 shared workbench 的 write/create/rename/delete/Board/binary/folder/cloud/trash mutation routing 已完成；120 文件写回中途进程终止后的 journal 冷恢复、权限丢失前置阻断和重新授权恢复均已通过真实 API 36 模拟器，capability 开放与正式 UI 待后续 2B 增量（证据：`docs/mobile/reports/phase-2.md`，实现：`18fbeb8`、`0b69f16`、`f9537f2`、`231a2dc`、`99a7d39`、`123bea6`）
- [ ] iOS folder picker：security-scoped bookmark、权限恢复、失效后的重新授权
- [~] external directory ↔ app-private mirror 的 record、storage mode 与 capability contract 已建立；Android native record、首次导入、内容 baseline、安全 pull、受控双向 write-back、delete/rename、journal retry、conflict guard 和 shared command routing 已完成，capability 开放与 iOS 实现待 2B/2C 完成
- [ ] 当 mirror 被证明不足时，再将 provider 扩展为零拷贝访问；不在 UI 层分叉
- [~] Android external provider 已能检测权限丢失/目录移动、保持同一 provider identity 重新授权，并在其他 app 修改文件后安全 pull、合并不相交 source/local 变化或阻断同路径双边冲突；共享 desktop mutation 已通过 provider adapter 写回 SAF，正式复用 UI 提示/冲突选择、capability 开放与 iOS 实现待完成

### 2.2 移动交互完善

- [ ] long-press context actions、swipe、selection 和 haptic feedback
- [ ] undo/redo、keyboard accessory、硬件键盘 shortcuts 与 desktop command system 对齐
- [ ] accessibility labels、VoiceOver/TalkBack、动态字体与对比度检查
- [ ] 低内存、进后台、被系统终止后的草稿恢复
- [ ] device OAuth pending state 的安全持久化与进程终止/冷回跳恢复

### 2.3 系统入口与后台能力

- [~] 固定自有 OAuth deep link 已接入；universal/app links、冷启动恢复和文档定位待完成
- [ ] Android share target / iOS share extension 将 Markdown、文本或文件导入 vault
- [ ] APNs/FCM 通知用于协作变化提示；后台只做系统允许的有限刷新
- [ ] 通知/深链进入后定位到正确 cloud workspace、vault 和文档

### 2.4 大 vault 性能与可靠性

- [ ] 大文件树增量加载与搜索索引
- [ ] 大 Markdown、Mermaid、KaTeX、附件和 Board 的内存/渲染测试
- [ ] sync batching、重试、幂等和可观测错误报告
- [ ] 真实设备弱网、离线、磁盘不足、权限变化与进程终止测试

### 2.5 Phase 2 验收

- [ ] Android/iOS 外部 vault 选择、重启后恢复、增删改查和权限丢失恢复通过
- [ ] 外部 app 修改文件后 JType 能 reconcile，且不会静默覆盖用户内容
- [ ] share/deep-link/notification smoke flow 通过
- [ ] 大 vault 基准达到报告中预先记录的阈值
- [ ] desktop build、Rust tests、app E2E 全部通过
- [ ] 双平台模拟器与至少一台真实设备截图/录像证据已保存
- [~] `docs/mobile/reports/phase-2.md` 已记录 2A provider contract 与 2B Android SAF 首次 mirror 增量；后续持续更新到 Phase 2 终验
- [~] tracking 已记录当前 Phase 2 commit hashes；后续增量继续追加

## Phase 3 — Store readiness

预计：1–2 周。

- [ ] TestFlight internal testing 与 Google Play internal testing
- [ ] signing、provisioning、versioning、release build 和 CI artifacts
- [ ] privacy manifest、permissions 文案、data safety / privacy labels
- [ ] crash reporting、release health 和 rollback strategy
- [ ] 最终 desktop + Android + iOS 回归矩阵与 store submission report

## 测试矩阵

| 层级 | Desktop | Android | iOS |
| --- | --- | --- | --- |
| TypeScript build | 每段必跑 | 同一产物 | 同一产物 |
| Rust unit tests | 每段必跑 | cross-build 后补平台 smoke | cross-build 后补平台 smoke |
| App E2E | 每段必跑 | 关键 flow 用模拟器验证 | 关键 flow 用模拟器验证 |
| 视觉证据 | 关键模式截图 | 每阶段 phone；Phase 1 起 tablet | 每阶段 iPhone；Phase 1 起 iPad |
| 真实设备 | Phase 2 前非阻塞 | Phase 2 必需 | Phase 2 必需 |

最低 simulator 证据必须标明：设备型号、OS/API level、app commit、启动命令、测试 flow、结果、截图原文件路径。截图不得只包含 splash screen；应显示该阶段新增或验证的真实功能。

## Commit tracking

| 日期 | 阶段 | Commit | 内容 | 验证报告 |
| --- | --- | --- | --- | --- |
| 2026-07-18 | 0.1 | `8fb34eb` | 建立 mobile roadmap、阶段门禁与证据规范 | 本文 |
| 2026-07-18 | 0.1 | `7425311` | 冻结 mobile 开发前的 desktop 测试基线 | `docs/mobile/reports/desktop-baseline.md` |
| 2026-07-18 | 0.2–0.3 | `c4386df` | 生成 Android/iOS 工程、拆分平台 capability、增加 runtime capability contract | `docs/mobile/reports/phase-0.md` |
| 2026-07-18 | 0.4 | `7952226` | 使用 app-private 路径，增加 mobile lifecycle 与外部文件 URI 边界 | `docs/mobile/reports/phase-0.md` |
| 2026-07-18 | 0.4 | `a60ed04` | 修正 mobile 欢迎页私有库提示，隐藏未支持的 external vault 操作 | `docs/mobile/reports/phase-0.md` |
| 2026-07-18 | 0.5 | `d57e016` | 双模拟器启动、Android 私有库、desktop 回归与截图报告 | `docs/mobile/reports/phase-0.md` |
| 2026-07-18 | 1.1 | `9828de6` | phone 单栏 app shell、复用 Sidebar drawer、safe-area header/footer 与 compact VaultHome | Phase 1 report 待完成 |
| 2026-07-18 | 1.2–1.3 | `afc5707` | phone Write/Preview、触控 toolbar 与复用 Document Info bottom sheet | Phase 1 report 待完成 |
| 2026-07-18 | 1.4 | `e35db30` | shared Board compact/touch 模式、显式移动动作与全宽 card detail | Phase 1 report 待完成 |
| 2026-07-18 | 1.2/1.5 | `faa71d7` | touch 文件 action sheet、mobile New Resource sheet、创建编辑保存流程 | Phase 1 report 待完成 |
| 2026-07-18 | 1.2–1.3 | `bb026d3` | capability 驱动的 phone/tablet breakpoint、平板 Split 与右侧 Document Info | Phase 1 report 待完成 |
| 2026-07-18 | 1.6 | `3ae797f` | mobile client/source 贯穿共享 REST、sync 与 WebSocket，新增 0024 migration 及集成测试 | Phase 1 report 待完成 |
| 2026-07-18 | 1.6 | `5110c83` | Android Keystore / iOS Keychain adapter、mobile token redaction 与 legacy credential migration | `docs/mobile/reports/phase-1-secure-storage.md` |
| 2026-07-18 | 1.5 | `de16c21` | Android/iOS 外部文件 materialization、共享 vault import 与 open-with 队列 | `docs/mobile/reports/phase-1-external-import.md` |
| 2026-07-18 | 1.5 | `4321824` | 共用 EditorShell export action，Android/iOS 原生 Markdown system share adapter | `docs/mobile/reports/phase-1-share-export.md` |
| 2026-07-18 | 1.5 | `0556be3` | 复用 desktop PDF renderer/action，以 app cache 路径打开 Android/iOS system share | `docs/mobile/reports/phase-1-pdf-export.md` |
| 2026-07-18 | 1.6 | `27326e4` | mobile suspend/online 恢复协调、WebSocket restart、共享 push/pull 与 desktop 行为隔离 | `docs/mobile/reports/phase-1-sync-recovery.md` |
| 2026-07-18 | 1.6 | `844e9ea` | 复用 desktop device OAuth，以固定无凭据 callback 接入 Android/iOS deep-link 回跳 | `docs/mobile/reports/phase-1-oauth-deep-link.md` |
| 2026-07-18 | 1.6 | `99f474a` | 升级 Tao 锁定版本，避免 Android custom-scheme Intent 的 null MIME 崩溃 | `docs/mobile/reports/phase-1-oauth-deep-link.md` |
| 2026-07-18 | 1.7 | `b39e920` | capability 驱动的 phone 冲突 tabs、touch action footer 与 desktop 三栏隔离 | `docs/mobile/reports/phase-1-conflict.md` |
| 2026-07-18 | 1.7 | `1111156` | 真实服务冲突解决截图、双平台构建证据与临时数据清理记录 | `docs/mobile/reports/phase-1-conflict.md` |
| 2026-07-18 | 1.6–1.7 | `ad5a9ef` | iOS 容器路径迁移、eager conflict 可见性、同路径冲突去重与 legacy duplicate 清理 | `docs/mobile/reports/phase-1.md`、`docs/mobile/reports/phase-1-conflict.md` |
| 2026-07-18 | 2.1 / 2A | `002fd18` | 建立 provider identity、descriptor、capability、native-only external record 与 app-private provider resolver | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.1 / 2B | `18fbeb8` | Android SAF picker、persistable permission、native-only record、原子首次 mirror、幂等重复选择与冷启动恢复 | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.1 / 2B | `0b69f16` | Android SAF permission health、目录失效检测、同 provider 重新授权与旧 grant 释放 | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.1 / 2B | `f9537f2` | Android SAF SHA-256 baseline、三方安全 pull、原子 mirror 切换、delete/rename 与 conflict guard | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.1 / 2B | `231a2dc` | external describe/open 在事务中断后恢复 mirror backup | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.1 / 2B | `99a7d39` | Android SAF 受控 create/write/delete、确定性 write-back plan、versioned mutation journal 与 source-first conflict guard | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.1 / 2B | `123bea6` | shared Markdown/Board/binary/folder/cloud/trash mutation 通过 provider adapter 路由到 Android SAF | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.2 / shell | `232222c` | 约束共享 Welcome 内容在窄屏和本地化文案下的宽度 | `docs/mobile/reports/phase-2.md` |
| 2026-07-18 | 2.2 / shell | `309aebb` | 将共享 App shell Grid 列固定为 `minmax(0, 1fr)`，增加完整中文 locale overflow 回归 | `docs/mobile/reports/phase-2.md` |

## 当前环境审计（2026-07-18）

- macOS：Apple Silicon
- Node.js：v26.3.0
- pnpm：11.6.0
- Rust：1.96.1；desktop、Android 四个 ABI 与 iOS device/simulator targets 已安装
- Tauri CLI：2.11.2
- Xcode：26.6；iOS 26.5 runtime 与 iPhone/iPad Simulator devices 已安装
- Java：OpenJDK 21.0.11
- Android：SDK 36/36.1、Build Tools 35/36、NDK 27.2、emulator、platform-tools 与 `JType_API_36_1` AVD 已安装
- Apple mobile dependencies：XcodeGen 2.46.0、CocoaPods 1.17.0

## 未决策项

以下项目需要在相应阶段开始前依据 Apple/Google 当前规则和现有 desktop 兼容性做出记录，不以临时默认值悄悄固定：

- Store 上线前复核 `net.jcode.jtype` 的可用性；desktop identifier 保持 `com.markdownviewer.viewer`，不打断现有升级链
- external vault 的 mirror 冲突策略与删除保留期
- Phase 2 真实设备型号与 store team/signing 账号
