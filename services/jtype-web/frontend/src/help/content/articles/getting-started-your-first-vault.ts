import type { ArticleMeta } from '../types'
import en from './getting-started-your-first-vault.en.md?raw'
import zh from './getting-started-your-first-vault.zh.md?raw'

const article: ArticleMeta = {
  id: 'your-first-vault',
  categoryId: 'getting-started',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'Open your first vault',
    zh: '打开第一个仓库',
  },
  summary: {
    en: 'Create or open a vault, write your first note, and switch between write, split, and preview — all backed by plain .md files on disk.',
    zh: '创建或打开仓库、写下第一条笔记，并在写作、分栏与预览之间切换——一切都由磁盘上的纯 .md 文件支撑。',
  },
  body: { en, zh },
}

export default article
