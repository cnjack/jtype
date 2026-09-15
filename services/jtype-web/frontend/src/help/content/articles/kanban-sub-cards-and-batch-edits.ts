import type { ArticleMeta } from '../types'
import en from './kanban-sub-cards-and-batch-edits.en.md?raw'
import zh from './kanban-sub-cards-and-batch-edits.zh.md?raw'

const article: ArticleMeta = {
  id: 'sub-cards-and-batch-edits',
  categoryId: 'kanban',
  order: 5,
  updated: '2026-08-11',
  title: {
    en: 'Sub-cards, batch edits, and full-text search',
    zh: '子卡片、批量编辑与全文搜索',
  },
  summary: {
    en: 'Break an epic into sub-cards, batch status, priority, assignee, added labels, due dates or archive state, and search full Card bodies.',
    zh: '用子卡片拆解大任务，批量修改状态、优先级、负责人、标签、截止日期或归档状态，并搜索完整卡片正文。',
  },
  body: { en, zh },
}

export default article
