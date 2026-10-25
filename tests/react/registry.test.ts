// @vitest-environment node
import { posix } from "node:path"
import { describe, expect, it } from "vitest"

import {
  assertSafeRelative,
  loadIndex,
  loadManifest,
  readSource,
  resolveItems,
  sha256,
  validateManifest,
} from "../../src/react-cli/src/registry.mjs"

const root = "."
const fresh = (name: string) => structuredClone(loadManifest(root, name))

describe("React registry", () => {
  it("has a supported index listing every item", () => {
    const index = loadIndex(root)
    expect(index.schemaVersion).toBe(1)
    expect(index.items.map((item: { name: string }) => item.name)).toEqual(["foundation", "button", "dialog", "confirm-dialog", "dropdown-menu", "field", "form", "form-section", "input", "input-group", "textarea", "checkbox", "radio-group", "switch", "select", "slider", "rating", "starter-react", "starter-next", "date-input", "time-picker", "date-time-input", "date-range-input", "file-upload", "popover", "combobox", "autocomplete", "alert", "badge", "avatar", "card", "skeleton", "spinner", "progress", "table", "timeline", "tabs", "accordion", "breadcrumb", "pagination", "stepper", "toggle", "menu-toggle", "tooltip", "hover-card", "toast", "sheet", "drawer", "context-menu", "command", "calendar"])
  })

  it("has up-to-date hashes for every file (run src/react-cli/scripts/update-hashes.mjs after edits)", () => {
    for (const { name } of loadIndex(root).items) {
      for (const file of loadManifest(root, name).files) {
        expect(file.sha256, file.source).toBe(sha256(readSource(root, file.source)))
      }
    }
  })

  // Apps keep an installed foundation as it was (#41), so a partial's @import must ship with the item
  // itself or with a required item other than the foundation.
  it("ships every partial a component's SCSS imports with that component", () => {
    for (const { name } of loadIndex(root).items) {
      if (name === "foundation") continue
      const items = resolveItems(root, name).filter((item: { name: string }) => item.name !== "foundation")
      const targets = new Set(items.flatMap((item: { files: { target: string }[] }) => item.files.map((file) => file.target)))
      for (const file of loadManifest(root, name).files.filter((f: { type: string }) => f.type === "scss")) {
        const dir = file.target.slice(0, file.target.lastIndexOf("/") + 1)
        for (const [, imported] of readSource(root, file.source).toString("utf8").matchAll(/^\s*@import\s+"([^"]+)"/gm)) {
          const partial = `${dir}_${imported.split("/").pop()}.scss`
          expect(targets.has(partial), `${name}: ${file.target} imports '${imported}'`).toBe(true)
        }
      }
    }
  })

  it.each(["calendar", "date-input", "time-picker", "date-time-input", "date-range-input", "combobox", "autocomplete", "command", "select"])("ships the complete local import closure for %s", name => {
    const items = resolveItems(root, name)
    const files = items.flatMap((item: { files: { target: string; source: string; type: string }[] }) => item.files)
    const targets = new Set(files.map((file: { target: string }) => file.target))
    for (const file of files.filter((file: { type: string }) => file.type === "tsx" || file.type === "ts")) {
      const source = readSource(root, file.source).toString("utf8")
      for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = match[1]
        if (!spec.startsWith("@/") && !spec.startsWith(".")) continue
        const target = spec.startsWith("@/") ? spec.slice(2) : posix.normalize(posix.join(posix.dirname(file.target), spec))
        expect(targets.has(target + ".tsx") || targets.has(target + ".ts"), name + ": " + file.target + " imports " + spec).toBe(true)
      }
    }
  })

  it("resolves button with its foundation first", () => {
    expect(resolveItems(root, "button").map((item: { name: string }) => item.name)).toEqual(["foundation", "button"])
  })

  it("records the manifest digest", () => {
    expect(loadManifest(root, "button").manifestSha256).toBe(sha256(readSource(root, "registry/react/components/button/manifest.json")))
  })

  it("names the available items for an unknown one", () => {
    expect(() => loadManifest(root, "not-a-component")).toThrow(/Available: foundation, button, dialog, confirm-dialog, dropdown-menu, field, form, form-section, input, input-group, textarea, checkbox, radio-group, switch, select, slider, rating, starter-react, starter-next, date-input, time-picker, date-time-input, date-range-input, file-upload, popover, combobox, autocomplete, alert, badge, avatar, card, skeleton, spinner, progress, table, timeline/)
  })

  it.each([
    ["schema version", (m: any) => (m.schemaVersion = 2), /schema version/],
    ["file type", (m: any) => (m.files[0].type = "js"), /unsupported file type/],
    ["target folder", (m: any) => (m.files[0].target = "pages/button.tsx"), /not allowed/],
    ["scss outside styles", (m: any) => (m.files[1].target = "lib/_button.scss"), /not allowed/],
    ["traversal target", (m: any) => (m.files[0].target = "components/ui/../../x.tsx"), /'\.\.'/],
    ["rooted target", (m: any) => (m.files[0].target = "/components/ui/button.tsx"), /relative/],
    ["backslash target", (m: any) => (m.files[0].target = "components\\ui\\button.tsx"), /relative/],
    ["source outside registry", (m: any) => (m.files[0].source = "package.json"), /must be under/],
    ["hash mismatch", (m: any) => (m.files[0].sha256 = "0".repeat(64)), /Integrity check failed/],
    ["missing hash", (m: any) => delete m.files[0].sha256, /SHA-256/],
    ["range package version", (m: any) => (m.packages["@radix-ui/react-slot"] = "^1.5.0"), /exact version/],
    ["unknown requirement", (m: any) => (m.requires = ["missing"]), /unknown item/],
  ])("rejects a manifest with a bad %s", (_label, mutate, message) => {
    const manifest = fresh("button")
    mutate(manifest)
    expect(() => validateManifest(root, manifest)).toThrow(message)
  })

  it.each(["", "a//b", "./a", "C:/a", "a\\b"])("rejects unsafe path %j", (value) => {
    expect(() => assertSafeRelative(value, "Path")).toThrow()
  })
})
