// Durable, project-local write-ahead journal for init/add. No dependency on registry state.
import { closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import path from "node:path"
import { assertInsideProject } from "./safety.mjs"

export const TRANSACTION_DIR = ".sheenui-react-transaction"
const hash = bytes => bytes === null ? null : createHash("sha256").update(bytes).digest("hex")
const same = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
const present = file => { try { return lstatSync(file) } catch (error) { if (error.code === "ENOENT") return null; throw error } }

function checked(root, relative, metadata = false) {
  if (typeof relative !== "string" || relative.includes("\\") || relative.includes(":") || /[\x00-\x1f]/.test(relative) || relative.split("/").some(p => !p || p === "." || p === ".." || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p) || (!metadata && p.startsWith("."))))
    throw new Error(`Unsafe recovery path '${relative}'.`)
  const full = path.join(root, ...relative.split("/"))
  assertInsideProject(root, full)
  let current = root
  for (const part of relative.split("/")) {
    current = path.join(current, part)
    const stat = present(current)
    if (stat?.isSymbolicLink() || (stat?.isFile() && stat.nlink > 1)) throw new Error(`Recovery refuses linked path '${relative}'.`)
  }
  return full
}

function bytes(root, relative) {
  const full = checked(root, relative)
  const stat = present(full)
  if (stat && !stat.isFile()) throw new Error(`Recovery expected a regular file at '${relative}'.`)
  return stat ? readFileSync(full) : null
}

function syncDir(dir) {
  if (process.platform === "win32") return // Windows does not expose directory fsync through Node.
  const fd = openSync(dir, "r")
  try { fsyncSync(fd) } finally { closeSync(fd) }
}

function durable(file, content, mode = 0o600) {
  const fd = openSync(file, "wx", mode)
  try { writeFileSync(fd, content); fsyncSync(fd) } finally { closeSync(fd) }
}

function persist(root, journal) {
  const next = checked(root, `${TRANSACTION_DIR}/journal.next`, true)
  if (present(next)) unlinkSync(next)
  durable(next, JSON.stringify(journal) + "\n")
  renameSync(next, checked(root, `${TRANSACTION_DIR}/journal.json`, true))
  syncDir(path.join(root, TRANSACTION_DIR))
}

function replace(root, relative, content, mode) {
  const stage = checked(root, `${TRANSACTION_DIR}/write.next`, true)
  if (present(stage)) unlinkSync(stage)
  durable(stage, content, mode)
  renameSync(stage, checked(root, relative))
  syncDir(path.dirname(path.join(root, relative)))
}

function cleanup(root) {
  const dir = checked(root, TRANSACTION_DIR, true)
  const files = readdirSync(dir)
  if (files.some(name => !/^(journal\.json|journal\.next|write\.next|recovery\.lock|before-\d+)$/.test(name)))
    throw new Error(`Unknown files in ${TRANSACTION_DIR}; move them out before retrying. Backups were retained.`)
  // Validate the complete cleanup set first; never recurse or follow a link.
  for (const name of files) {
    const full = checked(root, `${TRANSACTION_DIR}/${name}`, true)
    if (!lstatSync(full).isFile()) throw new Error(`Invalid journal file '${name}'; backups were retained.`)
  }
  for (const name of files.filter(name => name !== "journal.json" && name !== "recovery.lock")) unlinkSync(checked(root, `${TRANSACTION_DIR}/${name}`, true))
  if (files.includes("journal.json")) unlinkSync(checked(root, `${TRANSACTION_DIR}/journal.json`, true))
  if (files.includes("recovery.lock")) unlinkSync(checked(root, `${TRANSACTION_DIR}/recovery.lock`, true))
  rmdirSync(dir)
  syncDir(root)
}

