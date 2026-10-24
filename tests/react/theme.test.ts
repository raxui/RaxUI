// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { compileTheme } from "./compile-theme"

describe("shared theme", () => {
  const css = compileTheme()

  it.each([
    '[data-sheen-appearance=flat]',
    '[data-sheen-appearance=glass]',
    '[data-bs-theme=dark]',
    '[data-sheen-accent=emerald]',
    '[data-sheen-density=compact]',
  ])("compiles with Bootstrap and contains %s", (selector) => {
    expect(css).toContain(selector)
  })

  it("keeps the Blazor theme CSS in sync with the SCSS (run npm run theme:css after edits)", async () => {
    // @ts-expect-error -- plain ESM build script without type declarations
    const { compileBlazorTheme } = await import("../../theme/build-css.mjs")
    expect(readFileSync("registry/blazor/styles/sheenui.css", "utf8")).toBe(compileBlazorTheme())
  })

  it("re-declares the default surfaces where the mode changes without an appearance", () => {
    expect(css).toMatch(/:where\(\[data-bs-theme\]:not\(\[data-sheen-appearance=flat\] \*, \[data-sheen-appearance=glass\] \*\)\)\s*\{[^}]*--sheen-surface-bg: var\(--bs-body-bg\)/)
  })

  it("shows the button focus ring for keyboard focus only", () => {
    const withButton = compileTheme(['@import "components/button";'])
    expect(withButton).toMatch(/\.btn\.sheen-button:focus:not\(:focus-visible\)\s*\{\s*box-shadow: var\(--sheen-btn-shadow\);/)
  })

  it("keeps Blazor's error bar hidden until blazor.web.js shows it", () => {
    const withStarter = compileTheme(['@import "components/starter";'])
    expect(withStarter).toMatch(/#blazor-error-ui\s*\{\s*display: none;/)
  })

  it("makes glass opaque when the user prefers reduced transparency", () => {
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*--sheen-glass-alpha: 1 !important/)
  })
})
