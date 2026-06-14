import type { CaseMeta } from '../types'
import en from './engineering-team.en.md?raw'
import zh from './engineering-team.zh.md?raw'

const study: CaseMeta = {
  slug: 'engineering-team',
  order: 1,
  accent: '#6366f1',
  videoId: 'kanban',
  vaultPath: 'examples/eng-team-vault',
  title: {
    en: 'One workspace for an engineering team — notes, a Launch board, and an AI that triages it',
    zh: '工程团队的同一个工作区——笔记、Launch 看板，以及帮你梳理任务的 AI',
  },
  tagline: {
    en: 'Six engineers keep their weekly notes and launch board in a single JType workspace, and let an AI assistant draft summaries and cards over MCP.',
    zh: '六名工程师把周会笔记和发布看板放进同一个 JType 工作区，并让 AI 助手通过 MCP 起草纪要、创建卡片。',
  },
  persona: { en: 'Engineering team', zh: '工程团队' },
  body: { en, zh },
}

export default study
