import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

const config: LinguiConfig = {
  locales: ["en", "zh", "ja", "ko"],
  sourceLocale: "en",
  compileNamespace: "es",
  catalogs: [
    {
      path: "shared/i18n/locales/{locale}/messages",
      include: ["shared/**/*.{ts,tsx}"],
    },
    {
      path: "src/i18n/locales/{locale}/messages",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.ts", "src/aiCommands.ts", "src/app/aiCommands.ts", "src/lib/aiCommands.ts"],
    },
  ],
  format: formatter({ lineNumbers: false }),
  macro: {
    // Allow both v5 @lingui/macro and v6 @lingui/core/macro paths
    corePackage: ["@lingui/core/macro", "@lingui/macro"],
    jsxPackage: ["@lingui/react/macro", "@lingui/macro"],
  },
};

export default config;
