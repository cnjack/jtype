import type { ArticleMeta } from '../types'
import en from './kanban-automate-a-board.en.md?raw'
import zh from './kanban-automate-a-board.zh.md?raw'

const article: ArticleMeta = {
  id: 'automate-a-board',
  categoryId: 'kanban',
  order: 4,
  updated: '2026-07-15',
  title: {
    en: 'Automate a board with push, pull, or live events',
    zh: '用推送、拉取或实时事件自动化看板',
  },
  summary: {
    en: 'Choose the right event delivery mode, resume a pull automation with a sequence cursor, and avoid losing or double-processing card changes.',
    zh: '选择合适的事件传递方式，用 sequence 游标续拉自动化，并避免遗漏或重复处理卡片变更。',
  },
  body: { en, zh },
}

export default article
