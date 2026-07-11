import { i18n } from '@lingui/core'
import { messages as en } from '@shared/i18n/locales/en/messages.mjs'
import { messages as zh } from '@shared/i18n/locales/zh/messages.mjs'
import { messages as ja } from '@shared/i18n/locales/ja/messages.mjs'
import { messages as ko } from '@shared/i18n/locales/ko/messages.mjs'

export type BoardLocale = 'en' | 'zh' | 'ja' | 'ko'

const catalogs: Record<BoardLocale, Record<string, string>> = { en, zh, ja, ko }

/**
 * Activate a locale on the package's bundled lingui instance. Unlike
 * shared/i18n's `activateLocale`, this deliberately touches NO host state —
 * no localStorage, no `document.documentElement.lang` (an embed must not
 * mutate the page it lives in). The catalogs are the same committed shared
 * ones the desktop + web apps use, so the board chrome is fully localized.
 *
 * Known limitation (documented in the README): lingui's `i18n` is a singleton
 * within this bundle, so multiple <JTypeBoard> instances share one active
 * locale — the last mounted/changed instance wins.
 */
export function activateBoardLocale(locale: BoardLocale): void {
  i18n.load(locale, catalogs[locale] ?? catalogs.en)
  i18n.activate(locale)
}

export { i18n }
