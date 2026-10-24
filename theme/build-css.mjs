// Compiles the shared theme for the Blazor library (ADR 007): theme core plus every component's
// styles, without Bootstrap, which the Blazor template already ships precompiled.
//   node theme/build-css.mjs          writes registry/blazor/styles/sheenui.css
//   node theme/build-css.mjs --check  exits 1 when the committed file is stale
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as sass from "sass"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, "registry/blazor/styles/sheenui.css")
const COMPONENTS = ["button", "dialog", "confirm-dialog", "dropdown-menu", "field", "form-section", "starter", "input", "input-group", "textarea", "checkbox", "radio-group", "switch", "select", "slider", "rating", "date-input", "time-picker", "date-time-input", "date-range-input", "file-upload", "popover", "combobox", "autocomplete"]

export function compileBlazorTheme() {
  const entry = ['@import "core";', ...COMPONENTS.map((name) => `@import "components/${name}";`)].join("\n")
  const css = sass.compileString(entry, {
    loadPaths: [path.join(root, "theme/scss")],
    silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
  }).css
  return `/* Generated from theme/scss by theme/build-css.mjs. Do not edit; change the SCSS and rebuild. */\n${css}\n`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const css = compileBlazorTheme()
  if (process.argv.includes("--check")) {
    if (readFileSync(output, "utf8") !== css) {
      console.error("registry/blazor/styles/sheenui.css is stale. Run: npm run theme:css")
      process.exit(1)
    }
  } else {
    writeFileSync(output, css)
    console.log("wrote registry/blazor/styles/sheenui.css")
  }
}
