`jtype` 命令行把你的仓库带到终端里。无论你身处哪个文件夹，它都读写其中的纯 Markdown 文件；登录之后，它还能把这些文件同步到云端工作区、操作看板，并为 AI 工具签发令牌。

它和桌面应用是同一款产品，只是以键盘为先：非常适合在命令执行间隙随手记一条笔记、编写脚本，或把其他工具的输出直接管道进你的笔记。

## 安装（任选一种）

**从桌面应用安装——最省事。** 打开 **设置 → 工具 → 命令行**，点击 **将 jtype 安装到 PATH**。应用会为你的操作系统下载对应的二进制文件并加入 PATH，无需其他配置。

**macOS / Linux——一行命令：**

```sh
curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh
```

**Windows——PowerShell：**

```powershell
irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex
```

**从源码安装——如果你装了 Rust：**

```sh
cargo install --path services/jtype-cli
```

查看版本，确认安装成功：

```sh
jtype --version
```

如果提示找不到命令，请新开一个终端窗口，让更新后的 PATH 生效。

## 登录

笔记命令可以离线使用、无需账户——这正是本地优先的意义所在。只有当你想用云端功能时才需要登录：同步、看板、令牌或 MCP 桥接。

登录基于浏览器。命令行从不索取你的密码——它发起一个设备授权流程，由你在浏览器中批准：

```sh
jtype login
```

你会看到类似这样的输出：

```text
To authorize the jtype CLI:
  1. Open:          http://localhost:13345/device
  2. Approve code:  WDJF-QXMP

Waiting for approval…
```

打开那个网址，确认验证码一致后批准。命令行会保存你的会话并打印一个对勾。批准用的验证码只能使用一次，且 10 分钟后过期，所以请尽快完成。

## 确认已登录

```sh
jtype whoami
```

它会打印你的账户，例如 `ada (user)`。要在本机退出登录：

```sh
jtype logout
```

## 指向其他服务器

命令行默认连接 `http://localhost:13345`。要使用托管版 JType，在任意命令后加 `--server`（绑定仓库后也会按仓库记住）：

```sh
jtype --server https://notes.example.com login
```

## 接下来去哪儿

- 前往[在命令行中记录、绑定与同步笔记](/help/c/cli/notes-bind-sync)开始捕捉和同步笔记。
- 不熟悉整体模型？阅读 [JType 的工作方式](/help/c/getting-started/the-jtype-flow)。
- 要接入 AI 助手？参见[连接你的 AI](/help/c/ai-mcp/connect-your-ai)——`jtype token create` 和 `jtype mcp-stdio` 就在那里。
