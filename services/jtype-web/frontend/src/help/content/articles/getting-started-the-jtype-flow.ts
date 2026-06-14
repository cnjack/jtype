import type { ArticleMeta } from '../types'
import en from './getting-started-the-jtype-flow.en.md?raw'
import zh from './getting-started-the-jtype-flow.zh.md?raw'

const article: ArticleMeta = {
  id: 'the-jtype-flow',
  categoryId: 'getting-started',
  order: 3,
  updated: '2026-06-14',
  title: {
    en: 'How JType works: the local-first flow',
    zh: 'JType 的工作方式：本地优先的流程',
  },
  summary: {
    en: 'The mental model behind JType — vault, cloud workspace, publishing, and AI — and how they fit together.',
    zh: 'JType 背后的核心模型——仓库、云端工作区、发布与 AI——以及它们如何协同。',
  },
  body: { en, zh },
}

export default article
