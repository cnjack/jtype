一支六人的工程团队在赶产品发布时，本不该靠五个工具才把一条主线理清。可这支团队偏偏如此：会议纪要在聊天软件里，路线图在 wiki 里，工单在任务系统里，而真正的发布清单只装在某个人的脑子里。每次站会的开场白都是“等等，那条笔记在哪儿来着？”——他们想让 AI 助手接手这摊活儿，却没有一个统一的入口可指。

于是他们把这一切搬进了**同一个 JType 工作区**。笔记是每位工程师本机仓库里的纯 Markdown；发布看板就在同一个云端工作区里；AI 助手则通过 MCP 同时触达二者。下面看看它们是如何串起来的。

## 现状与痛点

问题不在某一个工具，而在工具之间的接缝。路线图说一套，站会纪要说另一套，看板又和两者都对不上。没人能轻松回答一个简单的问题——“关于 MCP 服务器我们到底定了什么，有没有对应的卡片？”——除非同时打开三个应用。

解决办法，是让笔记成为唯一可信来源，并把看板放在它旁边。本地优先的 Markdown 意味着每位工程师都真正拥有一个文件夹；把这个文件夹绑定到共享的云端工作区，团队——以及 AI——看到的就是同一份内容。

## 仓库结构

示例仓库就随仓库代码发布，位于 `examples/eng-team-vault`，你可以直接在 JType 里打开跟着操作。它就是一个工程师真会写出来的普通 Markdown 文件夹：

```text
eng-team-vault/
├── README.md                       # 仓库说明 + Launch 看板
├── roadmap.md                      # Q3 路线图（publish: false）
├── meetings/
│   ├── 2026-06-10-standup.md
│   └── 2026-06-14-ai-kickoff.md    # AI 创建的那条笔记
├── daily/
│   └── 2026-06-14.md
└── projects/
    └── launch.md                   # 发布计划，与看板对应
```

这里没有任何专有格式。用任何编辑器打开它依然清晰可读——这正是仓库的意义。

## Launch 看板

同一个云端工作区里有一块名为 **Launch** 的看板，包含三列——**To do**、**Doing**、**Done**。看板是工作*流动*的地方；笔记是工作*被决定*的地方。`projects/launch.md` 保留了一份人类可读的看板镜像，即使离线，整份计划也能从头读到尾。

团队里任何人都能从网页视图、桌面应用或 CLI 来操作看板：

```bash
jtype board list
jtype card list --board Launch --column "To do"
jtype card create --board Launch --column "To do" "Draft launch plan" --priority high
```

## 通过 MCP 的 AI 梳理流程

正是这一步，让团队不再害怕周一。他们通过 MCP 把 AI 助手接入工作区（从控制台走 OAuth 授权，不含管理员权限），然后请它来做那些枯燥的衔接工作：读路线图、写好启动会纪要、给看板铺好底子。

助手先确定自己所处的位置，再去搜索笔记——它从不凭空猜测路径：

```text
list_workspaces({})
search_notes({ "query": "product roadmap", "workspace_id": "…" })
```

拿到路线图后，它把会议纪要作为一条真实笔记写进仓库，链接回 `roadmap.md`，并点名引用了它提取出的 Q3 事项：

```text
create_note({
  "path": "meetings/2026-06-14-ai-kickoff.md",
  "title": "AI Kickoff Meeting — 2026-06-14",
  "workspace_id": "…"
})
```

接着它给看板铺底，让这个决定在工作流里有了归属——在第一列放进一张高优先级卡片：

```text
create_card({
  "board_id": "…",
  "column_id": "…",        // “To do” 列
  "title": "Draft launch plan",
  "priority": "high"
})
```

由于 AI 的令牌是 **mcp 作用域**——只能访问笔记和看板，永不触及管理员能力——它可以起草和梳理，却动不了成员、计费或设置。每次写入都遵守工作区角色权限，团队也可随时在 AI 连接页面或用 `jtype token revoke` 撤销这个连接。

## 成效

如今站会从一条笔记开始，而不是一场寻宝。AI 起草的启动会纪要直接链向路线图；它创建的“Draft launch plan”卡片，在团队打开看板时已经稳稳躺在 **To do** 列里。工程师在本地编辑 Markdown，用 `jtype sync` 推送到共享工作区，AI 则在会议之间帮看板保持如实。

这个支撑团队的仓库，日后只需给某条笔记加上 `publish: true`，就能发布一个发布页——不过那是另一个故事了。眼下：一个工作区、真实的文件，以及一个替你打通各处衔接的助手。

## 自己试一试

- 在 JType 中打开示例仓库 `examples/eng-team-vault`。
- 接入 AI 助手：[连接你的 AI](/help/c/ai-mcp/connect-your-ai) 与 [AI 能做什么](/help/c/ai-mcp/what-ai-can-do)。
- 从终端操作看板：[笔记、绑定与同步](/help/c/cli/notes-bind-sync) 与 [看板与卡片](/help/c/kanban/boards-and-cards)。
