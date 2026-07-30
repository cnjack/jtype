import type { ArticleMeta } from '../types'
import en from './kanban-embed-your-board.en.md?raw'
import zh from './kanban-embed-your-board.zh.md?raw'

const article: ArticleMeta = {
  id: 'embed-your-board',
  categoryId: 'kanban',
  order: 3,
  updated: '2026-07-30',
  title: {
    en: 'Embed a board in your own app',
    zh: '把看板嵌入你自己的应用',
  },
  summary: {
    en: 'Embed the shared JType board with status management, optional rows, lightweight filters, and drag-to-move.',
    zh: '嵌入共享的 JType 看板，支持状态管理、可选横向分组、轻量筛选与拖拽移动。',
  },
  body: { en, zh },
}

export default article
