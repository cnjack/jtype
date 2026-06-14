命令行的笔记命令是**本地优先**的：它们读写你当前文件夹所属仓库里的 Markdown 文件——无需服务器，也无需登录。云端是你之后用 `jtype bind` 和 `jtype sync` 才加上的，当你想把这些文件带到另一台设备或与团队共享时再说。

## 在文件所在之处工作

`cd` 进入你的仓库（任何带有 `.jtype/` 目录标记的文件夹），笔记命令就会直接作用于那里的文件：

```sh
cd ~/Documents/notes

jtype note list                       # 按路径列出每个 .md 文件
jtype note list --folder meetings     # 只看某个文件夹
jtype note get projects/launch.md     # 打印一条笔记的 Markdown
jtype note search "retro" --limit 5   # 在整个仓库中按关键字搜索
```

路径相对于仓库根目录，省略 `.md` 时会自动补上。不在仓库内？命令行会提示你 `cd` 进入一个仓库，或用全局 `--vault` 参数指定路径。

## 捕捉与编辑

创建或覆盖一条笔记有三种方式——行内文本、文件，或 stdin。这正是让终端成为快速捕捉入口的关键：

```sh
# 行内
jtype note create ideas/quick.md --content "Ship the CLI docs" --title "Quick idea"

# 从文件
jtype note create specs/api.md --file ./draft.md

# 从 stdin——把任何东西管道进来
git log --oneline -20 | jtype note create logs/recent.md -
```

`jtype note update <path>` 以同样的方式替换笔记正文，用 `--content` 或 `--file`：

```sh
jtype note update ideas/quick.md --content "Ship the CLI docs — and the AI guide"
```

一个真实的终端捕捉场景：一行命令把当前分支的提交记入当日笔记。

```sh
git log --since=yesterday --pretty="- %s" | jtype note create daily/2026-06-14.md -
```

文件会立即写入磁盘——这是权威来源。如果你已登录**且**仓库已绑定，这次写入还会一并推送到云端；否则它只在本地保存，并会如实告知你。

## 绑定到云端工作区

要同步，需把这个仓库关联到一个云端工作区。先找到它的 id 或名称，再绑定：

```sh
jtype workspace list                       # 需先 jtype login
jtype bind --workspace "Team Notes"        # id、名称或 slug 都可以
```

绑定会在文件旁写入 `.jtype/cloud.json`，记录工作区和服务器。随时查看：

```sh
jtype vault status
```

```text
vault:  /Users/ada/Documents/notes
bound:  Team Notes (4f3c…-…-…)
server: http://localhost:13345
clock:  0
```

## 同步

绑定之后，一次往返即可拉取别人的改动并推送你的：

```sh
jtype sync
```

对于命令行的编辑，同步采用“最后写入者获胜”，且只触碰真正变化的文件，因此重复运行不会产生额外影响。关于冲突处理与角色的全貌，参见[推送、拉取与同步](/help/c/sync-workspaces/push-pull-sync)和[成员与角色](/help/c/sync-workspaces/members-and-roles)。

## 接下来去哪儿

- 还没装命令行？从[安装 jtype 命令行并登录](/help/c/cli/install-and-login)开始。
- 想让 AI 读写这些同样的笔记？参见[连接你的 AI](/help/c/ai-mcp/connect-your-ai)。
- 好奇编辑器里仓库是怎么运作的？阅读[仓库的工作原理](/help/c/vault-editing/how-vaults-work)。
