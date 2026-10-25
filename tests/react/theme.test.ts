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

  it("builds every Blazor asset independently without duplicating core rules", async () => {
    // @ts-expect-error -- plain ESM build script without type declarations
    const { compileBlazorAssets } = await import("../../theme/build-css.mjs")
    const assets: Map<string, string> = compileBlazorAssets()
    for (const [file, css] of assets) {
      expect(readFileSync(file, "utf8"), file).toBe(css)
      if (file.endsWith("/sheenui.css")) {
        expect(css).not.toContain(".sheen-button")
        expect(css).not.toContain(".sheen-dialog")
      } else {
        expect(css, file).not.toContain("--sheen-font-sans:")
        expect(css, file).not.toContain(".glass-ultrathin")
      }
    }
    expect(assets.has("registry/blazor/starter/starter.css")).toBe(true)
    expect(assets.has("registry/blazor/styles/components/input-mixins.css")).toBe(false)
  })

  it("re-declares the default surfaces where the mode changes without an appearance", () => {
    expect(css).toMatch(/:where\(\[data-bs-theme\]:not\(\[data-sheen-appearance=flat\] \*, \[data-sheen-appearance=glass\] \*\)\)\s*\{[^}]*--sheen-surface-bg: var\(--bs-body-bg\)/)
  })

  it("shows the button focus ring for keyboard focus only", () => {
    const withButton = compileTheme(['@import "components/button";'])
    expect(withButton).toMatch(/\.btn\.sheen-button:focus:not\(:focus-visible\)\s*\{\s*box-shadow: var\(--sheen-btn-shadow\);/)
  })

  it("sizes SVG and font icons with two classes to outrank Blazicons", () => {
    const withInput = compileTheme(['@import "components/input";'])
    expect(withInput).toMatch(/\.sheen-input-group \.sheen-input-slot :is\(svg, i\)\s*\{[^}]*width: 1.125rem;[^}]*font-size: 1.125rem;[^}]*color: currentColor;/)
  })

  it.each(["input", "input-group", "textarea", "checkbox", "radio-group", "switch", "select", "slider", "rating"])("compiles %s independently of other component imports", name => {
    expect(compileTheme([`@import "components/${name}";`])).toContain(".sheen-")
  })

  it("keeps Blazor's error bar hidden until blazor.web.js shows it", () => {
    const withStarter = compileTheme(['@import "components/starter";'])
    expect(withStarter).toMatch(/#blazor-error-ui\s*\{\s*display: none;/)
  })

  it("makes glass opaque when the user prefers reduced transparency", () => {
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*--sheen-glass-alpha: 1 !important/)
  })
})

it("ships the approved overlay defaults and per-panel material bindings", () => {
  const css = compileTheme(['@import "components/dialog";', '@import "components/confirm-dialog";', '@import "components/sheet";', '@import "components/drawer";', '@import "components/input";'])
  for (const declaration of ["--sheen-dialog-alpha: 0.6", "--sheen-sheet-alpha: 0.55", "--sheen-drawer-alpha: 0.6", "--sheen-dialog-overlay-alpha: 0.25", "--sheen-sheet-overlay-alpha: 0.25", "--sheen-drawer-overlay-alpha: 0.25", "--sheen-dialog-blur: 32px", "--sheen-sheet-overlay-blur: 4px", "--sheen-drawer-overlay-blur: 4px", "--sheen-field-border: rgba(var(--bs-emphasis-color-rgb), 0.22)"]) expect(css).toContain(declaration)
  for (const name of ["dialog", "sheet", "drawer"]) {
    expect(css).toContain('background-color: var(--sheen-' + name + '-bg)')
    expect(css).toContain('blur(var(--sheen-' + name + '-overlay-blur, 4px))')
  }
})

it("keeps the starter canvas solid in both modes", () => {
  const css = compileTheme(['@import "components/starter";'])
  expect(css).not.toContain("radial-gradient(")
  expect(css).toContain("background-color: var(--sheen-page-bg, #fff)")
  expect(css).toContain("background-color: var(--sheen-page-bg, #000)")
})


it("keeps time wheel end gaps in scrollable flow, including reduced motion", () => {
  const css = compileTheme(['@import "components/time-picker";'])
  expect(css).toContain(".sheen-wheel-list::before, .sheen-wheel-list::after")
  expect(css).toContain("height: calc(var(--sheen-wheel-item) * (var(--sheen-wheel-visible) - 1) / 2)")
  expect(css).toMatch(/\.sheen-wheel-list \{[^}]*padding-block: 0;/)
})
