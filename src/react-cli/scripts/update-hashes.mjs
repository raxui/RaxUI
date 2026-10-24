// Rewrites the sha256 of every file in every React manifest. Run after editing registry or theme sources:
//   node src/react-cli/scripts/update-hashes.mjs
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { loadIndex, readSource, sha256 } from "../src/registry.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")

for (const item of loadIndex(root).items) {
  const folder = ["foundation", "starter-react", "starter-next"].includes(item.name) ? item.name : `components/${item.name}`
  if (item.manifest !== `registry/react/${folder}/manifest.json`) throw new Error(`Unexpected manifest path for ${item.name}`)
  const manifestPath = path.join(root, ...item.manifest.split("/"))
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  for (const file of manifest.files) file.sha256 = sha256(readSource(root, file.source))
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
  console.log(`updated ${item.manifest}`)
}
