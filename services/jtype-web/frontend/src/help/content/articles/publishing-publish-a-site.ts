import type { ArticleMeta } from '../types'
import en from './publishing-publish-a-site.en.md?raw'
import zh from './publishing-publish-a-site.zh.md?raw'

const article: ArticleMeta = {
  id: 'publish-a-site',
  categoryId: 'publishing',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'Publish a site from your notes',
    zh: '把笔记发布成站点',
  },
  summary: {
    en: 'Add publish: true to a note’s frontmatter to put it on your public site at /u/your-username — while the source stays plain Markdown.',
    zh: '在笔记的 frontmatter 中加上 publish: true，即可把它发布到 /u/你的用户名 的公开站点，而源文件依旧是纯 Markdown。',
  },
  body: { en, zh },
}

export default article
