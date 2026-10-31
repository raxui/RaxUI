// @vitest-environment node
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, expect, it } from "vitest"
import * as sass from "sass"
// @ts-expect-error -- plain ESM CLI module without declaration files
import { npmInvocation, planTooling, SASS_DEPRECATIONS } from "../../src/react-cli/src/tooling.mjs"

const dirs: string[] = []
function project(name: string, content: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "rax-tooling-"))
  dirs.push(dir)
  writeFileSync(path.join(dir, name), content)
  return dir
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

it.each([
  ["vite", "vite.config.ts", "export default defineConfig({ plugins: [react()] })"],
  ["next", "next.config.ts", "const nextConfig: NextConfig = { /* config options here */ };\nexport default nextConfig;"],
])("configures %s template once and preserves other options", (kind, name, content) => {
  const dir = project(name, content)
  const planned = planTooling(dir, kind, [])!
  expect(planned.content).toContain("silenceDeprecations")
  expect(planned.content.includes("legacy-js-api")).toBe(kind === "next")
  expect(planned.content).toContain(kind === "vite" ? "plugins: [react()]" : "turbopack: { root: __dirname }")
  expect(planned.content).not.toContain("process.cwd()")
  writeFileSync(planned.full, planned.content)
  expect(planTooling(dir, kind, [])).toBeNull()
})

it.each([
  ["next.config.mjs", "{}", "import.meta.dirname"],
  ["next.config.js", '{"type":"module"}', "import.meta.dirname"],
  ["next.config.js", "{}", "__dirname"],
])("roots %s (package %s) at the config folder with %s", (name, pkg, root) => {
  const dir = project(name, "const nextConfig = {};\nexport default nextConfig;")
  writeFileSync(path.join(dir, "package.json"), pkg)
  const planned = planTooling(dir, "next", [])!
  expect(planned.content).toContain(`turbopack: { root: ${root} }`)
  expect(planned.content).toContain(`outputFileTracingRoot: ${root},`)
})

it.each([
  ["vite", "vite.config.ts", "export default defineConfig({ css: { devSourcemap: true } })"],
  ["next", "next.config.ts", "const nextConfig = { turbopack: { root: '/workspace' } }; export default nextConfig;"],
])("preserves customized %s config and reports manual setup", (kind, name, content) => {
  const dir = project(name, content)
  const notes: string[] = []
  expect(planTooling(dir, kind, notes)).toBeNull()
  expect(readFileSync(path.join(dir, name), "utf8")).toBe(content)
  expect(notes.join()).toContain("manually")
})

it("runs npm's JavaScript entry through Node on Windows, preserving spaced arguments", () => {
  const dir = project("npm-cli.js", "")
  const args = ["install", "a path with spaces"]
  expect(npmInvocation(args, { platform: "win32", execPath: process.execPath, env: { npm_execpath: path.join(dir, "npm-cli.js") } }))
    .toEqual([process.execPath, [path.join(dir, "npm-cli.js"), ...args]])
  expect(npmInvocation(args, { platform: "linux" })).toEqual(["npm", args])
})

it("compiles Bootstrap without known deprecations while retaining warnings and errors", () => {
  const warnings: string[] = []
  const options = { loadPaths: ["node_modules"], silenceDeprecations: SASS_DEPRECATIONS,
    logger: { warn: (message: string) => warnings.push(message) } }
  sass.compileString('@import "bootstrap/scss/bootstrap"; @warn "consumer warning";', options)
  expect(warnings).toEqual(["consumer warning"])
  expect(() => sass.compileString('@error "consumer error";', options)).toThrow("consumer error")
})
