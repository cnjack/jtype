import type { ArticleMeta } from '../types'
import en from './publishing-custom-domains.en.md?raw'
import zh from './publishing-custom-domains.zh.md?raw'

const article: ArticleMeta = {
  id: 'custom-domains',
  categoryId: 'publishing',
  order: 2,
  updated: '2026-06-14',
  title: {
    en: 'Custom domains for your site',
    zh: '为站点配置自定义域名',
  },
  summary: {
    en: 'Serve your published site from your own domain — and know exactly what goes public (only publish: true notes) and what stays private.',
    zh: '用你自己的域名提供已发布的站点——并清楚地知道哪些会公开（仅限 publish: true 的笔记）、哪些保持私有。',
  },
  body: { en, zh },
}

export default article
