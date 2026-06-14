import type { ArticleMeta } from '../types'
import en from './ai-mcp-what-ai-can-do.en.md?raw'
import zh from './ai-mcp-what-ai-can-do.zh.md?raw'

const article: ArticleMeta = {
  id: 'what-ai-can-do',
  categoryId: 'ai-mcp',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'What your AI can do',
    zh: '你的 AI 能做什么',
  },
  summary: {
    en: 'The 14 MCP tools for notes and kanban, which ones read versus write, and why admin is never exposed to an AI.',
    zh: '面向笔记与看板的 14 个 MCP 工具，哪些读取、哪些写入，以及为何管理权限从不开放给 AI。',
  },
  body: { en, zh },
}

export default article
