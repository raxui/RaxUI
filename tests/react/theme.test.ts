// @vitest-environment node
import { describe, expect, it } from "vitest"

import { compileTheme } from "./compile-theme"

describe("shared theme", () => {
  const css = compileTheme()

  it.each([
    '[data-bui-appearance=flat]',
    '[data-bui-appearance=glass]',
    '[data-bs-theme=dark]',
    '[data-bui-accent=emerald]',
    '[data-bui-density=compact]',
  ])("compiles with Bootstrap and contains %s", (selector) => {
    expect(css).toContain(selector)
  })

  it("makes glass opaque when the user prefers reduced transparency", () => {
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*--bui-glass-alpha: 1 !important/)
  })
})
