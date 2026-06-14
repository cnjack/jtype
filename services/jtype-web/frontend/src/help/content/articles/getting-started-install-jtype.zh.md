把 JType 装到你的电脑上大约只需一分钟。下载桌面应用、打开它，你就能开始写作了——无需账号。可选的 `jtype` 命令行和云端登录会在你需要时出现，而不会提前打扰。

## 安装桌面应用

从[**最新发布页**](https://github.com/cnjack/jtype/releases/latest)下载与你操作系统对应的安装包：

| 操作系统 | 下载文件 |
|---|---|
| macOS（Apple 芯片——M1 及更新） | `JType_*_aarch64.dmg` |
| macOS（Intel） | `JType_*_x64.dmg` |
| Windows（64 位） | `JType_*_x64-setup.exe` |

- **macOS：** 打开 `.dmg`，把 **JType** 拖进“应用程序”文件夹，然后启动它。
- **Windows：** 运行 `x64-setup.exe` 安装程序，按提示完成安装。

不确定自己用的是哪种 Mac？点击苹果菜单，选择**关于本机**——显示“Apple M 系列芯片”就用 `aarch64` 版本，显示“Intel”就用 `x64` 版本。

## 首次启动：欢迎界面

第一次打开 JType 时，你看到的是一个**欢迎界面**，而不是空白编辑器。在这里你可以：

- **使用默认仓库**——JType 会在 `~/Documents/.jtype` 创建并打开一个文件夹。这是最快的上手方式。
- **打开仓库**——让 JType 指向任意一个已有的 Markdown 文件夹。
- **打开 Markdown 文件**——在专注编辑器中打开单个 `.md` 文件。
- **最近项目**——直接回到此前打开过的仓库或文件。

写作**不需要**登录。你创建的一切都以纯 `.md` 文件的形式留在你的硬盘上。基于浏览器的 OAuth 登录是**可选的**，只有当你之后要用同步、共享、看板、发布等云端功能时才需要。

想先弄清这些概念？请阅读 [JType 的工作方式](/help/c/getting-started/the-jtype-flow)。否则，直接前往[打开第一个仓库](/help/c/getting-started/your-first-vault)。

## 安装命令行（可选）

`jtype` 命令行工具让你能在终端里读写仓库、同步并管理看板。它是可选的——只有常驻命令行时才需要安装。挑一个最方便的方式：

- **在桌面应用中：** 设置 → **工具 → 命令行** → **将 jtype 安装到 PATH**。
- **macOS / Linux：**
  ```sh
  curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh
  ```
- **Windows（PowerShell）：**
  ```powershell
  irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex
  ```
- **从源码构建（需要 Rust）：**
  ```sh
  cargo install --path services/jtype-cli
  ```

验证是否安装成功：

```sh
jtype whoami
```

完整的命令行设置与登录步骤，参见[安装命令行并登录](/help/c/cli/install-and-login)。

## 接下来

- [打开第一个仓库](/help/c/getting-started/your-first-vault)——新建一条笔记，试试写作 / 分栏 / 预览。
- [接入你的 AI](/help/c/ai-mcp/connect-your-ai)——让助手读取并更新你的笔记。
