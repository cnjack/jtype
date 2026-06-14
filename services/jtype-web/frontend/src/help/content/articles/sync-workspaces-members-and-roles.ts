import type { ArticleMeta } from '../types'
import en from './sync-workspaces-members-and-roles.en.md?raw'
import zh from './sync-workspaces-members-and-roles.zh.md?raw'

const article: ArticleMeta = {
  id: 'members-and-roles',
  categoryId: 'sync-workspaces',
  order: 3,
  updated: '2026-06-14',
  title: {
    en: 'Members, roles & sharing scope',
    zh: '成员、角色与共享范围',
  },
  summary: {
    en: 'Invite people to a workspace, understand the owner / admin / member roles, what each can do, and how sharing and storage are scoped to one workspace.',
    zh: '邀请成员加入工作区，理解所有者 / 管理员 / 成员角色及各自权限，以及共享和存储如何限定在单个工作区内。',
  },
  body: { en, zh },
}

export default article
