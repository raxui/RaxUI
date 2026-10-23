// Bundles the React registry and shared theme into the package, keeping their repository paths,
// so the packed CLI resolves manifest sources exactly like the repository does.
import { cpSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = path.resolve(packageRoot, "../..")

for (const tree of ["registry/react", "theme/scss"]) {
  const top = path.join(packageRoot, tree.split("/")[0])
  rmSync(top, { recursive: true, force: true })
  cpSync(path.join(repoRoot, tree), path.join(packageRoot, tree), { recursive: true })
}
