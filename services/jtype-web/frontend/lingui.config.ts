import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: LinguiConfig = {
  locales: ["en", "zh", "ja", "ko"],
  sourceLocale: "en",
  compileNamespace: "es",
  catalogs: [
    {
      path: path.resolve(__dirname, "../../../shared/i18n/locales/{locale}/messages"),
      include: [path.resolve(__dirname, "../../../shared/**/*.{ts,tsx}")],
    },
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["<rootDir>/src/**/*.{ts,tsx}"],
    },
  ],
  format: formatter({ lineNumbers: false }),
  macro: {
    corePackage: ["@lingui/core/macro", "@lingui/macro"],
    jsxPackage: ["@lingui/react/macro", "@lingui/macro"],
  },
};

export default config;
