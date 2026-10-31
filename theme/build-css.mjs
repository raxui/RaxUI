// Blazor core and independently compiled component assets (ADR 015).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as sass from "sass"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const header = "/* Generated from theme/scss by theme/build-css.mjs. Do not edit; change the SCSS and rebuild. */\n"
function compile(entry) {
  return header + sass.compileString(entry, {
    loadPaths: [path.join(root, "theme/scss")],
    silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
  }).css.trimEnd() + "\n"
}
export function compileBlazorTheme() {
  // Imports must precede every CSS rule. The CLI edits only this marked list.
  return "/* sheenui:imports:start */\n/* sheenui:imports:end */\n" + compile('@import "core";')
}
export function compileBlazorAssets() {
  const assets = new Map([["registry/blazor/styles/sheenui.css", compileBlazorTheme()]])
  for (const file of readdirSync(path.join(root, "theme/scss/components"))) {
    if (!/^_.+\.scss$/.test(file) || file === "_input-mixins.scss" || file === "_choice-highlight.scss") continue
    const name = file.slice(1, -5)
    const target = name === "starter" ? "registry/blazor/starter/starter.css" : `registry/blazor/styles/components/${name}.css`
    // choice-highlight is folded into popover.css. These partials contain definitions only; runtime tokens are emitted once by core.
    assets.set(target, compile(`@import "variables"; @import "mixins"; @import "components/${name}"; ${name === "popover" ? '@import "components/choice-highlight";' : ""}`))
  }
  return assets
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let stale = false
  for (const [relative, css] of compileBlazorAssets()) {
    const target = path.join(root, relative)
    if (process.argv.includes("--check")) {
      if (!existsSync(target) || readFileSync(target, "utf8") !== css) {
        console.error(`${relative} is stale. Run: npm run theme:css`)
        stale = true
      }
    } else {
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, css)
      console.log(`wrote ${relative}`)
    }
  }
  if (stale) process.exitCode = 1
}
