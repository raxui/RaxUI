// Bundles the React registry and shared theme into the package, keeping their repository paths,
// so the packed CLI resolves manifest sources exactly like the repository does.
//   prepack:  node scripts/prepack.mjs           copy registry/react and theme/scss in
//   postpack: node scripts/prepack.mjs --clean   remove them again, so a stale copy never
//             shadows the repository registry when the CLI runs from source
import { cpSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = path.resolve(packageRoot, "../..")

for (const tree of ["registry/react", "theme/scss"]) {
  rmSync(path.join(packageRoot, tree.split("/")[0]), { recursive: true, force: true })
  if (!process.argv.includes("--clean")) cpSync(path.join(repoRoot, tree), path.join(packageRoot, tree), { recursive: true })
}
