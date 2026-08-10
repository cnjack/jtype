当你[连接好一个助手](/help/c/ai-mcp/connect-your-ai)后，它能看到哪些工具取决于连接的 endpoint：笔记 endpoint 只开放笔记工具；从看板设置生成的 board-scoped endpoint 则只开放当前看板的 **17 个工具**。每一次写入都遵循你在云端工作区中的角色权限。

## 笔记类工具

| 工具 | 读取还是写入 | 作用 |
|---|---|---|
| `list_workspaces` | 读取 | 列出你能访问的云端工作区。 |
| `list_notes` | 读取 | 列出某工作区中的笔记，可选限定某个文件夹。 |
| `get_note` | 读取 | 按路径返回某条笔记的 Markdown。 |
| `search_notes` | 读取 | 在标题、路径和内容中按查询搜索。 |
| `create_note` | 写入 | 在指定路径创建一条新笔记。 |
| `update_note` | 写入 | 替换某条笔记的内容。 |
| `append_note` | 写入 | 在某条笔记末尾追加内容。 |
| `list_members` | 读取 | 列出云端工作区成员。 |

读取类工具返回纯 Markdown，因此助手看到的笔记与磁盘上的内容完全一致。

## 单看板 MCP 工具

| 工具 | 读取还是写入 | 作用 |
|---|---|---|
| `get_board` | 读取 | 返回当前固定看板及其卡片。 |
| `list_cards` | 读取 | 列出某看板上的卡片，可选限定某一列。 |
| `get_card` | 读取 | 按 `documentId` 读取一张卡片。 |
| `create_card` | 写入 | 创建带工作流、排期、标签、附件与关系的卡片，并返回稳定 `documentId`。 |
| `update_card` | 写入 | 按 `documentId` 修改卡片 Markdown 与项目字段。 |
| `move_card` | 写入 | 将卡片移动到另一列或另一个位置。 |
| `delete_card` | 写入 | 把卡片的 Markdown 文档移入可恢复的回收站。 |
| `set_card_labels` | 写入 | 替换、添加或移除标签。 |
| `add_card_attachment` | 写入 | 添加安全的 HTTPS 或仓库相对附件引用。 |
| `remove_card_attachment` | 写入 | 移除一条完全匹配的附件引用。 |
| `set_card_relations` | 写入 | 校验看板边界后，替换父卡、阻塞、被阻塞或关联卡片链接。 |
| `bulk_update_cards` | 写入 | 最多应用 100 个独立卡片补丁，并返回逐项回执。 |
| `list_statuses` | 读取 | 列出有序状态与完成状态。 |
| `set_board_statuses` | 写入 | 替换状态、可选指定完成状态，并通过明确 fallback 安全迁移卡片。 |
| `list_card_comments` | 读取 | 列出卡片的评论话题。 |
| `comment_card` | 写入 | 给卡片添加评论或回复。 |
| `resolve_card_comment` | 写入 | 解决或重新打开评论话题。 |

endpoint URL 与 token 会同时固定到一个看板。工具 schema 中没有可覆盖的 workspace、board、path 或乐观锁 hash 参数。`create_card` 创建成功后会直接返回 `documentId`，后续卡片内容操作都使用这个 ID。批量与状态替换刻意不是原子事务，助手必须检查逐项迁移回执。

## AI 永远做不到的事

看板设置生成的 token **只限一个看板**，也只能用于该看板固定的 MCP endpoint，不能改去访问其他看板或普通 REST API。**管理类操作从不开放给 AI 令牌。** 这意味着助手无法：

- 添加或移除工作区成员，也无法更改任何人的角色；
- 删除工作区或更改其设置；
- 铸造或吊销令牌，也无法触碰账单。

写入同样遵循你本人的角色。如果你对某工作区只有只读权限，助手也只能读取——接入 AI 绝不会赋予超出你已有权限的能力。参见[成员与角色](/help/c/sync-workspaces/members-and-roles)。

## 示例指令

一切都用自然语言来驱动。可以试试这几条：

> “在我的笔记里搜索任何关于 onboarding 的内容，然后创建一条笔记 `meetings/2026-06-14-standup.md`，总结其中的待解问题。”

> “看一下我的 Launch 看板，把所有已完成的卡片从进行中移出去，并在待办列里创建一张高优先级卡片‘撰写发布说明’。”

由助手决定调用哪些工具；而写入什么始终由你掌控。由于笔记就是你仓库里的纯 Markdown，它创建的任何内容都会像其他笔记一样同步和发布——参见[仓库的工作方式](/help/c/vault-editing/how-vaults-work)与[看板与卡片](/help/c/kanban/boards-and-cards)。

## 接下来去哪儿

- [把你的 AI 连接到 JType](/help/c/ai-mcp/connect-your-ai)——各客户端的配置。
- [OAuth 与受限令牌](/help/c/ai-mcp/oauth-vs-token)——权限如何授予与吊销。