function load(root) {
  const full = checked(root, `${TRANSACTION_DIR}/journal.json`, true)
  if (!present(full) || lstatSync(full).size > 8 * 1024 * 1024) throw new Error("Missing or oversized recovery journal.")
  const j = JSON.parse(readFileSync(full, "utf8"))
  if (j.schemaVersion !== 1 || !same(j.root ?? "", realpathSync(root)) || !Number.isSafeInteger(j.pid) || j.pid <= 0 || !["open", "committed", "recovered"].includes(j.phase) || typeof j.external !== "boolean" || !Array.isArray(j.files) || !Array.isArray(j.dirs))
    throw new Error("Unsupported or invalid recovery journal.")
  const targets = new Set()
  for (const [index, entry] of j.files.entries()) {
    checked(root, entry.target)
    if (targets.has(process.platform === "win32" ? entry.target.toLowerCase() : entry.target) || !Array.isArray(entry.after) || entry.after.some(v => v !== null && !digest(v)) || typeof entry.external !== "boolean" || !Number.isSafeInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o777)
      throw new Error("Invalid recovery file record.")
    targets.add(process.platform === "win32" ? entry.target.toLowerCase() : entry.target)
    if (entry.before !== null) {
      if (!digest(entry.before?.hash) || entry.before?.file !== `before-${index}`) throw new Error("Invalid original backup record.")
      const original = checked(root, `${TRANSACTION_DIR}/${entry.before.file}`, true)
      if (j.phase === "open" && (!present(original)?.isFile() || hash(readFileSync(original)) !== entry.before.hash)) throw new Error(`Original backup for '${entry.target}' is missing or damaged.`)
    }
  }
  for (const dir of j.dirs) {
    checked(root, dir.target)
    if (dir.identity !== null && [dir.identity.dev, dir.identity.ino, dir.identity.birth].some(value => typeof value !== "string" || !/^\d{1,64}$/.test(value))) throw new Error("Invalid directory identity.")
  }
  return j
}

function alive(pid) {
  try { process.kill(pid, 0); return true } catch (error) { if (error.code === "ESRCH") return false; throw new Error(`Cannot establish whether CLI process ${pid} is still running.`) }
}

function rollback(root, j, keepChanges = false) {
  const conflicts = j.files.filter(entry => {
    const current = hash(bytes(root, entry.target))
    return (j.external && entry.external) || (current !== (entry.before?.hash ?? null) && !entry.after.includes(current))
  })
  if ((j.external || conflicts.length) && !keepChanges) {
    const paths = conflicts.map(e => e.target).join(", ")
    throw new Error(`Interrupted installation: recovery stopped without changing files. ${j.external ? "npm was interrupted; stop any remaining npm process first. " : ""}Preserved changed paths: ${paths || "package files"}. Original backups are in ${TRANSACTION_DIR}. Review them, then run 'sheenui-react recover --keep-changes' to retain changed paths and restore the remaining files.`)
  }
  const skip = new Set(conflicts.map(e => e.target))
  for (const entry of [...j.files].reverse()) {
    if (skip.has(entry.target)) continue
    const current = hash(bytes(root, entry.target)), before = entry.before?.hash ?? null
    if (current === before) continue
    if (!entry.after.includes(current)) throw new Error(`'${entry.target}' changed during recovery; backups were retained.`)
    if (entry.before === null) unlinkSync(checked(root, entry.target))
    else replace(root, entry.target, readFileSync(checked(root, `${TRANSACTION_DIR}/${entry.before.file}`, true)), entry.mode)
    syncDir(path.dirname(path.join(root, entry.target)))
  }
  for (const dir of [...j.dirs].reverse()) {
    const full = checked(root, dir.target), stat = present(full) ? lstatSync(full, { bigint: true }) : null
    // An uncertain creation or a replacement directory belongs to the user.
    if (!dir.identity || !stat?.isDirectory() || String(stat.dev) !== dir.identity.dev || String(stat.ino) !== dir.identity.ino || String(stat.birthtimeNs) !== dir.identity.birth) continue
    try { rmdirSync(full) } catch (error) { if (!["ENOTEMPTY", "EEXIST", "ENOENT"].includes(error.code)) throw error }
  }
  return conflicts.map(e => e.target)
}

