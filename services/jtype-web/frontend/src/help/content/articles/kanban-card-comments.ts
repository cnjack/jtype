import type { ArticleMeta } from '../types'
import en from './kanban-card-comments.en.md?raw'
import zh from './kanban-card-comments.zh.md?raw'

const article: ArticleMeta = {
  id: 'card-comments',
  categoryId: 'kanban',
  order: 6,
  updated: '2026-07-16',
  title: {
    en: 'Card comments: threads, reactions, and resolving discussions',
    zh: '卡片评论：话题、表情回应与解决讨论',
  },
  summary: {
    en: 'Discuss cards in Markdown comment threads — reply, edit, react with emoji, resolve finished discussions, and read it all from the desktop board too.',
    zh: '用 Markdown 评论讨论卡片——回复、编辑、emoji 回应、解决已完成的讨论，桌面端看板同样可用。',
  },
  body: { en, zh },
}

export default article
