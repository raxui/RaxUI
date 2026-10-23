// blazorui-react: init and add for React + Vite projects (ADR 006).
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { resolveItems, sha256 } from "./registry.mjs"
import { assertInsideProject, FileBackup } from "./safety.mjs"
import { CONFIG_FILE, findTracked, LOCK_FILE, loadConfig, loadLock, STATE_SCHEMA_VERSION, writeState } from "./state.mjs"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
// Packed CLI carries registry/ and theme/ itself; in the repository they live two levels up.
const registryRoot = existsSync(path.join(packageRoot, "registry/react/index.json")) ? packageRoot : path.resolve(packageRoot, "../..")
export const VERSION = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")).version

const STYLESHEET = "src/styles/blazorui.scss"
const ENTRIES = ["src/main.tsx", "src/main.jsx"]
const BASE_IMPORTS = ['@import "blazorui/variables";', '@import "bootstrap/scss/bootstrap";', '@import "blazorui/core";']
const STYLESHEET_TEMPLATE = `// BlazorUI theme. Set Bootstrap Sass variables above the imports, for example:
// $primary: #0a84ff;
${BASE_IMPORTS.join("\n")}
`

export const USAGE = `blazorui-react ${VERSION}

Usage:
  blazorui-react init [options]
  blazorui-react add <component> [options]

Options:
  --cwd <dir>      Project directory (defaults to the current directory)
  --no-install     Print the npm install command instead of running it
  -v, --version    Print the CLI version
  -h, --help       Show this help
`

export function run(args, { cwd, stdout, stderr }) {
  const positional = []
  let projectDir = cwd
  let install = true
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd" && i + 1 < args.length) projectDir = path.resolve(cwd, args[++i])
    else if (args[i] === "--no-install") install = false
    else positional.push(args[i])
  }

  const [command, name] = positional
  try {
    switch (command) {
      case "-h":
      case "--help":
        stdout.write(USAGE)
        return 0
      case "-v":
      case "--version":
        stdout.write(VERSION + "\n")
        return 0
      case "init":
        return installItems(projectDir, "foundation", { init: true, install, stdout })
      case "add":
        if (!name) throw new Error("Missing component name. Usage: blazorui-react add <component>")
        if (name === "foundation") throw new Error("'foundation' is installed by 'blazorui-react init'.")
        return installItems(projectDir, name, { init: false, install, stdout })
      default:
        stderr.write(`Unknown command '${command ?? ""}'.\n\n${USAGE}`)
        return 1
    }
  } catch (error) {
    stderr.write(`Error: ${error.message}\n`)
    return 1
  }
}

function installItems(projectDir, name, { init, install, stdout }) {
  const project = detectProject(projectDir)
  const config = loadConfig(projectDir, VERSION)
  if (!init && !config) throw new Error(`BlazorUI is not initialized here. Run 'blazorui-react init' first.`)
  const lock = loadLock(projectDir, VERSION)
  const items = resolveItems(registryRoot, name)

  // 1. Plan every write and check every conflict before touching the disk.
  const planned = []
  for (const item of items) {
    for (const file of item.files) {
      const target = `src/${file.target}`
      const full = path.join(projectDir, ...target.split("/"))
      assertInsideProject(projectDir, full)
      const content = rewriteImports(readFileSync(path.join(registryRoot, ...file.source.split("/"))), file)
      const installedHash = sha256(content)
      const tracked = findTracked(lock, target)

      if (tracked && tracked.sourceHash !== file.sha256)
        throw new Error(`'${target}' was installed from another registry release and differs from this CLI's version. Updating installed files is not supported yet.`)
      if (existsSync(full)) {
        if (!tracked) throw new Error(`'${target}' already exists and is not managed by BlazorUI. Refusing to overwrite unknown file.`)
        if (sha256(readFileSync(full)) !== tracked.installedHash)
          throw new Error(`'${target}' was modified locally. Refusing to overwrite modified file.`)
      }
      planned.push({ item, full, target, content, sourceHash: file.sha256, installedHash })
    }
  }

  const stylesheet = planStylesheet(projectDir, items)
  const entry = planEntry(project)
  const packageManifest = path.join(projectDir, "package.json")
  const lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].map((file) => path.join(projectDir, file))

  // 2. Write, keeping originals for rollback; config, then the lock, last.
  const backup = new FileBackup()
  try {
    for (const write of planned) backup.write(write.full, write.content)
    if (stylesheet.content !== null) backup.write(stylesheet.full, stylesheet.content)
    if (entry.content !== null) backup.write(entry.full, entry.content)

    const missing = missingPackages(project.packageJson, items)
    if (missing.length > 0) {
      const command = `npm install --save-exact --ignore-scripts ${missing.join(" ")}`
      const otherManager = lockfiles.slice(1).some((file) => existsSync(file))
      if (install && !otherManager) {
        backup.remember(packageManifest)
        backup.remember(lockfiles[0])
        stdout.write(`Installing ${missing.join(", ")}...\n`)
        const result = spawnSync("npm", ["install", "--save-exact", "--ignore-scripts", "--no-audit", "--no-fund", ...missing], {
          cwd: projectDir,
          stdio: "inherit",
          shell: process.platform === "win32",
        })
        if (result.status !== 0) throw new Error(`'${command}' failed.`)
      } else {
        stdout.write(`Install the required packages:\n  ${command}\n`)
      }
    }

    writeState(backup, projectDir, CONFIG_FILE, {
      schemaVersion: STATE_SCHEMA_VERSION,
      registryVersion: VERSION,
      framework: "react",
      bundler: "vite",
      entry: project.entry,
      stylesheet: STYLESHEET,
    })

    for (const item of items) {
      lock.items[item.name] = {
        version: item.version,
        registryVersion: VERSION,
        manifestSha256: item.manifestSha256,
        files: planned
          .filter((write) => write.item === item)
          .map(({ target, sourceHash, installedHash }) => ({ target, sourceHash, installedHash })),
      }
    }
    lock.registryVersion = VERSION
    writeState(backup, projectDir, LOCK_FILE, lock)
  } catch (error) {
    backup.restore()
    throw error
  }

  stdout.write(`${init ? "BlazorUI initialized" : `Added ${name}`}:\n${planned.map((write) => `  + ${write.target}`).join("\n")}\n`)
  return 0
}

