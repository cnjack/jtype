import { createRoot } from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { App } from "./app/App";
import { tauri } from "./lib/tauri";
import {
  i18n,
  activateLocale,
  ensureLocaleActivated,
  getDefaultLocale,
  setLocaleMessagesLoader,
  type SupportedLocale,
} from "@shared/i18n";
import "./styles.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPlatformMessages(locale: SupportedLocale): Promise<Record<string, unknown>> {
  const platformMod: any = await import(`./i18n/locales/${locale}/messages.mjs`);
  const platformMessages =
    platformMod.messages ?? platformMod.default?.messages ?? platformMod.default ?? {};
  return platformMessages;
}

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  );
}

async function bootstrap() {
  ensureLocaleActivated("en");
  setLocaleMessagesLoader(loadPlatformMessages);

  const locale = getDefaultLocale();

  try {
    await activateLocale(locale);
  } catch (error) {
    console.error("Failed to initialize desktop locale, falling back to English.", error);
    await activateLocale("en");
  }

  renderApp();
}

void bootstrap().catch((error) => {
  console.error("Failed to bootstrap desktop app i18n.", error);
  renderApp();
});


window.setTimeout(() => {
  void tauri.appReady().catch(() => undefined);
}, 0);
