你的看板不必只活在 JType 里。用 `jtype-board-react` 这个包，你可以把一块**实时、可交互**的看板直接嵌进自己的网站或应用——列、卡片、拖拽移动一应俱全，读写的正是与 JType 网页端、桌面端看板**同一份数据**。如果你只是想*使用*看板，请看[网页看板视图](/help/c/kanban/web-board-view)；本文讲的是把看板放进**另一个产品**里。

## 你需要什么

- 某个工作区里的一块**看板**（见[看板与卡片](/help/c/kanban/boards-and-cards)）。
- 它的 **workspace id** 和 **board 名**——workspace id 就是打开工作区时地址栏 `…/workspaces/<id>` 里的那段;board 名就是看板文件去掉 `.board` 后缀的名字（例如文件 `roadmap.board` 的名字是 `roadmap`）。
- 一个**令牌（token）**，好让组件能访问你的数据。任何 `mcp` scope 的令牌都可以——像给 AI 客户端铸令牌那样铸一个即可（见[把你的 AI 连接到 JType](/help/c/ai-mcp/connect-your-ai) 与 [OAuth 与受限令牌](/help/c/ai-mcp/oauth-vs-token)）。React 应用可以直接持有该令牌;若面向公开访问，**推荐把令牌留在你自己的服务端**（见下方"保护好你的令牌"）。

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
      token={yourMcpToken}
      workspaceId="3eec2a30-…"
      boardRef="roadmap"
    />
  )
}
```

配置到此为止。看板会根据这个名字解析出它的列和卡片、渲染出来，并把卡片的移动**写回**你的工作区——所以你在自己应用里拖动的卡片会在 JType 里一起移动，你在 JType 里做的改动也会出现在嵌入的看板上。样式表是自包含且**受限作用域**的：它不会重绘你页面的其余部分，你的页面也不会重绘看板。

## 实时更新 vs 自动刷新

如果看板能建立实时连接，队友一移动卡片它就即时更新。但**受限的 `mcp` 令牌无法开启实时通道**，因此看板会退化为**每 30 秒自动刷新**，并在角落显示一个小小的"自动刷新"徽章——它绝不会在并非实时的时候假装实时。你可以用 `onConnectionChange` 这个 prop 观察它当前处于哪种模式（`'live'` / `'polling'`）。

## 保护好你的令牌

`mcp` 令牌是一份**账号级凭据**：只要它有效，持有者就能读写你能访问的所有笔记与看板。把裸令牌放进页面的 JavaScript 里，对可信站点上的内部工具是可以的;但面向公开访问时，**不要把令牌下发到浏览器**。改为给组件传入一个 `client`，让它的请求经过你自己的服务端转发，令牌就留在那里——这种模式下浏览器根本看不到 JType 令牌。（你的开发者可以在包的 README 里找到 `client` prop 与完整的 prop 列表。）

## 值得一提

- **只读嵌入**：设置 `readOnly` 即可展示一块没有任何编辑/拖拽入口的看板。
- **当前能渲染什么**：可选择的纵向泳道（状态、优先级、负责人或自定义）、卡片、拖拽移动/排序、Board/Table/Calendar、多选筛选、搜索/排序，以及只读的卡片详情。卡片正文暂以纯文本显示;成员、版本、评论与 ticket 徽章尚未进入嵌入版。
- **个人筛选**：传入 `currentUser` 即可在筛选面板中启用**我的卡片**。
- **撤销访问**：因为嵌入用的是一枚普通令牌，你随时可以在令牌列表里吊销它——嵌入的看板会随即停止加载并显示错误态，绝不会展示过时数据。
