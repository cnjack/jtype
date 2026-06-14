import type { ArticleMeta } from '../types'
import en from './kanban-boards-and-cards.en.md?raw'
import zh from './kanban-boards-and-cards.zh.md?raw'

const article: ArticleMeta = {
  id: 'boards-and-cards',
  categoryId: 'kanban',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'Boards & cards: turning a workspace into kanban',
    zh: '看板与卡片：把工作区变成看板',
  },
  summary: {
    en: 'Create boards with columns, add cards with priority and an assignee, move them across columns, and see how cards relate to your notes.',
    zh: '创建带列的看板、为卡片设置优先级与负责人、在列之间移动卡片，并了解卡片与笔记的关系。',
  },
  body: { en, zh },
}

export default article
