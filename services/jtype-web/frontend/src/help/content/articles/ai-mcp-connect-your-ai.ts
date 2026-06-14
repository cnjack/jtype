import type { ArticleMeta } from '../types'
import en from './ai-mcp-connect-your-ai.en.md?raw'
import zh from './ai-mcp-connect-your-ai.zh.md?raw'

const article: ArticleMeta = {
  id: 'connect-your-ai',
  categoryId: 'ai-mcp',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'Connect your AI to JType',
    zh: '把你的 AI 连接到 JType',
  },
  summary: {
    en: 'Give Claude, Cursor, Cline, or jcode access to your notes and boards through the built-in MCP server — with OAuth or a scoped token.',
    zh: '通过内置的 MCP 服务器，让 Claude、Cursor、Cline 或 jcode 访问你的笔记与看板——使用 OAuth 或受限令牌。',
  },
  body: { en, zh },
}

export default article
