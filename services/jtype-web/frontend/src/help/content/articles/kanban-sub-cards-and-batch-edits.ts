import type { ArticleMeta } from '../types'
import en from './kanban-sub-cards-and-batch-edits.en.md?raw'
import zh from './kanban-sub-cards-and-batch-edits.zh.md?raw'

const article: ArticleMeta = {
  id: 'sub-cards-and-batch-edits',
  categoryId: 'kanban',
  order: 5,
  updated: '2026-07-16',
  title: {
    en: 'Sub-cards, batch edits, and full-text search',
    zh: '子卡片、批量编辑与全文搜索',
  },
  summary: {
    en: 'Break an epic into sub-cards with a progress ring, edit many cards at once with multi-select, and search across card bodies, tags, and tickets.',
    zh: '用子卡片拆解大任务并查看完成度圆环，多选批量编辑卡片，并在卡片正文、标签与工单号中全文搜索。',
  },
  body: { en, zh },
}

export default article
