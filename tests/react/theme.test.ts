// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { compileTheme } from "./compile-theme"

describe("shared theme", () => {
  const css = compileTheme()

  it.each([
    '[data-rax-appearance=flat]',
    '[data-rax-appearance=glass]',
    '[data-bs-theme=dark]',
    '[data-rax-accent=emerald]',
    '[data-rax-density=compact]',
  ])("compiles with Bootstrap and contains %s", (selector) => {
    expect(css).toContain(selector)
  })

  it("keeps the Blazor theme CSS in sync with the SCSS (run npm run theme:css after edits)", async () => {
    // @ts-expect-error -- plain ESM build script without type declarations
    const { compileBlazorTheme } = await import("../../theme/build-css.mjs")
    expect(readFileSync("registry/blazor/styles/raxui.css", "utf8")).toBe(compileBlazorTheme())
  })

  it("builds every Blazor asset independently without duplicating core rules", async () => {
    // @ts-expect-error -- plain ESM build script without type declarations
    const { compileBlazorAssets } = await import("../../theme/build-css.mjs")
    const assets: Map<string, string> = compileBlazorAssets()
    for (const [file, css] of assets) {
      expect(readFileSync(file, "utf8"), file).toBe(css)
      if (file.endsWith("/raxui.css")) {
        expect(css).not.toContain(".rax-button")
        expect(css).not.toContain(".rax-dialog")
      } else {
        expect(css, file).not.toContain("--rax-font-sans:")
        expect(css, file).not.toContain(".glass-ultrathin")
      }
    }
    expect(assets.has("registry/blazor/starter/starter.css")).toBe(true)
    expect(assets.has("registry/blazor/styles/components/input-mixins.css")).toBe(false)
  })

  it("re-declares the default surfaces where the mode changes without an appearance", () => {
    expect(css).toMatch(/:where\(\[data-bs-theme\]:not\(\[data-rax-appearance=flat\] \*, \[data-rax-appearance=glass\] \*\)\)\s*\{[^}]*--rax-surface-bg: var\(--bs-body-bg\)/)
  })

  it("shows the button focus ring for keyboard focus only", () => {
    const withButton = compileTheme(['@import "components/button";'])
    expect(withButton).toMatch(/\.btn\.rax-button:focus:not\(:focus-visible\)\s*\{\s*box-shadow: var\(--rax-btn-shadow\);/)
  })

  it("sizes SVG and font icons with two classes to outrank Blazicons", () => {
    const withInput = compileTheme(['@import "components/input";'])
    expect(withInput).toMatch(/\.rax-input-group \.rax-input-slot :is\(svg, i\)\s*\{[^}]*width: 1.125rem;[^}]*font-size: 1.125rem;[^}]*color: currentColor;/)
  })

  it.each(["input", "input-group", "textarea", "checkbox", "radio-group", "switch", "select", "slider", "rating"])("compiles %s independently of other component imports", name => {
    expect(compileTheme([`@import "components/${name}";`])).toContain(".rax-")
  })

  it("keeps Blazor's error bar hidden until blazor.web.js shows it", () => {
    const withStarter = compileTheme(['@import "components/starter";'])
    expect(withStarter).toMatch(/#blazor-error-ui\s*\{\s*display: none;/)
  })

  it("resets letter-spacing for Arabic-script languages, whose letters join", () => {
    expect(css).toContain(":is(:lang(ar), :lang(fa), :lang(ur), :lang(ps), :lang(ckb)) {\n  letter-spacing: 0 !important;\n}")
  })

  it("makes glass opaque when the user prefers reduced transparency", () => {
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*--rax-glass-alpha: 1 !important/)
  })

  it("draws the opt-in glass sheen behind content and drops it for reduced transparency", () => {
    expect(css).toMatch(/\.glass-sheen::after\s*\{[^}]*z-index: -1;/)
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)\s*\{\s*\.glass-sheen::after\s*\{\s*display: none;/)
  })
})

it("ships the approved overlay defaults and per-panel material bindings", () => {
  const css = compileTheme(['@import "components/dialog";', '@import "components/confirm-dialog";', '@import "components/sheet";', '@import "components/drawer";', '@import "components/input";'])
  for (const declaration of ["--rax-dialog-alpha: 0.5", "--rax-sheet-alpha: 0.7", "--rax-drawer-alpha: 0.8", "--rax-dialog-overlay-alpha: 0.25", "--rax-sheet-overlay-alpha: 0.25", "--rax-drawer-overlay-alpha: 0.25", "--rax-dialog-blur: 32px", "--rax-sheet-overlay-blur: 4px", "--rax-drawer-overlay-blur: 4px", "--rax-field-border: rgba(var(--bs-emphasis-color-rgb), 0.22)"]) expect(css).toContain(declaration)
  for (const name of ["dialog", "sheet", "drawer"]) {
    expect(css).toContain('background-color: var(--rax-' + name + '-bg)')
    expect(css).toContain('blur(var(--rax-' + name + '-overlay-blur, 4px))')
  }
})

it("keeps the starter canvas solid in both modes", () => {
  const css = compileTheme(['@import "components/starter";'])
  expect(css).not.toContain("radial-gradient(")
  expect(css).toContain("background-color: var(--rax-page-bg, #fff)")
  expect(css).toContain("background-color: var(--rax-page-bg, #000)")
})


it("keeps time wheel end gaps in scrollable flow, including reduced motion", () => {
  const css = compileTheme(['@import "components/time-picker";'])
  expect(css).toContain(".rax-wheel-list::before, .rax-wheel-list::after")
  expect(css).toContain("height: calc(var(--rax-wheel-item) * (var(--rax-wheel-visible) - 1) / 2)")
  expect(css).toMatch(/\.rax-wheel-list \{[^}]*padding-block: 0;/)
})
