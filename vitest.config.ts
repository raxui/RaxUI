import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Registry sources import the foundation as "@/lib/*", like an installed app.
    alias: {
      "@/components/ui/tooltip": fileURLToPath(new URL("./registry/react/components/tooltip/tooltip.tsx", import.meta.url)),
      "@/components/ui/hover-card": fileURLToPath(new URL("./registry/react/components/hover-card/hover-card.tsx", import.meta.url)),
      "@/components/ui/toast": fileURLToPath(new URL("./registry/react/components/toast/toast.tsx", import.meta.url)),
      "@/components/ui/sheet": fileURLToPath(new URL("./registry/react/components/sheet/sheet.tsx", import.meta.url)),
      "@/components/ui/drawer": fileURLToPath(new URL("./registry/react/components/drawer/drawer.tsx", import.meta.url)),
      "@/components/ui/context-menu": fileURLToPath(new URL("./registry/react/components/context-menu/context-menu.tsx", import.meta.url)),
      "@/components/ui/command": fileURLToPath(new URL("./registry/react/components/command/command.tsx", import.meta.url)),
      "@/components/ui/use-toast": fileURLToPath(new URL("./registry/react/components/toast/use-toast.ts", import.meta.url)),
      "@/components/ui/toaster": fileURLToPath(new URL("./registry/react/components/toast/toaster.tsx", import.meta.url)),
      "@/components/ui/spinner": fileURLToPath(new URL("./registry/react/components/spinner/spinner.tsx", import.meta.url)),

      "@/components/ui/dropdown-menu": fileURLToPath(new URL("./registry/react/components/dropdown-menu/dropdown-menu.tsx", import.meta.url)),
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
