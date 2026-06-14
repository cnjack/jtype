import type { ArticleMeta } from '../types'
import en from './cli-install-and-login.en.md?raw'
import zh from './cli-install-and-login.zh.md?raw'

const article: ArticleMeta = {
  id: 'install-and-login',
  categoryId: 'cli',
  order: 1,
  updated: '2026-06-14',
  title: {
    en: 'Install the jtype CLI and sign in',
    zh: '安装 jtype 命令行并登录',
  },
  summary: {
    en: 'Three ways to put the jtype CLI on your PATH, then sign in with the browser-based device flow and confirm with jtype whoami.',
    zh: '三种方式把 jtype 命令行加入 PATH，然后用基于浏览器的设备授权流程登录，并用 jtype whoami 确认。',
  },
  body: { en, zh },
}

export default article
