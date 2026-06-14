import type { ArticleMeta } from '../types'
import en from './ai-mcp-oauth-vs-token.en.md?raw'
import zh from './ai-mcp-oauth-vs-token.zh.md?raw'

const article: ArticleMeta = {
  id: 'oauth-vs-token',
  categoryId: 'ai-mcp',
  order: 3,
  updated: '2026-06-14',
  title: {
    en: 'OAuth vs a scoped token',
    zh: 'OAuth 与受限令牌',
  },
  summary: {
    en: 'When to let a client OAuth versus minting a scoped token, how to create and revoke one, and the security behind both.',
    zh: '何时让客户端走 OAuth、何时铸造受限令牌，如何创建与吊销，以及两者背后的安全机制。',
  },
  body: { en, zh },
}

export default article