/** Called before project detection: interrupted config/lock writes must not block recovery. */
export function recoverTransaction(projectDir, { keepChanges = false, stdout = process.stdout } = {}) {
  const root = path.resolve(projectDir)
  if (!present(path.join(root, TRANSACTION_DIR))) return false
  try {
    checked(root, TRANSACTION_DIR, true)
    const j = load(root)
    if (alive(j.pid)) throw new Error(`SheenUI CLI process ${j.pid} is still running; retry after it exits.`)
    const lock = checked(root, `${TRANSACTION_DIR}/recovery.lock`, true)
    if (present(lock)) throw new Error(`Recovery lock exists. After confirming no recovery process is running, remove only ${TRANSACTION_DIR}/recovery.lock and retry.`)
    durable(lock, String(process.pid))
    try {
      const committed = j.phase === "committed"
      const kept = j.phase !== "open" ? [] : rollback(root, j, keepChanges)
      j.phase = committed ? "committed" : "recovered"
      persist(root, j)
      cleanup(root)
      stdout.write(committed ? "Cleaned up a completed SheenUI installation.\n" : `Recovered interrupted SheenUI installation.${kept.length ? ` Kept changed paths: ${kept.join(", ")}.` : ""}\n`)
      return true
    } catch (error) {
      if (present(lock)) unlinkSync(checked(root, `${TRANSACTION_DIR}/recovery.lock`, true))
      throw error
    }
  } catch (error) {
    throw new Error(`${error.message}\nRecovery journal retained at '${path.join(root, TRANSACTION_DIR)}'. Do not delete it before checking its backups (docs/react.md#interrupted-installation-recovery).`)
  }
}

export class FileTransaction {
  #root
  #journal
  constructor(projectDir) {
    this.#root = path.resolve(projectDir)
    const dir = checked(this.#root, TRANSACTION_DIR, true)
    if (present(dir)) throw new Error("Another installation or an interrupted transaction exists; retry recovery first.")
    mkdirSync(dir, { mode: 0o700 })
    syncDir(this.#root)
    this.#journal = { schemaVersion: 1, root: realpathSync(this.#root), pid: process.pid, phase: "open", external: false, files: [], dirs: [] }
    persist(this.#root, this.#journal)
  }

  #remember(file) {
    const target = path.relative(this.#root, file).split(path.sep).join("/")
    checked(this.#root, target)
    let entry = this.#journal.files.find(e => e.target === target)
    if (entry) return entry
    const original = bytes(this.#root, target), index = this.#journal.files.length
    const before = original === null ? null : { file: `before-${index}`, hash: hash(original) }
    if (before) durable(checked(this.#root, `${TRANSACTION_DIR}/${before.file}`, true), original)
    entry = { target, before, mode: original === null ? 0o644 : lstatSync(file).mode & 0o777, after: [], external: false }
    this.#journal.files.push(entry)
    return entry
  }

  write(file, content) {
    const entry = this.#remember(file)
    const expected = hash(Buffer.isBuffer(content) ? content : Buffer.from(content))
    entry.after.push(expected)
    persist(this.#root, this.#journal)
    const parts = entry.target.split("/").slice(0, -1)
    for (let i = 1; i <= parts.length; i++) {
      const target = parts.slice(0, i).join("/"), full = checked(this.#root, target)
      if (present(full)) continue
      const dir = { target, identity: null }
      this.#journal.dirs.push(dir)
      persist(this.#root, this.#journal)
      mkdirSync(full)
      const stat = lstatSync(full, { bigint: true })
      dir.identity = { dev: String(stat.dev), ino: String(stat.ino), birth: String(stat.birthtimeNs) }
      persist(this.#root, this.#journal)
      syncDir(path.dirname(full))
    }
    replace(this.#root, entry.target, Buffer.isBuffer(content) ? content : Buffer.from(content), entry.mode)
  }

  delete(file) {
    const entry = this.#remember(file)
    entry.after.push(null)
    persist(this.#root, this.#journal)
    unlinkSync(checked(this.#root, entry.target))
    syncDir(path.dirname(file))
  }

  beginExternal(files) {
    for (const file of files) this.#remember(file).external = true
    this.#journal.external = true
    persist(this.#root, this.#journal)
  }

  endExternal() {
    for (const entry of this.#journal.files.filter(e => e.external)) entry.after.push(hash(bytes(this.#root, entry.target)))
    this.#journal.external = false
    persist(this.#root, this.#journal)
  }

  restore() {
    rollback(this.#root, this.#journal)
    this.#journal.phase = "recovered"
    persist(this.#root, this.#journal)
    cleanup(this.#root)
  }

  commit() {
    this.#journal.phase = "committed"
    persist(this.#root, this.#journal)
    cleanup(this.#root)
  }
}
