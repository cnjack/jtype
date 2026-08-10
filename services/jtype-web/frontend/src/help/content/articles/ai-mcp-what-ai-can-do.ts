import type { ArticleMeta } from '../types'
import en from './ai-mcp-what-ai-can-do.en.md?raw'
import zh from './ai-mcp-what-ai-can-do.zh.md?raw'

const article: ArticleMeta = {
  id: 'what-ai-can-do',
  categoryId: 'ai-mcp',
  order: 2,
  updated: '2026-08-11',
  title: {
    en: 'What your AI can do',
    zh: '你的 AI 能做什么',
  },
  summary: {
    en: 'Note tools and 17 board-scoped MCP tools for lifecycle, labels, files, relations, batch work, statuses, and comments.',
    zh: '笔记工具与 17 个单看板 MCP 工具，覆盖生命周期、标签、附件、关系、批量、状态与评论。',
  },
  body: { en, zh },
}

export default article
