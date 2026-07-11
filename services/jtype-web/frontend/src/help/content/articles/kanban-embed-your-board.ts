import type { ArticleMeta } from '../types'
import en from './kanban-embed-your-board.en.md?raw'
import zh from './kanban-embed-your-board.zh.md?raw'

const article: ArticleMeta = {
  id: 'embed-your-board',
  categoryId: 'kanban',
  order: 3,
  updated: '2026-07-11',
  title: {
    en: 'Embed a board in your own app',
    zh: '把看板嵌入你自己的应用',
  },
  summary: {
    en: 'Drop a live, interactive JType board into your own website or app with the jtype-board-react package — same data, columns and drag-to-move, with a scoped token.',
    zh: '用 jtype-board-react 包，把一块实时可交互的 JType 看板嵌进你自己的网站或应用——同一份数据、列与拖拽移动，凭一枚受限令牌即可。',
  },
  body: { en, zh },
}

export default article
