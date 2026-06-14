import type { ArticleMeta } from '../types'
import en from './vault-editing-how-vaults-work.en.md?raw'
import zh from './vault-editing-how-vaults-work.zh.md?raw'

const article: ArticleMeta = {
  id: 'how-vaults-work',
  categoryId: 'vault-editing',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'How vaults work',
    zh: '仓库是如何工作的',
  },
  summary: {
    en: 'A vault is a normal folder of Markdown files you fully own — subfolders and all. JType never locks it, and keeps its own state in a small .jtype folder.',
    zh: '仓库就是一个由你完全掌控的普通 Markdown 文件夹——连子文件夹也一并归你。JType 绝不锁定它，只把自身状态存放在一个小小的 .jtype 文件夹里。',
  },
  body: { en, zh },
}

export default article
