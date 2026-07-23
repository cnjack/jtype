import type { ArticleMeta } from '../types'
import en from './ai-mcp-what-ai-can-do.en.md?raw'
import zh from './ai-mcp-what-ai-can-do.zh.md?raw'

const article: ArticleMeta = {
  id: 'what-ai-can-do',
  categoryId: 'ai-mcp',
  order: 2,
  updated: '2026-07-23',
  title: {
    en: 'What your AI can do',
    zh: '你的 AI 能做什么',
  },
  summary: {
    en: 'Note tools and the nine board-scoped MCP tools, including stable document IDs and the enforced board boundary.',
    zh: '笔记工具与 9 个单看板 MCP 工具，包括稳定 document ID 与服务端强制的看板边界。',
  },
  body: { en, zh },
}

export default article
