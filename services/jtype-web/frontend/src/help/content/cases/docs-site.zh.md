三个人维护着一款小型开发者工具 **Tideline**，他们的产品文档一直放在一个没人喜欢的 wiki 里。改一处得开浏览器，导出又被锁死，连"这一页到底上线了没有"都得点来点去才说得清。他们希望文档就是一份份*文件*——可评审、可 grep、归自己所有——同时这些文件还能变成一个真正的网站，挂在自己的域名上。JType 让这件事变得理所当然：文字和网页之间，只隔着一行 frontmatter。

## 背景与问题

这份文档篇幅不大却改得勤：一篇简介、一份上手指南、一个 FAQ，再加一份更新日志。大多数页面要公开，但少数草稿和内部运维手册必须保密。旧的 wiki 把每一页都一视同仁,所谓"私密"不过是"但愿别人猜不到链接"。

团队想要的是：

- 用纯 Markdown 写文档，沿用平时的编辑器和评审流程。
- 逐页、明确地决定哪些公开——而不是一不小心就泄露。
- 不跑静态站点生成器、不搭构建流水线，就能得到一个干净的只读站点。
- 把它挂到自己的域名 `docs.tideline.dev` 上。

## 仓库结构

文档都放在同一个仓库文件夹里。这个文件夹*就是*真相之源——用 JType 打开、在终端里打开、或用任意编辑器打开都行。JType 在仓库的 `examples/team-docs-site-vault/` 下附带了这个示例仓库，你可以直接打开跟着做。

```text
team-docs-site-vault/
├── README.md            # 说明这个仓库怎么组织（不发布）
├── index.md             # 站点首页 —— publish: true
├── changelog.md         # 更新日志 —— publish: true
├── docs/
│   ├── getting-started.md   # publish: true
│   └── faq.md               # publish: true
└── drafts/
    └── internal-notes.md    # publish: false —— 保持私密
```

发布是逐文件主动开启的。只有当一篇笔记的 YAML frontmatter 明确声明时，它才会公开：

```md
---
title: Getting started
publish: true
---

# Getting started with Tideline

Install the CLI and run your first pipeline in under five minutes...
```

草稿则相反，永远不会离开团队的机器或工作区：

```md
---
title: Internal runbook
publish: false
---
```

## JType 的工作流

**1. 在仓库里写。** 团队在 JType 桌面端用纯 Markdown 写作——写作、分屏或预览模式都行——和写私人笔记没有任何区别。一篇页面最终要上网，并不会改变写作方式。

**2. 把仓库绑定到云端工作区。** 发布和同步、成员一样，都归云端工作区管。在文档文件夹里绑定一次即可：

```bash
cd team-docs-site-vault
jtype bind --workspace tideline-docs
jtype vault status      # 显示仓库根目录 + 云端绑定
```

**3. 标记要公开的页面。** 给每一个要上线的页面在 frontmatter 里加上 `publish: true`。桌面端的发布检查会标出已经就绪的页面，而 `drafts/` 下那篇始终保持 `publish: false`——所以哪怕分享了链接，结构上也不可能泄露出去。

**4. 推送，站点即上线。** 同步会写回到工作区，已发布的页面会渲染成一个只读站点：

```bash
jtype sync          # 与绑定的工作区进行拉取 + 推送
```

站点出现在 `/u/:username`，每个页面位于 `/u/:username/:page_path`——于是 `index.md` 就是首页，`docs/getting-started.md` 变成 `/u/tideline/docs/getting-started`。整个过程中源文件始终是仓库里的 Markdown；站点只是你选中要发布的那些文件的一次干净渲染。

**5. 挂上自定义域名。** 团队在网页控制台里添加 `docs.tideline.dev`，按它给出的 DNS 记录配置好，同一个站点就能从自己的域名访问了。不用重新部署，也不用重新构建。

## 成果

如今 Tideline 的文档就是一个 Markdown 文件夹，两个人可以走平常的 Pull Request 流程评审，而公开站点在他们 `jtype sync` 的那一刻就更新。发布是一个刻意、可见的选择——就一行 frontmatter——所以草稿和运维手册天然保持私密。后来他们想让 AI 帮忙把更新日志整理利落时，这些笔记早已能通过 MCP 访问，无需任何新的导出。

整件事都可以复现：在 JType 里打开 `examples/team-docs-site-vault/`，把它绑定到你自己的工作区，几分钟就能得到一个可发布的文档站点。

## 下一步去哪儿

- [发布站点](/help/c/publishing/publish-a-site) —— 完整的发布检查流程。
- [自定义域名](/help/c/publishing/custom-domains) —— 把自己的域名指向站点。
- [用 CLI 管理笔记、绑定与同步](/help/c/cli/notes-bind-sync) —— 上面用到的命令。
- [云端工作区与绑定](/help/c/sync-workspaces/cloud-workspaces) —— 发布所归属的地方。
