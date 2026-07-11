// The shared lingui catalogs are precompiled .mjs files committed under
// shared/i18n/locales; give them a type so the package can import them.
declare module '@shared/i18n/locales/*/messages.mjs' {
  export const messages: Record<string, string>
}
