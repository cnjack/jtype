# JType Mobile Roadmap & Tracking

> 最后更新：2026-07-18  
> Feature branch：`codex/mobile-app`  
> 当前阶段：Phase 1 — Desktop feature parity on mobile
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
- [~] `AdaptiveAppShell`：desktop 固定 sidebar；phone 已使用 Headless UI drawer；tablet 固定 sidebar 待实现
- [x] 复用 Sidebar 内容组件，保证 vault 文件树、搜索、收藏、Library、Publish、Account 只有一份业务实现
- [~] 已处理 app shell 顶/底 safe area；dynamic viewport、软键盘、横竖屏和完整 44×44pt 触控审计待完成
- [x] desktop header drag region 与 mobile safe-area header 由 capability 决定

### 1.2 Markdown 文档工作台

- [x] 复用 `EditorShell`、Markdown pipeline、toolbar 与 command system
- [~] phone 已使用 Write / Preview tabs、desktop 保持 Write / Split / Preview；tablet Split breakpoint 待完成
- [~] selection、滚动同步、编辑器聚焦和 unsaved state 复用现有实现；软键盘真机 smoke test 待完成
- [ ] desktop 右键动作在 touch 上提供 long-press 或显式 action menu，命令实现仍复用一份
- [ ] 文件列表、创建、重命名、移动、删除与保存均可在触摸设备完成

### 1.3 Document Info

- [x] Document Info sections 只有一份渲染与业务实现，由 desktop inspector 和 mobile sheet 共用
- [x] desktop 继续作为右侧 inspector
- [~] phone 已使用 Headless UI `Dialog` / `DialogPanel` 底部 sheet；tablet 右侧 inspector breakpoint 待完成
- [x] Properties、Outline、Publish、Links 的字段、校验和动作与 desktop 一致

### 1.4 Board

- [x] 复用 shared `BoardSurface`、`BoardPeek` 和现有数据 / action adapter，不建立 mobile 平行实现
- [x] compact / touch props 默认关闭，desktop 继续保持多列、hover action 与 pointer drag 行为
- [x] phone 使用横向 snap 列滚动、常驻显式 card action、move menu 和全宽 card detail
- [~] touch 已禁用易与滚动冲突的 pointer drag，并可通过 move menu 完成同一动作；双模拟器手势 smoke test 待阶段验收

### 1.5 本地 vault、导入与文件打开

- [ ] 默认 vault 位于 app-private storage，可离线创建和编辑 Markdown
- [ ] Android `content://` 与 iOS picked URL 通过 adapter copy/import 到 app-private vault
- [ ] 支持导入、导出、系统 file association / open-with 的基础流程
- [ ] app-private vault 继续使用 `jtype-core` 与现有相对路径模型

### 1.6 Account 与 cloud sync

- [ ] 复用 `useCloudSync`、冲突处理、vault binding 和现有 API contract
- [ ] token 改存 Stronghold 或系统安全存储，避免 mobile localStorage 明文持久化
- [ ] client/source 增加 `mobile`，通过新 migration 扩展服务端枚举或约束
- [ ] 保存、恢复前台和网络恢复时触发受控同步；WebView suspend 后能正确重连
- [ ] mobile browser OAuth/deep-link 回跳完成，desktop OAuth 路径不变

### 1.7 Phase 1 验收

- [ ] desktop 全量 app E2E 通过，关键视觉布局未变化
- [ ] Android/iOS：首次启动 → 创建/打开 vault → 新建文档 → 编辑 → Preview → 保存 → 重启后恢复
- [ ] Android/iOS：打开 Document Info 并编辑 properties；查看 Outline / Publish / Links
- [ ] Android/iOS：打开 Board、查看列、打开/移动 card
- [ ] Android/iOS：离线编辑后恢复网络并完成 cloud sync；冲突可见且可解决
- [ ] phone 与 tablet 尺寸、横竖屏、软键盘 smoke tests 通过
- [ ] 双平台截图与 `docs/mobile/reports/phase-1.md` 已提交
- [ ] tracking 已记录 Phase 1 commit hashes

## Phase 2 — External vaults and mobile integration

目标：支持用户选择外部目录作为 vault，并完成面向真实移动设备的系统集成、可靠性和性能工作。

预计：4–6 周。

### 2.1 External vault provider

- [ ] 定义 `VaultBackend` / `VaultProvider` 边界，保持 UI、AppState、commands、相对路径和 sync document model 不变
- [ ] Android Storage Access Framework：选择目录、持久化 URI permission、枚举/读写/重命名/删除文档
- [ ] iOS folder picker：security-scoped bookmark、权限恢复、失效后的重新授权
- [ ] 首选实现为 external directory ↔ app-private mirror，并明确 reconcile、冲突和删除规则
- [ ] 当 mirror 被证明不足时，再将 provider 扩展为零拷贝访问；不在 UI 层分叉
- [ ] 外部权限丢失、目录被移动或文件被其他 app 修改时有可恢复提示

### 2.2 移动交互完善

- [ ] long-press context actions、swipe、selection 和 haptic feedback
- [ ] undo/redo、keyboard accessory、硬件键盘 shortcuts 与 desktop command system 对齐
- [ ] accessibility labels、VoiceOver/TalkBack、动态字体与对比度检查
- [ ] 低内存、进后台、被系统终止后的草稿恢复

### 2.3 系统入口与后台能力

- [ ] universal/app links 与自有 deep links
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
- [ ] `docs/mobile/reports/phase-2.md` 已提交
- [ ] tracking 已记录 Phase 2 commit hashes

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
| 2026-07-18 | 1.4 | 待提交 | shared Board compact/touch 模式、显式移动动作与全宽 card detail | Phase 1 report 待完成 |

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
