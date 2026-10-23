// Path safety and rollback, mirroring ProjectPath and FileBackup in the .NET CLI (ADR 003).
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmdirSync, rmSync, writeFileSync } from "node:fs"
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

/** Writes files while remembering their original bytes; restore() undoes everything (ADR 003). */
export class FileBackup {
  #originals = new Map()
  #createdDirs = []

  remember(file) {
    if (!this.#originals.has(file)) this.#originals.set(file, existsSync(file) ? readFileSync(file) : null)
  }

  write(file, content) {
    this.remember(file)
    const missing = []
    for (let dir = path.dirname(file); !existsSync(dir); dir = path.dirname(dir)) missing.unshift(dir)
    for (const dir of missing) {
      mkdirSync(dir)
      this.#createdDirs.push(dir)
    }
    writeFileSync(file, content)
  }

  delete(file) {
    this.remember(file)
    rmSync(file)
  }

  restore() {
    for (const [file, original] of this.#originals) {
      try {
        if (original === null) rmSync(file, { force: true })
        else writeFileSync(file, original)
      } catch {
        // Best effort: keep restoring the remaining files.
      }
    }
    for (const dir of [...this.#createdDirs].reverse()) {
      try {
        rmdirSync(dir) // non-recursive: keeps anything another process added
      } catch {
        // Not empty or already gone.
      }
    }
  }
}
