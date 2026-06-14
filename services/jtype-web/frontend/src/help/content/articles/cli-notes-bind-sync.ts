import type { ArticleMeta } from '../types'
import en from './cli-notes-bind-sync.en.md?raw'
import zh from './cli-notes-bind-sync.zh.md?raw'

const article: ArticleMeta = {
  id: 'notes-bind-sync',
  categoryId: 'cli',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'Notes, bind & sync from the CLI',
    zh: '在命令行中记录、绑定与同步笔记',
  },
  summary: {
    en: 'Read and write your vault files with local-first note commands, capture from the terminal via stdin, then bind to a workspace and sync to the cloud.',
    zh: '用本地优先的笔记命令读写仓库文件，通过 stdin 从终端随手捕捉，再绑定到工作区并同步到云端。',
  },
  body: { en, zh },
}

export default article
