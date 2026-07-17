# Desktop Baseline Report

> 日期：2026-07-18  
> 基线 commit：`8fb34eb`（代码基线等同于 `f0975a0`，前一个 commit 仅增加 mobile roadmap）  
> 分支：`codex/mobile-app`  
> 环境：macOS / Apple Silicon、Node.js v26.3.0、pnpm 11.6.0、Rust 1.96.1

## 目的

在引入 Android/iOS 工程和兼容逻辑前，冻结现有 desktop 产品的可重复测试基线。后续每个 mobile 工作段至少重新执行与改动范围相符的回归；每个完整 Phase 必须重跑本报告中的全部命令。

## 结果

| Gate | 命令 | 结果 |
| --- | --- | --- |
| Frontend production build | `pnpm build` | PASS；TypeScript 与 Vite build 完成 |
| Tauri backend tests | `cargo test --manifest-path src-tauri/Cargo.toml` | PASS；2 passed，0 failed |
| Desktop app E2E | `pnpm exec playwright test tests/e2e/app.spec.ts` | PASS；29 passed，0 failed |

## 覆盖到的 desktop 行为

29 个 app E2E 包含以下关键路径：

- welcome、default vault、vault home 和 OS initial Markdown open
- vault sidebar、single document、draft、save 与 trash
- Write/Split/Preview、KaTeX、Mermaid、table editing、find 与 zoom
- Document Info properties、outline 与 publish
- command palette、quick switcher 与 favorites
- browser OAuth、cloud binding、push/pull/deletion、conflict resolution 与 invite accept

## 已知非阻塞 warning

- Vite 报告现有大 chunk；该问题在 mobile 性能阶段单独跟踪，不是本次引入。
- `@maxgraph/core` 触发 direct `eval` build warning；本次没有修改该依赖。
- 若干 dynamic imports 同时被 static import，不能单独拆包；本次没有修改 import 策略。
- Node.js v26 对 `module.register()` 输出 deprecation warning；测试本身通过。

## 结论

mobile 开发开始前，现有 desktop build、Tauri unit tests 与浏览器驱动的 desktop UI/操作回归均为绿色。Phase 0 完成前还会补充真实 Tauri desktop app 的启动和关键模式截图，避免只依赖 mocked E2E。
