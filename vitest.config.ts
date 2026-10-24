import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Registry sources import the foundation as "@/lib/*", like an installed app.
    alias: {
      "@/components/ui/popover": fileURLToPath(new URL("./registry/react/components/popover/popover.tsx", import.meta.url)),
      "@/components/ui/input": fileURLToPath(new URL("./registry/react/components/input/input.tsx", import.meta.url)),
      "@/components/ui/field": fileURLToPath(new URL("./registry/react/components/field/field.tsx", import.meta.url)),
      "@/lib": fileURLToPath(new URL("./registry/react/foundation", import.meta.url)),
      "@/components/ui/button": fileURLToPath(new URL("./registry/react/components/button/button.tsx", import.meta.url)),
    },
  },
  test: {
    include: ["tests/react/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/react/setup.ts"],
    restoreMocks: true,
  },
})
