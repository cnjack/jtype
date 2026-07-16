import type { ArticleMeta } from '../types'
import en from './vault-editing-editor-power-tools.en.md?raw'
import zh from './vault-editing-editor-power-tools.zh.md?raw'

const article: ArticleMeta = {
  id: 'editor-power-tools',
  categoryId: 'vault-editing',
  order: 4,
  updated: '2026-07-16',
  title: {
    en: 'Editor power tools: slash menu, find & replace, images, and rich preview',
    zh: '编辑器进阶：slash 菜单、查找替换、图片粘贴与富预览',
  },
  summary: {
    en: 'The slash command menu, find & replace, pasting images from the clipboard, clickable outline, syntax-highlighted code, image lightbox, and live HTML preview blocks.',
    zh: 'slash 命令菜单、查找替换、剪贴板图片粘贴、可点击大纲、代码高亮、图片放大预览与 HTML 实时预览块。',
  },
  body: { en, zh },
}

export default article
