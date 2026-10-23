import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/react/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/react/setup.ts"],
    restoreMocks: true,
  },
})
