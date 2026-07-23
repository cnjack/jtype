import type { ArticleMeta } from '../types'
import en from './ai-mcp-connect-your-ai.en.md?raw'
import zh from './ai-mcp-connect-your-ai.zh.md?raw'

const article: ArticleMeta = {
  id: 'connect-your-ai',
  categoryId: 'ai-mcp',
  order: 1,
  updated: '2026-07-23',
  title: {
    en: 'Connect your AI to JType',
    zh: '把你的 AI 连接到 JType',
  },
  summary: {
    en: 'Connect clients to the notes endpoint or generate a server-enforced, one-board MCP connection.',
    zh: '连接笔记 endpoint，或生成服务端强制隔离到单个看板的 MCP 连接。',
  },
  body: { en, zh },
}

export default article
