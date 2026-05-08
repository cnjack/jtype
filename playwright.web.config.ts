import { defineConfig } from "@playwright/test";

const port = Number(process.env.JTYPE_WEB_E2E_PORT || 5173);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "web-*.spec.ts",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    cwd: "services/jtype-web/frontend",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
