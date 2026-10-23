import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  // Setup scaffolds a Vite app, installs packages, and builds it.
  timeout: 10 * 60 * 1000,
  workers: 1,
  reporter: "list",
  use: { browserName: "chromium", headless: true },
})
