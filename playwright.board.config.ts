import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.VITE_BOARD_TEST_PORT ?? 19235);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: ["board-swimlanes.spec.ts", "board-react-embed.spec.ts"],
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/tests/fixtures/board-swimlanes.html`,
    // Never attach this suite to an arbitrary dev server already listening on
    // the port: a false green/opaque fixture failure is worse than a clear
    // bind error. Callers can select another port via VITE_BOARD_TEST_PORT.
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
