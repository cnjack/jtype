你的看板不必只活在 JType 里。用 `jtype-board-react` 这个包，你可以把一块**实时、可交互**的看板直接嵌进自己的网站或应用——列、卡片、拖拽移动一应俱全，读写的正是与 JType 网页端、桌面端看板**同一份数据**。如果你只是想*使用*看板，请看[网页看板视图](/help/c/kanban/web-board-view)；本文讲的是把看板放进**另一个产品**里。

## 你需要什么

- 某个工作区里的一块**看板**（见[看板与卡片](/help/c/kanban/boards-and-cards)）。
- 它的 **workspace id** 和 **board 名**——workspace id 就是打开工作区时地址栏 `…/workspaces/<id>` 里的那段;board 名就是看板文件去掉 `.board` 后缀的名字（例如文件 `roadmap.board` 的名字是 `roadmap`）。
- 一个能访问文档 REST API 的**用户/session token**，或者一个代理同一套 API 的 `client`。从**看板设置 → MCP access**生成的单看板 token 只能用于 MCP；传给本包使用的 REST 与实时端点会返回 `403`。生产环境应把 session token 留在服务端，通过 `client` 接入（见下方“保护好你的令牌”）。

## 加进一个 React 应用

看板以普通 npm 包发布，peer 依赖 React 18 或 19：

```bash
npm install jtype-board-react
```

```tsx
import { JTypeBoard } from 'jtype-board-react'
import 'jtype-board-react/style.css'

export function MyBoard() {
  return (
    <JTypeBoard
      baseUrl="https://jtype.nightc.com"
      token={yourSessionToken}
      workspaceId="3eec2a30-…"
      boardRef="roadmap"
    />
  )
}
```

配置到此为止。看板会根据这个名字解析出它的列和卡片、渲染出来，并把卡片的移动**写回**你的工作区——所以你在自己应用里拖动的卡片会在 JType 里一起移动，你在 JType 里做的改动也会出现在嵌入的看板上。样式表是自包含且**受限作用域**的：它不会重绘你页面的其余部分，你的页面也不会重绘看板。

## 实时更新 vs 自动刷新

如果看板能建立实时连接，队友一移动卡片它就即时更新。实时连接不可用时，看板会退化为**每 30 秒自动刷新**，并在角落显示“自动刷新”徽章——它绝不会在并非实时的时候假装实时。你可以用 `onConnectionChange` 观察 `'live'`、`'polling'` 或 `'error'` 状态。单看板 MCP token 连首次 REST 快照都无权读取；轮询不是绕过授权的方式。

## 保护好你的令牌

完整 session token 是一份**账号级凭据**：只要它有效，持有者就能调用该用户有权访问的文档 API。只有可信、自托管的内部工具才适合把它放进页面 JavaScript；面向公开访问时，**不要把 token 下发到浏览器**。请给组件传入一个 `client`，让请求经过你自己的服务端并在服务端限制 workspace/board 边界。这样浏览器不会接触 JType token。（包 README 也说明了 `createOnly` 等完整 client 合同。）

## 值得一提

- **只读嵌入**：设置 `readOnly` 即可展示一块没有任何编辑/拖拽入口的看板。
- **当前能渲染什么**：可选择的纵向泳道（状态、优先级、负责人或自定义）、Board/Table/Calendar/Backlog/Gantt 投影、拖拽移动/排序、多选与批量编辑、搜索/排序/筛选，以及可编辑或只读的卡片详情。内置 client 不提供成员、评论、服务端 Activity、上传与 ticket 徽章。
- **个人工作**：传入 `currentUser` 即可启用 **My Work** 与由卡片推导的 **Inbox** 信号。
- **撤销访问**：因为嵌入用的是一枚普通令牌，你随时可以在令牌列表里吊销它——嵌入的看板会随即停止加载并显示错误态，绝不会展示过时数据。
