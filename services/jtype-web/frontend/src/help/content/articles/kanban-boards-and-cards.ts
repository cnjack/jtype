import type { ArticleMeta } from '../types'
import en from './kanban-boards-and-cards.en.md?raw'
import zh from './kanban-boards-and-cards.zh.md?raw'

const article: ArticleMeta = {
  id: 'boards-and-cards',
  categoryId: 'kanban',
  order: 1,
  updated: '2026-07-30',
  title: {
    en: 'Boards & cards: turning a workspace into kanban',
    zh: '看板与卡片：把工作区变成看板',
  },
  summary: {
    en: 'Create boards with status columns, optional horizontal rows, and cards that remain ordinary Markdown notes.',
    zh: '创建带状态列和可选横向分组的看板，并了解卡片如何保持为普通 Markdown 笔记。',
  },
  body: { en, zh },
}

export default article
