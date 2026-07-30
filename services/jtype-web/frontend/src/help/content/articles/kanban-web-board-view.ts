import type { ArticleMeta } from '../types'
import en from './kanban-web-board-view.en.md?raw'
import zh from './kanban-web-board-view.zh.md?raw'

const article: ArticleMeta = {
  id: 'web-board-view',
  categoryId: 'kanban',
  order: 2,
  updated: '2026-07-30',
  title: {
    en: 'The web board view',
    zh: '网页看板视图',
  },
  summary: {
    en: 'Open a board in the web app: choose vertical swimlanes, drag cards between them, and combine lightweight filters.',
    zh: '在网页应用中打开看板：选择纵向泳道、跨泳道拖拽卡片，并组合轻量筛选。',
  },
  body: { en, zh },
}

export default article
