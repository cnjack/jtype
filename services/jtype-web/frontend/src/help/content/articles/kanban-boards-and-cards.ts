import type { ArticleMeta } from '../types'
import en from './kanban-boards-and-cards.en.md?raw'
import zh from './kanban-boards-and-cards.zh.md?raw'

const article: ArticleMeta = {
  id: 'boards-and-cards',
  categoryId: 'kanban',
  order: 1,
  updated: '2026-08-11',
  title: {
    en: 'Boards & cards: turning a workspace into kanban',
    zh: '看板与卡片：把工作区变成看板',
  },
  summary: {
    en: 'Plan one Markdown-native project through Board, Table, Calendar, Backlog, and Gantt projections.',
    zh: '用看板、表格、日历、Backlog 与 Gantt 投影规划同一个 Markdown 原生项目。',
  },
  body: { en, zh },
}

export default article
