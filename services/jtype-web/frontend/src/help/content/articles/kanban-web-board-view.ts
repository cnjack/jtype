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
    en: 'Open a board in the web app: manage status columns, drag cards, add optional rows, and combine lightweight filters.',
    zh: '在网页应用中打开看板：管理状态列、拖拽卡片、添加可选横向分组，并组合轻量筛选。',
  },
  body: { en, zh },
}

export default article
