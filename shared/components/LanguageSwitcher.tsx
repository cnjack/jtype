import { useLingui } from "@lingui/react";
import { GlobeAltIcon, CheckIcon } from "@heroicons/react/24/outline";
import { SUPPORTED_LOCALES, LOCALE_LABELS, activateLocale, type SupportedLocale } from "../i18n";

interface LanguageSwitcherProps {
  /** inline: standalone list; menu-item: renders a trigger row that expands a sub-list */
  variant?: "inline" | "menu-item";
  /** Extra CSS classes on the root element */
  className?: string;
}

export function LanguageSwitcher({ variant = "menu-item", className = "" }: LanguageSwitcherProps) {
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as SupportedLocale;

  async function handleSelect(locale: SupportedLocale) {
    if (locale === currentLocale) return;
    await activateLocale(locale);
    // Force a re-render of any non-reactive consumers
    window.dispatchEvent(new CustomEvent("jtype-locale-change", { detail: locale }));
  }

  if (variant === "inline") {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        {SUPPORTED_LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
              locale === currentLocale
                ? "bg-brand-soft font-medium text-brand"
                : "text-stone-700 hover:bg-stone-50"
            }`}
            onClick={() => void handleSelect(locale)}
          >
            <span className="flex-1 text-left">{LOCALE_LABELS[locale]}</span>
            {locale === currentLocale && <CheckIcon className="h-3.5 w-3.5 text-brand" />}
          </button>
        ))}
      </div>
    );
  }

  // menu-item variant: rendered inside a @headlessui Menu, acts as a submenu trigger
  // The parent must handle showing/hiding; we expose a self-contained panel.
  return (
    <LanguageSwitcherMenuPanel
      currentLocale={currentLocale}
      onSelect={handleSelect}
      className={className}
    />
  );
}

interface LanguageSwitcherMenuPanelProps {
  currentLocale: SupportedLocale;
  onSelect: (locale: SupportedLocale) => Promise<void>;
  className?: string;
}

export function LanguageSwitcherMenuPanel({
  currentLocale,
  onSelect,
  className = "",
}: LanguageSwitcherMenuPanelProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">
        <GlobeAltIcon className="h-3.5 w-3.5" />
        Language
      </div>
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            locale === currentLocale
              ? "bg-brand-soft font-medium text-brand"
              : "text-stone-700 hover:bg-stone-50"
          }`}
          onClick={() => void onSelect(locale)}
        >
          <span className="flex-1 text-left">{LOCALE_LABELS[locale]}</span>
          {locale === currentLocale && <CheckIcon className="h-3.5 w-3.5 text-brand" />}
        </button>
      ))}
    </div>
  );
}

/** A compact trigger row suitable for embedding in a Headless UI MenuItem.
 *  Shows globe icon + "Language" label + current locale abbrev.
 *  Clicking opens/closes the inline panel.
 */
interface LanguageMenuItemProps {
  focus?: boolean;
}

export function LanguageMenuTriggerRow({ focus = false }: LanguageMenuItemProps) {
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as SupportedLocale;

  return (
    <span
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition ${
        focus ? "bg-brand-soft text-brand" : ""
      }`}
    >
      <GlobeAltIcon className="h-4 w-4" />
      <span className="flex-1 text-left">Language</span>
      <span className="text-xs text-stone-400">{LOCALE_LABELS[currentLocale]}</span>
    </span>
  );
}
