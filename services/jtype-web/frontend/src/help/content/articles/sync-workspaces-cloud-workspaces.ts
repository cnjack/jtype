import type { ArticleMeta } from '../types'
import en from './sync-workspaces-cloud-workspaces.en.md?raw'
import zh from './sync-workspaces-cloud-workspaces.zh.md?raw'

const article: ArticleMeta = {
  id: 'cloud-workspaces',
  categoryId: 'sync-workspaces',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'Cloud workspaces & binding your vault',
    zh: '云端工作区与绑定你的仓库',
  },
  summary: {
    en: 'What a cloud workspace is, how to create one, sign in on desktop with browser OAuth, and bind a local vault to it.',
    zh: '什么是云端工作区，如何创建工作区、在桌面端用浏览器 OAuth 登录，并把本地仓库绑定到它。',
  },
  body: { en, zh },
}

export default article
