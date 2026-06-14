import type { CaseMeta } from '../types'
import en from './docs-site.en.md?raw'
import zh from './docs-site.zh.md?raw'

const study: CaseMeta = {
  slug: 'docs-site',
  order: 3,
  accent: '#10b981',
  videoId: 'publish',
  vaultPath: 'examples/team-docs-site-vault',
  title: {
    en: 'Ship product docs as a public site — straight from a vault',
    zh: '直接从仓库把产品文档发布成公开站点',
  },
  tagline: {
    en: 'Author Markdown, flip publish: true, and your docs go live at /u/:username — on your own domain.',
    zh: '编写 Markdown、把 publish: true 一开，文档就上线到 /u/:username——还能挂上自有域名。',
  },
  persona: { en: 'Small team', zh: '小团队' },
  body: { en, zh },
}

export default study
