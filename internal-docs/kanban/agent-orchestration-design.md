# JType 看板 — Agent 编排设计（Symphony 式）

状态：**设计提案（仅设计，未实现，不含代码）**
初始日期：2026-06-20
对应缺口：[`gaps-and-roadmap.md`](./gaps-and-roadmap.md) 第 2.D 节（D1–D4）
灵感来源：[openai/symphony](https://github.com/openai/symphony) 的 SPEC（轮询 issue tracker → 隔离工作区 → 自主编码 agent → 回贴工作证据 → 验收后落地 PR）

> 本文只描述目标形态、数据模型与协议，**不落地任何实现**。落地前需先完成 `gaps-and-roadmap.md` 阶段 0（数据模型拍板）与阶段 1（B2 活动历史、C5 自定义字段为前置）。

---

## 1. 目标

把 JType 看板从"人/agent 手动 CRUD 卡片"升级为"**看板即工作队列**"：将卡片移入某一列（或打上某标签）即声明"这张卡可以自主开工"，系统拉起一个隔离的编码 agent 完成它，agent 把工作证据（CI 状态 / PR 链接 / 复杂度 / 走查）结构化地回贴到卡片上，人只在"验收"这一层介入。

**与 Symphony 的对应关系：**

| Symphony 组件 | JType 对应（拟） | 现状 |
|---------------|------------------|------|
| Issue tracker（Linear） | 云端 DB 看板（`kanban_*` 表） | ✅ 已有 |
| WORKFLOW.md（配置+提示词） | 看板级 / workspace 级 `WORKFLOW.md`（vault 内） | ❌ 待加 |
| Orchestrator（轮询+派发+重试） | 新增 `jtype-orchestrator`（进程或 jtype-web 后台任务） | ❌ 待加 |
| Workspace Manager（每 issue 隔离工作区） | 复用 vault 工作区隔离 + git worktree | ◐ 部分可复用 |
| Agent Runner（Codex app-server） | **jcode**（headless 模型驱动） | ◐ 已有，需 app-server 式接口 |
| 候选 issue 选取（state/label/blocker） | 看板列 + 标签 + **卡片 blocker（D1）** | ◐ 缺 blocker |
| 工作证据回贴 | **卡片 run 状态机 + 证据字段（D3）** | ❌ 待加 |
| 状态机动作（claim/续跑/回报） | **MCP 状态机动作（D4）** | ◐ 仅 CRUD |

---

## 2. 设计原则

1. **看板是唯一权威工作队列**——不引入第二套队列；agent 的输入输出都落在卡片上。
2. **复用现有基建**——云端 DB 看板（REST/WS/乐观锁/回收站）、MCP server、jcode、vault 工作区隔离、`jtype-core` crate，尽量不重造。
3. **状态机显式化**——卡片的"运行态"是一等公民，可被人和 agent 同时观察。
4. **隔离与安全先行**——每个 run 在独立 git worktree / 沙箱内,默认不自动落地（land 需显式验收）。
5. **可降级**——orchestrator 不可用时,看板仍是普通看板;agent 能力是叠加层,非依赖。

---

## 3. 数据模型增量（拟）

> 均为**新增**,不破坏现有 6 表。最终是否独立表 vs 复用 `properties_extra` JSON,在阶段 0 拍板。

### 3.1 D1 — 卡片依赖 / blocker

```
kanban_card_links            -- 卡片间有向关系
  id (UUID)
  workspace_id
  board_id
  from_card_id               -- 被阻塞方
  to_card_id                 -- 阻塞方（to 完成前 from 不可开工）
  kind ENUM('blocks','relates','duplicates')
  created_at
  UNIQUE(from_card_id, to_card_id, kind)
```

"可开工"判定：`from` 卡的所有 `kind='blocks'` 的 `to` 卡均处于终态列（done-column）。对照 Symphony "issue 在 Todo 且无非终态 blocker 才 dispatch"。

### 3.2 D3 — 卡片 run 状态 + 工作证据

```
kanban_card_runs             -- 一张卡的一次（或多次）自主运行
  id (UUID)
  workspace_id, board_id, card_id
  status ENUM('queued','preparing','running','awaiting_review',
              'succeeded','failed','timed_out','canceled')
  attempt INT                -- 重试计数（指数退避，对照 Symphony）
  workspace_path             -- 隔离工作区 / worktree 路径
  agent_session_id           -- jcode 会话 id（<thread>-<turn>）
  evidence JSON              -- { ci_status, pr_url, complexity, walkthrough_url, token_usage, … }
  error TEXT
  started_at, updated_clock, ended_at
```

卡片不直接背运行态,而是关联 `card_runs`(一对多,支持重试/多轮)。UI 在卡片 peek 里展示最近一次 run 的 status + evidence。

### 3.3 D2/配置 — WORKFLOW.md（vault 内,仓库自有）

复用 Symphony 的"仓库自有配置 + 提示词模板"思路。放在 vault 根或看板目录：

```markdown
---
trigger:
  board: "Engineering"
  column: "Ready"          # 卡进入此列即 eligible
  required_labels: ["agent-ok"]
agent:
  command: "jcode app-server"   # 见 §5
  max_concurrent: 4
  max_turns: 20
  max_retry_backoff_ms: 300000
workspace:
  isolation: worktree            # 复用 EnterWorktree 思路
  after_create: "git clone … && pnpm install"
land:
  policy: manual                 # manual | auto-on-green
---
（提示词模板正文：渲染卡片 title/description/evidence 给 agent）
```

支持热加载(改文件即生效),对照 Symphony 的 dynamic reload。

---

## 4. 编排生命周期（卡片 run 状态机）

```
              卡进入 trigger 列 + 满足 required_labels + 无未完成 blocker
                                   │
              orchestrator 每个 tick 轮询 eligible 卡（reconcile 先于 dispatch）
                                   │ claim（防重复派发）
        queued ─► preparing ─► running ──(多轮 turn,回查卡状态)──► awaiting_review
           │         │           │                                    │
           │         │           │ stall 超时→kill→指数退避重试         │ 人验收
           │         └───────────┴─► failed / timed_out                │
           │                                                            ▼
           └────────────────────────────────────────────► succeeded（land：手动/绿灯自动）
```

要点(均对照 Symphony SPEC):
- **单权威 orchestrator** + claim 机制,防止一张卡被并发派发(可复用云端乐观锁/`sync_clock`)。
- **每 tick 先 reconcile**:刷新卡状态(卡被人移出 trigger 列 / 移入 done → 取消或停止 run)、stall 检测(jcode 无事件超时→kill→重试)。
- **重试退避**:`delay = min(10000 · 2^(attempt-1), max_retry_backoff_ms)`,正常退出短续跑。
- **多轮 turn**:一次 worker 生命周期内 agent 可多轮,首轮发完整渲染提示词,续轮只发 guidance。
- **隔离工作区**:每个 run 一个 git worktree(复用 `EnterWorktree`/vault 工作区隔离),路径前缀校验防越界。

---

## 5. Agent Runner：jcode 作为 "app-server"

Symphony 启动 `codex app-server` 走 JSON 行协议;JType 的对应物是 **jcode**(headless 模型驱动)。

需要(设计层面,不实现):
- jcode 暴露一个**非交互、行协议的 app-server 模式**(`jcode app-server`),输入工作区 cwd + 渲染后的提示词,流式输出事件(turn 开始/结束、token 用量、需审批、错误)。
  - ⚠️ 前置约束(见记忆 `jcode-headless-testing`):jcode 现有 `-p`/`doctor` 依赖 TTY,headless 下会 crash。app-server 模式必须绕开 TTY 依赖,直接驱动模型 API。这是 D 路线的**硬前置**。
- orchestrator 以 `bash -lc "<agent.command>"` 在工作区目录启动子进程,解析事件,把进展写回 `kanban_card_runs.evidence` 并经 WS 广播。
- 审批策略(auto-approve / 人工 / fail)由 WORKFLOW.md 声明,对照 Symphony 的 approval policy。

---

## 6. D4 — 带状态机语义的 MCP / 工具动作

现有 MCP 工具是 CRUD 级([`mcp/tools.rs:99`](services/jtype-web/src/mcp/tools.rs#L99))。新增(供 orchestrator 与 agent 调用)：

| 工具 | 语义 |
|------|------|
| `claim_card` | 认领卡片,创建 `card_run`(queued→preparing),写 claim 防并发 |
| `start_run` | preparing→running |
| `report_progress` | 追加 evidence(ci/pr/complexity…),不改状态;对照 Symphony 工作证据 |
| `request_review` | running→awaiting_review |
| `complete_run` | awaiting_review→succeeded(+可触发 land) |
| `fail_run` | →failed,带 error,触发退避重试 |
| `list_eligible_cards` | 供 orchestrator 拉取可开工卡(封装 blocker 判定) |

这些动作写 `kanban_card_runs` + 经 WS 广播 `kanban:run-*` 事件,人端实时可见。

---

## 7. 信任与安全（沿用 Symphony 的边界,适配 JType）

- **工作区隔离**:每 run 独立 git worktree,路径前缀校验,沙箱标识 sanitize(对照 Symphony 三条文件系统不变量)。
- **默认不自动落地**:`land.policy=manual` 为默认;`auto-on-green` 需显式开启且要求 CI 绿。
- **审批策略显式**:WORKFLOW.md 声明;未支持的工具返回失败而非卡死会话。
- **凭据收窄**:agent 子进程的 token/网络作用域由实现定义,默认最小化。
- **可信环境前置**:与 Symphony 一样,初期定位"可信环境的工程预览",不面向不可信多租户。

---

## 8. 复用 vs 新建一览

| 能力 | 复用 | 新建 |
|------|------|------|
| 工作队列 / 卡片模型 | ✅ 云端 DB 看板 | — |
| 实时通知 | ✅ WS hub + 自回声过滤 | `kanban:run-*` 事件 |
| 并发安全 | ✅ 乐观锁 / `sync_clock` | claim 语义 |
| 工作区隔离 | ◐ vault 隔离 + worktree | per-run worktree 管理 |
| Agent 运行 | ◐ jcode | jcode app-server 模式（硬前置） |
| 配置 | — | WORKFLOW.md 加载 + 热加载 |
| Orchestrator | — | 轮询 + reconcile + 退避（核心新建） |
| 工具协议 | ◐ MCP server | 状态机动作（§6） |

---

## 9. 阶段化（落地时,本文档只到设计）

1. **前置**:jcode app-server 模式(绕开 TTY);C5 自定义字段 + B2 活动历史就绪。
2. **数据模型**:`kanban_card_links`(D1)、`kanban_card_runs`(D3)迁移 + 校验。
3. **协议**:D4 MCP 状态机动作 + `kanban:run-*` 事件。
4. **Orchestrator**:WORKFLOW.md 加载 → 轮询 eligible → claim → 派发 → reconcile → 退避重试,单板试点。
5. **工作证据 UI**:卡片 peek 展示 run 状态 + evidence;land 验收入口。
6. **收口**:审批策略、auto-on-green、可观测性 dashboard(对照 Symphony 可选 HTTP dashboard)。

---

## 10. 开放问题

- **A2 数据模型未拍板** → 直接影响 run/links 是独立表还是 `properties_extra`。
- **桌面参与度**:agent 编排放云端(jtype-web 后台任务)还是独立 orchestrator 进程?桌面只观察还是也能派发?(与 A1 同步缺口耦合。)
- **jcode app-server 模式工作量**:这是整条路线的瓶颈,需单独评估。
- **land 落地通道**:JType 卡片如何与真实 git 仓库 / PR 关联?(Symphony 假定仓库即 issue 上下文,JType 看板与代码仓库的绑定关系待定义。)
- **多 agent / 多 tracker 抽象**:是否需要像 Symphony SPEC 那样把"tracker"与"agent"都抽象化,留出 jcode 之外的 runner?
