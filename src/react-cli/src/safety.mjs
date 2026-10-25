// Project containment checks shared by planning and durable transaction recovery.
import { lstatSync, realpathSync } from "node:fs"
import path from "node:path"

const sameCase = process.platform !== "win32"
const norm = (value) => (sameCase ? value : value.toLowerCase())
const inside = (root, candidate) => {
  const relative = path.relative(norm(root), norm(candidate))
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

/** Rejects a path outside the project, lexically or through any symlink or junction. */
export function assertInsideProject(projectDir, target) {
  const root = path.resolve(projectDir)
  const full = path.resolve(root, target)
  if (!inside(root, full)) throw new Error(`Path '${full}' escapes the project directory.`)

  const realRoot = realpathSync(root)
  // The deepest existing ancestor (or the path itself) carries every link on the way.
  let existing = full
  while (!exists(existing)) existing = path.dirname(existing)
  let real
  try {
    real = realpathSync(existing)
  } catch {
    throw new Error(`Path '${existing}' is a broken link.`)
  }
  if (!inside(realRoot, real)) throw new Error(`Path '${existing}' escapes the project directory through a link.`)
}

function exists(file) {
  try {
    lstatSync(file)
    return true
  } catch {
    return false
  }
}
