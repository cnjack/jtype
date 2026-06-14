import type { ArticleMeta } from '../types'
import en from './sync-workspaces-push-pull-sync.en.md?raw'
import zh from './sync-workspaces-push-pull-sync.zh.md?raw'

const article: ArticleMeta = {
  id: 'push-pull-sync',
  categoryId: 'sync-workspaces',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'Push & pull sync and resolving conflicts',
    zh: '推送、拉取同步与冲突解决',
  },
  summary: {
    en: 'How two-way sync works, what versions and conflicts mean, and how to resolve a note that changed in two places — with local always the source of truth.',
    zh: '双向同步的工作原理、版本与冲突的含义，以及如何解决在两处都被改动的笔记——本地始终是唯一可信来源。',
  },
  body: { en, zh },
}

export default article
