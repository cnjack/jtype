import type { ArticleMeta } from '../types'
import en from './vault-editing-quick-open-and-links.en.md?raw'
import zh from './vault-editing-quick-open-and-links.zh.md?raw'

const article: ArticleMeta = {
  id: 'quick-open-and-links',
  categoryId: 'vault-editing',
  order: 3,
  updated: '2026-06-14',
  title: {
    en: 'Quick open and links',
    zh: '快速打开与链接',
  },
  summary: {
    en: 'Get around a vault fast: file navigation, quick open, document info, and linking notes together with wikilinks.',
    zh: '在仓库中快速穿梭：文件导航、快速打开、文档信息，以及用 wikilink 把笔记串联起来。',
  },
  body: { en, zh },
}

export default article
