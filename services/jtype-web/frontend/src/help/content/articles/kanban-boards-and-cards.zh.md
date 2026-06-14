JType 的看板存在于**云端工作区**中。当你的仓库绑定到某个工作区后，这个工作区就能在笔记旁边承载**看板**——一种用来追踪工作的可视化泳道。一个看板由若干**列**组成，每一列里放着若干**卡片**。整个模型就这么简单。

如果你还没有连接工作区，请先阅读[云端工作区与绑定](/help/c/sync-workspaces/cloud-workspaces)。下文都假设你已经有了一个工作区。

## 看板与列

一个**看板**属于某一个工作区，用来归类相关的工作——路线图、迭代、内容日历等等。每个新建的看板都自带三列：**To do**、**Doing** 和 **Done**。列其实就是命名好的泳道；你可以重命名、改颜色、调整顺序，还能给它设一个可选的 WIP（在制品）上限作为温和提示。这个上限仅供参考——JType 永远不会因此阻止你再加一张卡片。

在终端里查看某个工作区中的看板：

```bash
jtype board list
jtype board get roadmap   # 某个看板的列与卡片
```

## 卡片：优先级与负责人

一张**卡片**代表一个工作单元。除了标题之外，卡片还可以携带：

- **描述**（Markdown），
- **优先级**——取值为 `none`、`low`、`medium`、`high` 或 `urgent` 之一，
- **负责人**，必须是该工作区的成员，
- **截止日期**，以及带颜色的**标签**。

用 CLI 创建并移动卡片：

```bash
# 在 “Doing” 列添加一张高优先级卡片
jtype card create --board roadmap --column Doing "完成导出对话框" \
  --priority high --assignee jack --description "把弹窗接到 API"

# 列出某一列里的卡片
jtype card list --board roadmap --column Doing

# 把它移到 Done，并放到该列最上方
jtype card move --board roadmap card_8f3a --to-column Done --position 0
```

不移动卡片、只就地更新字段：

```bash
jtype card update card_8f3a --priority urgent --assignee maya
```

有两条规则值得记住：负责人必须是该工作区的活跃成员（否则命令会被拒绝）；`priority` 只接受上面列出的五个取值。把卡片移入某一列后，列内顺序会被自动压实，因此位置始终保持整洁。

## 卡片与笔记的关系

这一点常被忽略：**卡片并不是一行你再也碰不到的数据库记录。** 在 JType 的统一模型里，卡片*就是*你仓库里的一篇 Markdown 笔记。它的看板字段——属于哪个看板、在哪一列、优先级、负责人——存放在笔记的 frontmatter 中，而正文就是卡片的描述：

```markdown
---
board: roadmap
status: doing
priority: high
assignee: jack
---
# 完成导出对话框

把弹窗接到 API，并加上进度条。
```

所以卡片会出现在文件树、搜索结果和回收站里——因为它本来就是一篇笔记。在看板上拖动它，其实是在改写这篇笔记的 frontmatter；在编辑器里编辑这篇笔记，卡片也会随之更新。看板是对那些标注了它的笔记的一个**视图**。

## 下一步

- 在浏览器里查看你的看板：[网页看板视图](/help/c/kanban/web-board-view)。
- 让 AI 助手来驱动看板：[AI 能做什么](/help/c/ai-mcp/what-ai-can-do)。
- 第一次用 CLI？从[安装与登录](/help/c/cli/install-and-login)开始。
