import type { CaseMeta } from '../types'
import en from './personal-kb.en.md?raw'
import zh from './personal-kb.zh.md?raw'

const study: CaseMeta = {
  slug: 'personal-kb',
  order: 2,
  accent: '#0ea5a2',
  videoId: 'vault',
  vaultPath: 'examples/personal-kb-vault',
  title: {
    en: 'A personal knowledge base, fully local-first',
    zh: '完全本地优先的个人知识库',
  },
  tagline: {
    en: 'Capture from anywhere, link ideas as you go, review weekly, and publish a digest — all on plain Markdown you own.',
    zh: '随处捕捉、边写边链接、每周回顾，并按需发布周报——全部基于你自己掌握的纯 Markdown。',
  },
  persona: { en: 'Knowledge worker', zh: '知识工作者' },
  body: { en, zh },
}

export default study
