import type { ArticleMeta } from '../types'
import en from './vault-editing-writing-markdown.en.md?raw'
import zh from './vault-editing-writing-markdown.zh.md?raw'

const article: ArticleMeta = {
  id: 'writing-markdown',
  categoryId: 'vault-editing',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'Writing Markdown in JType',
    zh: '在 JType 中撰写 Markdown',
  },
  summary: {
    en: 'GitHub-flavored Markdown, YAML frontmatter, the write / split / preview modes, and a preview that renders math, Mermaid, and PlantUML.',
    zh: 'GitHub 风格 Markdown、YAML frontmatter、写作 / 分屏 / 预览三种模式，以及能渲染数学公式、Mermaid 与 PlantUML 的预览。',
  },
  body: { en, zh },
}

export default article
