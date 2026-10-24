// Run after theme:css and any Blazor registry source edit. Hash bytes, including line endings.
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../registry/blazor")
const digest = file => createHash("sha256").update(readFileSync(file)).digest("hex")
for (const relative of ["starter", ...readdirSync(path.join(root, "components")).map(name => `components/${name}`)]) {
  const folder = path.join(root, relative)
  const file = path.join(folder, "manifest.json")
  const manifest = JSON.parse(readFileSync(file, "utf8"))
  for (const entry of manifest.files) entry.sha256 = digest(path.join(folder, entry.source))
  for (const entry of manifest.assets ?? []) entry.sha256 = digest(path.join(root, entry.source))
  writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n")
}
