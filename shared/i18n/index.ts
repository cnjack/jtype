import { i18n } from "@lingui/core";

export const SUPPORTED_LOCALES = ["en", "zh", "ja", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
type LocaleMessages = Record<string, unknown>;
type LocaleMessagesLoader = (locale: SupportedLocale) => Promise<LocaleMessages>;

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  zh: "简体中文",
  ja: "日本語",
  ko: "한국어",
};

// BCP-47 language tags for the <html lang> attribute. Keeping this in sync with
// the active locale fixes screen-reader pronunciation, browser translation
// prompts, and search-engine language detection.
const HTML_LANG: Record<SupportedLocale, string> = {
  en: "en",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
};

function applyDocumentLang(locale: SupportedLocale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = HTML_LANG[locale] ?? locale;
  }
}

const STORAGE_KEY = "jtype-locale";
let localeMessagesLoader: LocaleMessagesLoader | null = null;

export function setLocaleMessagesLoader(loader: LocaleMessagesLoader | null) {
  localeMessagesLoader = loader;
}

export function ensureLocaleActivated(locale: SupportedLocale = "en") {
  if (i18n.locale) return;
  i18n.load(locale, {});
  i18n.activate(locale);
  applyDocumentLang(locale);
}

export function getDefaultLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale;
  }
  return "en";
}

export async function activateLocale(
  locale: SupportedLocale,
  extraMessages?: LocaleMessages
): Promise<void> {
  const mod = await import(`./locales/${locale}/messages.mjs`);
  const sharedMessages = mod.messages ?? mod.default?.messages ?? mod.default ?? {};
  const resolvedExtraMessages =
    extraMessages ?? (localeMessagesLoader ? await localeMessagesLoader(locale) : {});
  const merged = resolvedExtraMessages
    ? { ...sharedMessages, ...resolvedExtraMessages }
    : sharedMessages;
  i18n.load(locale, merged);
  i18n.activate(locale);
  applyDocumentLang(locale);
  localStorage.setItem(STORAGE_KEY, locale);
}

ensureLocaleActivated();

export { i18n };
