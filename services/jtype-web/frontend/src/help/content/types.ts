// Content model for the JType help center.
//
// All long-form content (category titles/summaries, article titles/summaries,
// article + case bodies) is authored as bilingual data — `Localized` objects
// keyed by document locale. UI chrome (buttons, labels, breadcrumbs) stays in
// the lingui catalogs instead. See `../i18n.ts` for locale selection.

/** The two locales the help content is authored in. */
export type DocLocale = 'en' | 'zh'

/** A string available in both authored locales. `zh` falls back to `en` visually if empty. */
export interface Localized {
  en: string
  zh: string
}

/** A top-of-page category landing (the tabs across the top of the help center). */
export interface CategoryMeta {
  /** URL slug, e.g. `getting-started`. */
  id: string
  /** Short label for the top nav, e.g. "Getting started". */
  title: Localized
  /** One-line description shown on the category card + landing hero. */
  summary: Localized
  /** Optional Remotion composition id for the category explainer video. */
  videoId?: string
  /** Accent hex used for the category's gradient/badge. */
  accent: string
  /** Ordering across the top nav and the home grid (lower = earlier). */
  order: number
  /** Heroicon name (24/outline), resolved to a component in the UI layer. */
  icon: string
}

/** A single help article rendered from Markdown. */
export interface ArticleMeta {
  /** URL slug unique within the help center, e.g. `what-is-jtype`. */
  id: string
  /** Owning category id (must match a `CategoryMeta.id`). */
  categoryId: string
  /** Ordering within the category (lower = earlier). */
  order: number
  title: Localized
  summary: Localized
  /** ISO date (YYYY-MM-DD) shown as "Last updated". */
  updated: string
  /** Article body as Markdown, per locale. Rendered with `@shared/lib` markdown. */
  body: Localized
}

/** A case-study / POC page. */
export interface CaseMeta {
  /** URL slug, e.g. `engineering-team`. */
  slug: string
  title: Localized
  /** One-line hook shown on the case card + hero. */
  tagline: Localized
  /** Who the scenario is for, e.g. "Engineering team of 6". */
  persona: Localized
  /** Optional Remotion composition id for the case explainer. */
  videoId?: string
  accent: string
  /** Ordering on the cases index (lower = earlier). */
  order: number
  /** Pointer to the real, openable example vault in the repo (for "try it yourself"). */
  vaultPath: string
  /** Full case-study body as Markdown, per locale. */
  body: Localized
}

/** A flattened, searchable record covering both articles and cases. */
export interface SearchRecord {
  kind: 'article' | 'case'
  /** Route to navigate to. */
  href: string
  title: Localized
  summary: Localized
  /** Category/Persona label for context in the result row. */
  context: Localized
}
