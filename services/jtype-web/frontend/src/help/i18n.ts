// Document-locale selection for help content.
//
// The app's active locale (from lingui) can be en/zh/ja/ko, but help bodies are
// only authored in en + zh. This picks the right authored locale and exposes a
// hook + a plain getter for picking from `Localized` objects.

import { useLingui } from '@lingui/react'
import type { DocLocale, Localized } from './content/types'

/** Map any active app locale to the closest authored doc locale. */
export function toDocLocale(locale: string | undefined): DocLocale {
  return locale && locale.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** Pick a localized string, falling back to English when the zh value is empty. */
export function pick(value: Localized, locale: DocLocale): string {
  if (locale === 'zh') return value.zh?.trim() ? value.zh : value.en
  return value.en
}

/** Hook: returns the active doc locale and a bound picker. */
export function useDocLocale(): { locale: DocLocale; t: (value: Localized) => string } {
  const { i18n } = useLingui()
  const locale = toDocLocale(i18n.locale)
  return { locale, t: (value: Localized) => pick(value, locale) }
}
