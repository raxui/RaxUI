import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Registry sources import the foundation as "@/lib/*", like an installed app.
    alias: {
      "@/lib": fileURLToPath(new URL("./registry/react/foundation", import.meta.url)),
      "@/components/ui/button": fileURLToPath(new URL("./registry/react/button/button.tsx", import.meta.url)),
    },
  },
  test: {
    include: ["tests/react/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/react/setup.ts"],
    restoreMocks: true,
  },
})
