import type { ArticleMeta } from '../types'
import en from './kanban-web-board-view.en.md?raw'
import zh from './kanban-web-board-view.zh.md?raw'

const article: ArticleMeta = {
  id: 'web-board-view',
  categoryId: 'kanban',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'The web board view',
    zh: '网页看板视图',
  },
  summary: {
    en: 'Open a board in the web app: drag cards across columns, watch realtime updates from teammates, and filter, sort, group, or search to focus.',
    zh: '在网页应用中打开看板：在列之间拖拽卡片、实时看到队友的更新，并通过筛选、排序、分组或搜索来聚焦。',
  },
  body: { en, zh },
}

export default article
