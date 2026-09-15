import type { ArticleMeta } from '../types'
import en from './kanban-web-board-view.en.md?raw'
import zh from './kanban-web-board-view.zh.md?raw'

const article: ArticleMeta = {
  id: 'web-board-view',
  categoryId: 'kanban',
  order: 2,
  updated: '2026-08-11',
  title: {
    en: 'The web board view',
    zh: '网页看板视图',
  },
  summary: {
    en: 'Open one project through five views, preserve personal context, batch-edit Cards, and audit every field change.',
    zh: '用五种视图打开同一项目，保留个人上下文，批量编辑卡片并审计字段变更。',
  },
  body: { en, zh },
}

export default article
