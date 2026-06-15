import { defineConfig } from "@playwright/test";

// Pure-function unit tests — no browser, no dev server. Reuses the already-present
// @playwright/test runner (so we add no new toolchain) to assert that the shared
// TypeScript file-type predicates agree with their Rust counterparts.
export default defineConfig({
  testDir: "tests/unit",
  fullyParallel: true,
  projects: [{ name: "unit" }],
});
