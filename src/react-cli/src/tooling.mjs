import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { assertInsideProject } from "./safety.mjs"

// Bootstrap 5 still requires these Sass APIs. Keep all other diagnostics enabled.
export const SASS_DEPRECATIONS = ["import", "global-builtin", "color-functions", "if-function"]

export function npmInvocation(args, { platform = process.platform, env = process.env, execPath = process.execPath } = {}) {
  if (platform !== "win32") return ["npm", args]
  const candidates = [
    env.npm_execpath,
    ...[path.dirname(execPath), ...(env.PATH ?? env.Path ?? "").split(path.delimiter)]
      .map((dir) => path.join(dir, "node_modules/npm/bin/npm-cli.js")),
  ]
  const script = candidates.find((file) => file && path.basename(file) === "npm-cli.js" && existsSync(file))
  if (!script) throw new Error("Cannot locate npm-cli.js. Run with npx, or use --no-install and install the printed packages manually.")
  return [execPath, [script, ...args]]
}

/** Edit only plain template config objects; never guess how to merge custom config code. */
export function planTooling(projectDir, kind, notes) {
  const names = kind === "next" ? ["next.config.ts", "next.config.mjs", "next.config.js"] : ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"]
  const name = names.find((file) => existsSync(path.join(projectDir, file)))
  if (!name) {
    notes.push(`No ${kind} config found; see docs/react.md for Sass compatibility settings.`)
    return null
  }
  const full = path.join(projectDir, name)
  assertInsideProject(projectDir, full)
  const original = readFileSync(full, "utf8")
  if (original.includes("// RaxUI Bootstrap 5 Sass compatibility")) return null
  const stripped = original.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, "")
  const anchor = kind === "next" ? /\bconst\s+nextConfig(?:\s*:\s*NextConfig)?\s*=\s*\{/ : /\bexport\s+default\s+defineConfig\(\s*\{/
  const match = anchor.exec(stripped)
  const unsafe = kind === "next" ? /\b(?:sassOptions|turbopack|outputFileTracingRoot)\s*:|\.\.\./ : /\bcss\s*:|\.\.\./
  if (!match || unsafe.test(stripped) || !anchor.test(original)) {
    notes.push(`Kept customized ${name}; configure Sass compatibility${kind === "next" ? " and turbopack.root" : ""} manually (docs/react.md).`)
    return null
  }
  // Next 15's Turbopack Sass loader still calls the legacy JS API.
  const deprecations = kind === "next" ? [...SASS_DEPRECATIONS, "legacy-js-api"] : SASS_DEPRECATIONS
  const options = `silenceDeprecations: ${JSON.stringify(deprecations)}`
  // The config file's folder, not process.cwd(): builds may run from another directory.
  const root = isEsmConfig(projectDir, name) ? "import.meta.dirname" : "__dirname"
  const settings = kind === "next"
    ? `\n  // RaxUI Bootstrap 5 Sass compatibility; other Sass diagnostics stay enabled.\n  sassOptions: { ${options} },\n  turbopack: { root: ${root} },\n  outputFileTracingRoot: ${root},\n`
    : `\n  // RaxUI Bootstrap 5 Sass compatibility; other Sass diagnostics stay enabled.\n  css: { preprocessorOptions: { scss: { ${options} } } },\n`
  return { full, content: original.replace(anchor, (start) => start + settings) }
}

// Next compiles next.config.ts to CommonJS, so only .mjs and type-module .js run as ES modules.
function isEsmConfig(projectDir, name) {
  if (name.endsWith(".mjs")) return true
  if (!name.endsWith(".js")) return false
  try { return JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8")).type === "module" } catch { return false }
}
