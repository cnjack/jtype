// The top-of-page category landings (the tabs across the help center).
// `icon` is a heroicon name resolved by `../components/icons.ts`.

import type { CategoryMeta } from './types'

export const categories: CategoryMeta[] = [
  {
    id: 'getting-started',
    icon: 'RocketLaunch',
    accent: '#008884',
    order: 1,
    videoId: 'intro',
    title: { en: 'Getting started', zh: '快速上手' },
    summary: {
      en: 'Install JType, open your first vault, and learn the local-first flow end to end.',
      zh: '安装 JType、打开第一个仓库，完整了解“本地优先”的工作流。',
    },
  },
  {
    id: 'vault-editing',
    icon: 'FolderOpen',
    accent: '#0ea5a2',
    order: 2,
    videoId: 'vault',
    title: { en: 'Vault & editing', zh: '仓库与编辑' },
    summary: {
      en: 'How vaults work, writing Markdown, frontmatter, preview/split, quick open, and links.',
      zh: '仓库的工作方式、编写 Markdown、frontmatter、预览/分屏、快速打开与链接。',
    },
  },
  {
    id: 'sync-workspaces',
    icon: 'CloudArrowUp',
    accent: '#0891b2',
    order: 3,
    videoId: 'sync',
    title: { en: 'Sync & workspaces', zh: '同步与工作区' },
    summary: {
      en: 'Cloud workspaces, binding a vault, push/pull, resolving conflicts, members and roles.',
      zh: '云端工作区、绑定仓库、推送/拉取、冲突解决，以及成员与角色。',
    },
  },
  {
    id: 'kanban',
    icon: 'ViewColumns',
    accent: '#f59e0b',
    order: 4,
    videoId: 'kanban',
    title: { en: 'Kanban', zh: '看板' },
    summary: {
      en: 'Turn a workspace into boards: columns, cards, priorities, the web view, and event-driven automation.',
      zh: '把工作区变成看板：列、卡片、优先级、网页视图，以及事件驱动的自动化。',
    },
  },
  {
    id: 'publishing',
    icon: 'GlobeAlt',
    accent: '#10b981',
    order: 5,
    videoId: 'publish',
    title: { en: 'Publishing', zh: '发布' },
    summary: {
      en: 'Publish selected notes to a clean read-only site at /u/:username, with custom domains.',
      zh: '将选定的笔记发布为 /u/:username 上简洁的只读站点，并支持自定义域名。',
    },
  },
  {
    id: 'ai-mcp',
    icon: 'Sparkles',
    accent: '#6366f1',
    order: 6,
    videoId: 'ai',
    title: { en: 'AI & MCP', zh: 'AI 与 MCP' },
    summary: {
      en: 'Connect Claude, Cursor, or any MCP client to read and update your notes and boards.',
      zh: '把 Claude、Cursor 或任意 MCP 客户端接入，读取并更新你的笔记与看板。',
    },
  },
  {
    id: 'cli',
    icon: 'CommandLine',
    accent: '#334155',
    order: 7,
    videoId: 'cli',
    title: { en: 'Command line', zh: '命令行' },
    summary: {
      en: 'The jtype CLI: log in, capture notes over your current folder, bind, and sync.',
      zh: 'jtype 命令行：登录、在当前目录捕获笔记、绑定与同步。',
    },
  },
]

export function getCategory(id: string | undefined): CategoryMeta | undefined {
  return categories.find((c) => c.id === id)
}

export const categoriesByOrder = [...categories].sort((a, b) => a.order - b.order)
