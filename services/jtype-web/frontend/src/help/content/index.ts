// Aggregates the help content. Article + case modules are glob-collected so
// authors can add a file under `articles/` or `cases/` without editing a
// central registry. Exposes lookups + a flat search index.

import type { ArticleMeta, CaseMeta, CategoryMeta, SearchRecord } from './types'
import { categories, categoriesByOrder, getCategory } from './categories'

const articleModules = import.meta.glob<{ default?: ArticleMeta }>('./articles/*.ts', {
  eager: true,
})
const caseModules = import.meta.glob<{ default?: CaseMeta }>('./cases/*.ts', { eager: true })

export const articles: ArticleMeta[] = Object.values(articleModules)
  .map((m) => m.default)
  .filter((a): a is ArticleMeta => Boolean(a))
  .sort((a, b) => a.order - b.order)

export const cases: CaseMeta[] = Object.values(caseModules)
  .map((m) => m.default)
  .filter((c): c is CaseMeta => Boolean(c))
  .sort((a, b) => a.order - b.order)

export { categories, categoriesByOrder, getCategory }
export type { ArticleMeta, CaseMeta, CategoryMeta, SearchRecord }

export function getArticlesByCategory(categoryId: string): ArticleMeta[] {
  return articles.filter((a) => a.categoryId === categoryId)
}

export function getArticle(categoryId: string, id: string): ArticleMeta | undefined {
  return articles.find((a) => a.categoryId === categoryId && a.id === id)
}

export function getCase(slug: string): CaseMeta | undefined {
  return cases.find((c) => c.slug === slug)
}

export function articleHref(article: ArticleMeta): string {
  return `/help/c/${article.categoryId}/${article.id}`
}

export function caseHref(item: CaseMeta): string {
  return `/help/cases/${item.slug}`
}

/** Flattened, searchable view of every article + case. */
export const searchIndex: SearchRecord[] = [
  ...articles.map((a): SearchRecord => {
    const category = getCategory(a.categoryId)
    return {
      kind: 'article',
      href: articleHref(a),
      title: a.title,
      summary: a.summary,
      context: category?.title ?? { en: 'Help', zh: '帮助' },
    }
  }),
  ...cases.map((c): SearchRecord => ({
    kind: 'case',
    href: caseHref(c),
    title: c.title,
    summary: c.tagline,
    context: { en: 'Case study', zh: '案例' },
  })),
]