function detectProject(projectDir) {
  const packagePath = path.join(projectDir, "package.json")
  assertInsideProject(projectDir, packagePath)
  if (!existsSync(packagePath)) throw new Error(`No package.json in '${projectDir}'. Run this in your React + Vite project.`)
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"))
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  if (!dependencies.vite || !dependencies.react) throw new Error("Only React + Vite projects are supported: 'react' and 'vite' must be dependencies.")
  const entry = ENTRIES.find((candidate) => existsSync(path.join(projectDir, candidate)))
  if (!entry) throw new Error(`No ${ENTRIES.join(" or ")} found.`)
  assertInsideProject(projectDir, path.join(projectDir, entry))
  return { packageJson, entry, entryPath: path.join(projectDir, entry) }
}

/** Registry sources import the foundation as "@/lib/x"; installed files use relative imports. */
function rewriteImports(bytes, file) {
  if (file.type === "scss") return bytes
  const fromDir = path.posix.dirname(file.target)
  return Buffer.from(
    bytes.toString("utf8").replace(/(["'])@\/lib\/([^"']+)\1/g, (_match, quote, module) => {
      const relative = path.posix.relative(fromDir, `lib/${module}`)
      return quote + (relative.startsWith(".") ? relative : `./${relative}`) + quote
    }),
  )
}

function planStylesheet(projectDir, items) {
  const full = path.join(projectDir, ...STYLESHEET.split("/"))
  assertInsideProject(projectDir, full)
  const original = existsSync(full) ? readFileSync(full, "utf8") : null
  let content = original ?? STYLESHEET_TEMPLATE
  if (/^\s*@use\s/m.test(content) || !BASE_IMPORTS.every((line) => content.includes(line))) {
    throw new Error(
      `'${STYLESHEET}' is customized in a way this CLI does not edit (@use, or missing base imports). Make sure it contains, in order:\n  ${BASE_IMPORTS.join("\n  ")}\nthen one '@import "blazorui/<style>";' line per installed component.`,
    )
  }
  for (const style of items.flatMap((item) => item.styles ?? [])) {
    const line = `@import "blazorui/${style}";`
    if (!content.split(/\r?\n/).some((existing) => existing.trim() === line)) content = content.replace(/\s*$/, `\n${line}\n`)
  }
  return { full, content: content === original ? null : content }
}

function planEntry({ entry, entryPath }) {
  const original = readFileSync(entryPath, "utf8")
  if (/bootstrap(\/dist\/css\/bootstrap(\.min)?\.css|\.min\.css|\.css)/.test(original))
    throw new Error(
      `'${entry}' imports Bootstrap CSS directly. Remove that import: Bootstrap is compiled from SCSS in '${STYLESHEET}'. Then run init again.`,
    )
  if (original.includes("styles/blazorui.scss")) return { full: entryPath, content: null }
  const newline = original.includes("\r\n") ? "\r\n" : "\n"
  // First line, so the app's own CSS (imported later) can override the theme.
  return { full: entryPath, content: `import "./styles/blazorui.scss"${newline}${original}` }
}

function missingPackages(packageJson, items) {
  const present = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const wanted = Object.assign({}, ...items.map((item) => item.packages ?? {}))
  return Object.entries(wanted)
    .filter(([name]) => !(name in present))
    .map(([name, version]) => `${name}@${version}`)
}
