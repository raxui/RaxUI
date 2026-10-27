// Builds the Blazor TextEditor engine from the pinned Tiptap packages in package-lock.json (ADR 020).
// Usage: node scripts/build-text-editor.mjs [--check]. --check rebuilds and fails if the committed file differs.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { rolldown } from "rolldown"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const target = path.join(root, "registry/blazor/components/text-editor/TextEditorContent.razor.js")
const check = process.argv.includes("--check")

const bundle = await rolldown({ input: path.join(root, "scripts/text-editor/entry.mjs"), platform: "browser", logLevel: "warn" })
const { output } = await bundle.generate({ format: "es", minify: true, comments: { legal: false } })
await bundle.close()
const chunk = output.find((o) => o.type === "chunk" && o.isEntry)

// Every bundled package keeps its version and full license text at the top of the file.
const packages = new Map()
for (const id of chunk.moduleIds) {
  const match = id.replaceAll("\\", "/").match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g)
  if (!match) continue
  const name = match.at(-1).slice("node_modules/".length, -1)
  if (packages.has(name)) continue
  const dir = path.join(root, "node_modules", name)
  const meta = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"))
  const file = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "LICENSE-MIT"].map((f) => path.join(dir, f)).find(existsSync)
  if (!file) throw new Error(`No license file for ${name}`)
  packages.set(name, { version: meta.version, license: meta.license, text: readFileSync(file, "utf8").replaceAll("*/", "* /").trim() })
}
const names = [...packages.keys()].sort()
const header = [
  "/*! SheenUI TextEditor engine: Tiptap 3.31.4 and its dependencies, bundled unchanged by scripts/build-text-editor.mjs. Do not edit; rebuild.",
  ...names.map((n) => ` * ${n}@${packages.get(n).version} (${packages.get(n).license})`),
  " */",
  ...names.map((n) => `/*! ${n}@${packages.get(n).version}\n${packages.get(n).text}\n*/`),
].join("\n")
const text = `${header}\n${chunk.code.replace(/\r\n/g, "\n")}`

const sha = createHash("sha256").update(text).digest("hex")
if (check) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : ""
  if (current !== text) { console.error(`TextEditorContent.razor.js is not reproducible from package-lock.json (expected sha256 ${sha}).`); process.exit(1) }
  console.log(`TextEditorContent.razor.js reproduces: ${Buffer.byteLength(text)} bytes, sha256 ${sha}`)
} else {
  writeFileSync(target, text)
  console.log(`wrote ${path.relative(root, target)}: ${Buffer.byteLength(text)} bytes, ${names.length} packages, sha256 ${sha}`)
}
