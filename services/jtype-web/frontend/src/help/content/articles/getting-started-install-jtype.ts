import type { ArticleMeta } from '../types'
import en from './getting-started-install-jtype.en.md?raw'
import zh from './getting-started-install-jtype.zh.md?raw'

const article: ArticleMeta = {
  id: 'install-jtype',
  categoryId: 'getting-started',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'Install JType',
    zh: '安装 JType',
  },
  summary: {
    en: 'Download the desktop app for macOS or Windows, optionally add the jtype CLI, and see what happens on first launch.',
    zh: '为 macOS 或 Windows 下载桌面应用，按需安装 jtype 命令行，并了解首次启动时会发生什么。',
  },
  body: { en, zh },
}

export default article
