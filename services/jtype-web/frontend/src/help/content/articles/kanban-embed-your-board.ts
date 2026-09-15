import type { ArticleMeta } from '../types'
import en from './kanban-embed-your-board.en.md?raw'
import zh from './kanban-embed-your-board.zh.md?raw'

const article: ArticleMeta = {
  id: 'embed-your-board',
  categoryId: 'kanban',
  order: 3,
  updated: '2026-08-11',
  title: {
    en: 'Embed a board in your own app',
    zh: '把看板嵌入你自己的应用',
  },
  summary: {
    en: 'Embed all five Board projections, personal work scopes, Card detail, and safe REST/client authentication.',
    zh: '嵌入五种看板投影、个人工作范围与卡片详情，并正确配置安全的 REST/client 认证。',
  },
  body: { en, zh },
}

export default article
