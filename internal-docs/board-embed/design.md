# 可嵌入看板组件包 `jtype-board-react` — 设计

> 目标:让**外部产品**只用 `baseUrl + token + workspaceId + boardRef` 四个 prop
> 就能把 jtype 看板**原样渲染**进自己的页面(列/卡片/拖拽移列),体验与 web/桌面一致。
> 首个消费方:jcode Cloud console(React 18.3 SPA,已消费已发布的 `jcode-ui` 包)。
> 配套:[shared-ui/design.md](../shared-ui/design.md)(`BoardSurface` 共享层来源)、
> [web-board-alignment/design.md](../web-board-alignment/design.md)(web==桌面 对齐)、
> [doc-kanban-unification/](../doc-kanban-unification/)(看板统一 v2 / PR #45)。
> 包目录:`packages/board-react/`。

---

## 0. 现状(调研结论)

| 维度 | 事实 | 位置 | 对本需求的意义 |
|---|---|---|---|
| 渲染层 | 看板渲染**已是共享组件** `BoardSurface`("web == desktop") | `shared/components/board/BoardSurface.tsx` | **抽包不重写**,MVP 成本低 |
| 数据接线 | `WebBoardView`(数据接线层)读 `.board` JSON 配置 + 扫目录下卡片 `.md`(frontmatter `board:<id>`),写回走 document API | `services/jtype-web/frontend/src/pages/WebBoardView.tsx` | 新包 = `BoardSurface` + 一层**可注入**的数据接线 |
| 阻碍① | `api.ts` 是**模块级单例**,token 从 `localStorage('jtype.token')` 读 | `frontend/src/api.ts` | 必须改造为**实例化 client**(构造传 baseUrl+token);组件不得碰 localStorage/全局单例 |
| 阻碍② | 实时 WS 写死 `window.location.host`,token 也读 localStorage | `hooks/useWorkspaceSocket.ts` | 跨域嵌入会连到**宿主**的 host;需从 baseUrl 推导绝对地址 |
| 实时鉴权 | **PR #45 / a4d2a31 起,scoped `mcp` token 在 live WS/SSE 上一律 403**(不再 over-claim board-pinned 访问) | `handlers/live.rs` `validate_ws_token` | 嵌入用的 mcp token **拿不到 live 通道 → 必须轮询**(fail-visible 降级) |
| CORS | 服务端 REST 已全开 `allow_origin(Any)` | `services/jtype-web/src/lib.rs` | REST 跨域**零改动**可用 |
| token 体系 | sessions 表 scoped token;`mcp` scope 覆盖 notes+kanban;90 天;可由 OAuth 设备流铸 | `handlers/auth.rs` / `mcp/oauth.rs` | 嵌入直接复用现有 `mcp` 族;宿主可用设备流引导自助铸 token |

**关键结论:** 这是"抽包 + 加一层可注入接线",不是重写渲染。真正要解决的是三件事——**实例化 client**、**跨域实时策略**、**样式隔离**。

---

## 1. 架构

### 1.1 组件 API(`packages/board-react/src/JTypeBoard.tsx`)

```tsx
import { JTypeBoard } from 'jtype-board-react'
import 'jtype-board-react/style.css'

<JTypeBoard
  baseUrl="https://jtype.nightc.com"   // 与 client 二选一
  token={mcpToken}                      // mcp-scope token
  // 或:client={hostProxyClient}       // 注入传输层(见 §3 安全)
  workspaceId="3eec2a30-…"
  boardRef="jtype"                      // board 名;组件内部自行 resolve 到 .board 文档
  readOnly={false}
  onConnectionChange={(s) => …}         // 'live' | 'polling' | 'error'
  onCardOpen={(card) => …}              // 可选;默认内置只读卡片详情
  locale="zh"
/>
```

- **`boardRef` 自解析**(`src/resolveBoard.ts`):宿主只有 board 名,组件用 `listDocuments` 找到 `.board` 文档与卡片目录。匹配容忍 `.board` 后缀/大小写/`./` 前缀,精确路径优先于同名 basename,同名多个→ `board_ref_ambiguous`(列出候选),找不到→ `board_not_found`。**关键:board 文档在任意路径均可(如根目录 `jtype.board`),不假设 `boards/` 目录**——见 §5 验证。
- **实例化 client**(`src/client.ts`):`createJTypeClient(baseUrl, token)` 只封装看板需要的端点(listDocuments/getDocument/saveDocument/deleteDocument)。无 localStorage、无模块单例,同页可 N 实例。

### 1.2 可注入传输层(本设计最重要的一条)

组件接受 `client`(`JTypeBoardDataClient` 接口)**替代** `baseUrl+token`。宿主可把所有请求(含轮询)路由到**自己的服务端代理**,token 全程留在宿主服务端 → **jtype token 永不进浏览器**。约束:**任何代码路径都不得绕过注入的 client**(SSE 订阅、轮询、写回全走 `client.*`;SSE 用 fetch + ReadableStream reader 而非 `EventSource`,以尊重注入的 fetch)。`baseUrl+token` 与 `client` 二选一,都传/都不传 → 显式错误面板。

### 1.3 实时策略(尊重 PR #45)

live 通道有三个(`handlers/live.rs`):per-user WS、workspace WS、board pull-SSE `…/boards/:board_ref/events`;三者都过 `validate_ws_token`,自 a4d2a31 起 **scope≠"full" 一律 403**。故嵌入(mcp token):

1. 试一次 board SSE(fetch reader,状态码可见);
2. 401/403 → **永久、可见地降级为 30s 轮询**(`onConnectionChange('polling')` + UI 上一个 "Auto-refresh · 30s" 徽章);
3. 网络失败每 30s 重试;通道正常则显示 "Live" 并暂停轮询。
4. 轮询按 `contentHash` 差量(只重下变化的文档)。

**绝不静默假实时**——降级永远对宿主可见。

---

## 2. 对现有双端的改动(seam,行为中性)

为复用 `BoardSurface` 而非 fork,在 `shared/components/board/` 引入三个**行为中性**的 seam;桌面(`src/components/BoardView.tsx`)与 web(`WebBoardView.tsx`)omit 新 prop → 行为与改动前**逐一致**,两端 build 均绿:

| seam | 作用 | 默认(双端) |
|---|---|---|
| `readOnly?: boolean` | 只读嵌入:隐藏/禁用写入入口 | `false`(不变) |
| `onCardOpen?` | 宿主拦截卡片点击 | 走内置 `setSelectedId`(不变) |
| `portalClassName?: string` + `peekComponent` 注入槽 | 见 §4;把卡片 peek 变成注入槽,让其 markdown/katex 依赖链**不进嵌入包** | omit(不变) |

---

## 3. 安全

- **裸 mcp token 放宿主页 = 该用户全部 notes+kanban 的读写权、90 天**(jtype 的 token 是**账号级**凭据,非板级 scoped)。自部署、宿主可信场景可接受;文档必须明示。
- **推荐姿势**(jcode Cloud 将采用):§1.2 的 `client` 注入 → 宿主服务端代理持加密 token 转发,浏览器无 jtype token。与 jcode Cloud D28"明文不过浏览器"的安全线一致。
- token 永不进日志/错误信息;直连模式 SSE 的 `?token=` query 与 jtype 自家 web 端同法(README 标注),注入模式规避之。
- **P2**:板级窄权 embed token(新 scope `board:<ws>/<ref>`,短 TTL,由 mcp token 经 token-exchange 铸)。

---

## 4. 样式隔离

- **不引入 Tailwind preflight**(全局 reset 会重绘宿主);包自带最小 reset。
- `scripts/scope-css.mjs` 在 build 后把 `dist/style.css` 每条规则重写为 `:where(.jtb-scope) S` + 自匹配臂(元素自身带 `.jtb-scope` 时也命中)。
- **绝不 scope by `[data-headlessui-portal]`**:该属性是 Headless UI **库级全局**属性,若用它当 scope 根,会连宿主 app 自己的 portal 一起重绘(剥边框/按钮底色/margin)。改为把 scope 类**穿透到我们每个 portal 面板**本身(`BoardSurface` 的 `portalClassName`,嵌入传 `"jtb-scope"`)。→ 宿主若也用 Headless UI v2,其 portal **完全不受影响**。
- 两条 build 守卫:输出里出现 `data-headlessui-portal` 或 `伪元素:where` 模式(minifier 会把 `::before`→`:before`,在旧式单冒号伪元素后拼 `:where()` 会生成非法选择器)→ **build 失败**。
- 主题走 `.jtb-scope` 上的 CSS 变量(`--color-brand*` 等)。

---

## 5. 构建与分发

- vite lib mode:ESM + 自包含 d.ts + scoped `style.css`;~68KB gzip(不含 react;无 katex/marked/mermaid/localStorage/`require(`)。
- peerDeps `react: ^18.2 || ^19`(消费方 jcode Cloud 是 18.3,jtype web 是 19)。
- **git 直装**:提交 `dist/`(`packages/board-react/.gitignore` 反选根 dist 忽略),消费方无需构建工具链即可装。维护规则:改源码后 `npm run build` 并连 dist 一起提交(dist 确定性,与全新 build 字节一致)。
  ```
  pnpm add "git+https://github.com/cnjack/jtype.git#<branch>&path:/packages/board-react"
  ```
  (npm 不支持 git 子目录,需 pnpm;jcode Cloud console 本就用 pnpm。)
- 测试:`tests/unit/boardReact*.spec.ts`(client token 注入/无 localStorage/错误映射、boardRef 解析、readOnly 视图保留)。

### MVP 范围
含:列+卡片渲染、拖拽移列/排序(frontmatter `status`/`position` 写回)、卡片增删、Board/Table/Calendar+泳道视图、搜索/过滤/排序、只读卡片详情、本地化 chrome。
**未含**(后置 flag):成员/指派、版本/活动、ticket 徽章(client 无 ticket-index 端点)、评论、附件上传、markdown 渲染的卡片正文(正文暂为纯文本——markdown 链刻意排除以控包体)。

---

## 6. 验证(2026-07-11)

- **分发链**:全新一次性 React 18 app,`pnpm add git+…&path:/packages/board-react` → 装成 `jtype-board-react@0.1.0`(dist 齐全)→ `tsc` 类型检查过 → 消费端 `vite build` 过。
- **真环境活体**:该 app 用设备流铸的 mcp token 指向 `https://jtype.nightc.com` 的 `jtype.board`(**根目录**,workspace `Jtype Vaullt`)——渲染出 11 张真卡片、三列(To do 9 / Doing 0 / Done 2),连接徽章 `polling`(mcp token SSE 被 403 → 可见降级),顶部宿主 header 未被样式污染。`resolveBoard` 正确解析**根目录 board**(对比:jcode Cloud 侧 `GetBoard` 死找 `boards/<ref>.board`,解析不了同款布局,是其看板 link 建不出的根因)。
- **样式隔离**:静态证明 `dist/style.css` 每条规则都锁在自家 `.jtb-scope`/`.jtb-root`(宿主元素无此类→零匹配);代理另用 example app + 宿主自带 Headless UI 下拉做过活体对照(宿主 portal 保原生样式)。
- **回归**:桌面 + web 前端 build 均绿(seam 中性);board-react 单测全绿;dist 确定性。

---

## 7. 被否

- **动态注册 OAuth 客户端 / 存 `client_id`**:jtype device grant 完全忽略 `client_id`,嵌入也无此需要,纯无用复杂度。
- **给浏览器直塞长效 mcp token 由前端轮询**(不提供 client 注入):把账号级明文 token 暴露给宿主域所有脚本,抹掉本设计核心安全收益。
- **scope by `[data-headlessui-portal]`**:见 §4,会污染宿主自己的 portal。
- **fork `BoardSurface`**:重复实现持续漂移;改用行为中性 seam 复用。
- **把 markdown/成员/版本等重功能纳入 MVP**:拖高包体与依赖面;flag 后置。
