import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build-time only: the lingui vite plugin + babel macro pass compile the
// `t`/`<Trans>` macros inside the shared board components to the same hashed
// message ids the committed shared catalogs (shared/i18n/locales) carry. The
// package's own src/ deliberately uses no macros (see src/strings.ts), so no
// extraction ever runs from here — this config only points the macro compiler
// at the shared catalog set, mirroring services/jtype-web/frontend.
const config: LinguiConfig = {
  locales: ["en", "zh", "ja", "ko"],
  sourceLocale: "en",
  compileNamespace: "es",
  catalogs: [
    {
      path: path.resolve(__dirname, "../../shared/i18n/locales/{locale}/messages"),
      include: [path.resolve(__dirname, "../../shared/**/*.{ts,tsx}")],
    },
  ],
  format: formatter({ lineNumbers: false }),
  macro: {
    corePackage: ["@lingui/core/macro", "@lingui/macro"],
    jsxPackage: ["@lingui/react/macro", "@lingui/macro"],
  },
};

export default config;
