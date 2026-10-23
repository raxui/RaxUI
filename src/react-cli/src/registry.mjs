// Registry access and validation for the React CLI (ADR 006). Mirrors
// EmbeddedRegistry.ValidateManifest in the .NET CLI: everything is checked
// before any file is written.
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"

export const SCHEMA_VERSION = 1

// Registry sources live in these two trees, in the repository and in the packed CLI alike.
const SOURCE_ROOTS = ["registry/react/", "theme/scss/"]
// Allowed target folders (relative to the consumer's src/) per file type.
const TARGETS = {
  tsx: ["lib/", "components/ui/", "App.tsx", "app/page.tsx"], // App.tsx, app/page.tsx: starters (ADR 008, 011)
  ts: ["lib/", "components/ui/"],
  scss: ["styles/blazorui/"],
}
const PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const EXACT_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/
const SHA256 = /^[0-9a-f]{64}$/

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

/** Rejects empty, rooted, backslash, and traversal paths. Registry paths are always forward-slash relative. */
export function assertSafeRelative(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty path.`)
  if (value.includes("\\") || value.startsWith("/") || path.isAbsolute(value) || /^[A-Za-z]:/.test(value))
    throw new Error(`${label} '${value}' must be a relative forward-slash path.`)
  if (value.split("/").some((segment) => segment === ".." || segment === "." || segment === ""))
    throw new Error(`${label} '${value}' contains an empty, '.' or '..' segment.`)
}

export function readSource(root, source) {
  return readFileSync(path.join(root, ...source.split("/")))
}

export function loadIndex(root) {
  const index = JSON.parse(readSource(root, "registry/react/index.json").toString("utf8"))
  if (index.schemaVersion !== SCHEMA_VERSION)
    throw new Error(`Unsupported registry schema version ${index.schemaVersion}. This CLI supports version ${SCHEMA_VERSION}.`)
  if (!Array.isArray(index.items)) throw new Error("Registry index must list items.")
  return index
}

export function loadManifest(root, name) {
  const index = loadIndex(root)
  const item = index.items.find((entry) => entry.name === name)
  if (!item) throw new Error(`Item '${name}' was not found in the registry. Available: ${index.items.map((entry) => entry.name).join(", ")}.`)
  assertSafeRelative(item.manifest, "Manifest path")
  const bytes = readSource(root, item.manifest)
  const manifest = JSON.parse(bytes.toString("utf8"))
  validateManifest(root, manifest, index)
  return { ...manifest, manifestSha256: sha256(bytes) }
}

export function validateManifest(root, manifest, index = loadIndex(root)) {
  const label = `Manifest '${manifest?.name}'`
  if (manifest?.schemaVersion !== SCHEMA_VERSION)
    throw new Error(`${label} has unsupported schema version ${manifest?.schemaVersion}. This CLI supports version ${SCHEMA_VERSION}.`)
  if (typeof manifest.name !== "string" || !EXACT_VERSION.test(manifest.version ?? ""))
    throw new Error(`${label} needs a name and an exact version.`)
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error(`${label} declares no files.`)

  for (const required of manifest.requires ?? []) {
    if (!index.items.some((entry) => entry.name === required)) throw new Error(`${label} requires unknown item '${required}'.`)
  }

  for (const [name, version] of Object.entries(manifest.packages ?? {})) {
    if (!PACKAGE_NAME.test(name) || !EXACT_VERSION.test(version))
      throw new Error(`${label} package '${name}@${version}' must be a valid name with an exact version.`)
  }

  for (const style of manifest.styles ?? []) assertSafeRelative(style, `${label} style`)

  for (const file of manifest.files) {
    assertSafeRelative(file.source, `${label} source`)
    assertSafeRelative(file.target, `${label} target`)
    if (!SOURCE_ROOTS.some((prefix) => file.source.startsWith(prefix)))
      throw new Error(`${label} source '${file.source}' must be under ${SOURCE_ROOTS.join(" or ")}.`)
    const allowed = TARGETS[file.type]
    if (!allowed) throw new Error(`${label} has unsupported file type '${file.type}' for '${file.source}'.`)
    if (!allowed.some((prefix) => file.target.startsWith(prefix)))
      throw new Error(`${label} target '${file.target}' is not allowed for type '${file.type}'.`)
    if (!SHA256.test(file.sha256 ?? "")) throw new Error(`${label} file '${file.source}' needs a SHA-256 hash.`)
    const actual = sha256(readSource(root, file.source))
    if (actual !== file.sha256)
      throw new Error(`Integrity check failed for '${file.source}'. Expected '${file.sha256}', got '${actual}'.`)
  }
}

/** Returns the item and everything it requires, dependencies first, each once. */
export function resolveItems(root, name, visiting = new Set(), resolved = new Map()) {
  if (resolved.has(name)) return [...resolved.values()]
  if (visiting.has(name)) throw new Error(`Circular registry dependency through '${name}'.`)
  visiting.add(name)
  const manifest = loadManifest(root, name)
  for (const required of manifest.requires ?? []) resolveItems(root, required, visiting, resolved)
  visiting.delete(name)
  resolved.set(name, manifest)
  return [...resolved.values()]
}
