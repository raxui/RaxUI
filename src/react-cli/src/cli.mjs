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
const STARTER = "starter"
const STARTER_APP = "src/App.tsx"

const MIN_VITE_MAJOR = 6 // ADR 010

// SHA-256 of create-vite `react-ts` files (text normalized to LF), per path: create-vite 9 (Vite 8) and
// create-vite 6-8 (Vite 6 and 7), which share one template. The starter replaces App.tsx only when it is
// one of these, and then removes the template files only that App used (ADR 008). public/vite.svg stays:
// the older template's index.html uses it as the favicon.
const VITE_TEMPLATE = {
  "src/App.tsx": [
    "c7184fc9b1c36d7492093e1b5f5844c440bd3396deeace21b6699d3838f6ecb2",
    "5cb2286e66193c18f0943efb0dcecc72278cd3d92c6dd619dc3b73b73e2b9495",
  ],
  "src/App.css": [
    "6e25a776d3e8102da5bacb3cb99f4a5fc662a2e01e6143140671a556d28c3d5c",
    "a0715e0a09edbd0fbde65816a75e0fa0fc8b314c5260c0768c19bf3aac22621a",
  ],
  "src/index.css": [
    "535c25dd1f338486ab3678832fc698011c8b8d1fe4ffd3d0ef5e33181457cc9f",
    "bdba2919116e9b72ac06558f88371dc4c80fb0196da6403d239e0fb085250892",
  ],
  "src/assets/hero.png": ["881ffbcaafc212e49addad08846a5b82761355fa20624253af3477ba33262c5c"],
  "src/assets/react.svg": ["35ef61ed53b323ae94a16a8ec659b3d0af3880698791133f23b084085ab1c2e5"],
  "src/assets/vite.svg": ["5be21acd42eb7b896e517f4e0f0f11eb5c5d9e54fbbcebe9453f033008fcca6f"],
  "public/icons.svg": ["b45fa506195cfcdef406ba9f0c77b36ddc1a7c224040926ec70abc2fdea7b93a"],
}
const VITE_LEFTOVERS = Object.keys(VITE_TEMPLATE).filter((file) => file !== STARTER_APP)
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
        // The starter requires the foundation, so this installs both (ADR 008).
        return installItems(projectDir, STARTER, { init: true, install, stdout })
      case "add":
        if (!name) throw new Error("Missing component name. Usage: blazorui-react add <component>")
        if (name === "foundation" || name === STARTER) throw new Error(`'${name}' is installed by 'blazorui-react init'.`)
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
  const notes = []
  for (const item of items) {
    // Starter files never stop init: what the developer changed is kept and reported (ADR 008).
    const starter = item.name === STARTER
    for (const file of item.files) {
      const target = `src/${file.target}`
      const full = path.join(projectDir, ...target.split("/"))
      assertInsideProject(projectDir, full)
      const content = rewriteImports(readFileSync(path.join(registryRoot, ...file.source.split("/"))), file)
      const installedHash = sha256(content)
      const tracked = findTracked(lock, target)

      if (tracked && tracked.sourceHash !== file.sha256) {
        if (starter) {
          notes.push(`Kept ${target} from an earlier BlazorUI release.`)
          continue
        }
        throw new Error(`'${target}' was installed from another registry release and differs from this CLI's version. Updating installed files is not supported yet.`)
      }
      if (existsSync(full)) {
        if (!tracked && !(starter && isViteTemplate(projectDir, target))) {
          if (!starter) throw new Error(`'${target}' already exists and is not managed by BlazorUI. Refusing to overwrite unknown file.`)
          notes.push(`Kept your ${target} (it differs from the Vite template), so the BlazorUI version was not installed.`)
          continue
        }
        if (tracked && sha256(readFileSync(full)) !== tracked.installedHash) {
          if (starter) continue // edited after init: it is the developer's file now
          throw new Error(`'${target}' was modified locally. Refusing to overwrite modified file.`)
        }
      } else if (starter && tracked) {
        continue // deleted after init on purpose
      }
      planned.push({ item, full, target, content, sourceHash: file.sha256, installedHash })
    }
  }

  // Template files only the template App.tsx used go once the starter App owns the page.
  const deletes = []
  if (planned.some((write) => write.target === STARTER_APP) || findTracked(lock, STARTER_APP)) {
    for (const relative of VITE_LEFTOVERS) {
      const full = path.join(projectDir, ...relative.split("/"))
      assertInsideProject(projectDir, full)
      if (isViteTemplate(projectDir, relative)) deletes.push({ full, relative })
      else if (existsSync(full)) notes.push(`Kept your ${relative} (it differs from the Vite template); remove it if you no longer need it.`)
    }
  }

  const stylesheet = planStylesheet(projectDir, items)
  const entry = planEntry(project, deletes.some((entry) => entry.relative === "src/index.css"))
  const packageManifest = path.join(projectDir, "package.json")
  const lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].map((file) => path.join(projectDir, file))

  // 2. Write, keeping originals for rollback; config, then the lock, last.
  const backup = new FileBackup()
  try {
    for (const write of planned) backup.write(write.full, write.content)
    for (const { full } of deletes) backup.delete(full)
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
      // Keep records of files this run skipped (kept starter files) and replace the ones it wrote.
      const files = new Map((lock.items[item.name]?.files ?? []).map((entry) => [entry.target, entry]))
      for (const { target, sourceHash, installedHash } of planned.filter((write) => write.item === item))
        files.set(target, { target, sourceHash, installedHash })
      if (files.size === 0) continue
      lock.items[item.name] = {
        version: item.version,
        registryVersion: VERSION,
        manifestSha256: item.manifestSha256,
        files: [...files.values()].sort((a, b) => (a.target < b.target ? -1 : a.target > b.target ? 1 : 0)),
      }
    }
    lock.registryVersion = VERSION
    writeState(backup, projectDir, LOCK_FILE, lock)
  } catch (error) {
    backup.restore()
    throw error
  }

  const lines = [
    ...planned.map((write) => `  + ${write.target}`),
    ...deletes.map(({ relative }) => `  - ${relative} (template file)`),
    ...notes.map((note) => `Note: ${note}`),
  ]
  stdout.write(`${init ? "BlazorUI initialized" : `Added ${name}`}:\n${lines.join("\n")}\n`)
  return 0
}

function detectProject(projectDir) {
  const packagePath = path.join(projectDir, "package.json")
  assertInsideProject(projectDir, packagePath)
  if (!existsSync(packagePath)) throw new Error(`No package.json in '${projectDir}'. Run this in your React + Vite project.`)
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"))
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  if (!dependencies.vite || !dependencies.react) throw new Error("Only React + Vite projects are supported: 'react' and 'vite' must be dependencies.")
  const viteMajor = installedMajor(projectDir, "vite") ?? Number(/\d+/.exec(dependencies.vite)?.[0])
  if (!(viteMajor >= MIN_VITE_MAJOR)) throw new Error(`Vite ${MIN_VITE_MAJOR} or later is required; this project uses Vite '${dependencies.vite}'.`)
  const entry = ENTRIES.find((candidate) => existsSync(path.join(projectDir, candidate)))
  if (!entry) throw new Error(`No ${ENTRIES.join(" or ")} found.`)
  assertInsideProject(projectDir, path.join(projectDir, entry))
  return { packageJson, entry, entryPath: path.join(projectDir, entry) }
}

/** Registry sources import "@/lib/x" and "@/components/ui/x"; installed files use relative imports. */
function rewriteImports(bytes, file) {
  if (file.type === "scss") return bytes
  const fromDir = path.posix.dirname(file.target)
  return Buffer.from(
    bytes.toString("utf8").replace(/(["'])@\/((?:lib|components\/ui)\/[^"']+)\1/g, (_match, quote, module) => {
      const relative = path.posix.relative(fromDir, module)
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

function planEntry({ entry, entryPath }, removeIndexCss) {
  const original = readFileSync(entryPath, "utf8")
  if (/bootstrap(\/dist\/css\/bootstrap(\.min)?\.css|\.min\.css|\.css)/.test(original))
    throw new Error(
      `'${entry}' imports Bootstrap CSS directly. Remove that import: Bootstrap is compiled from SCSS in '${STYLESHEET}'. Then run init again.`,
    )
  const newline = original.includes("\r\n") ? "\r\n" : "\n"
  let content = original
  // The template index.css is removed with the other starter leftovers; so is its import.
  if (removeIndexCss) content = content.replace(/^import ['"]\.\/index\.css['"];?\r?\n/m, "")
  // First line, so the app's own CSS (imported later) can override the theme.
  if (!content.includes("styles/blazorui.scss")) content = `import "./styles/blazorui.scss"${newline}${content}`
  return { full: entryPath, content: content === original ? null : content }
}

/** Major version of an installed package, or undefined before `npm install`. */
function installedMajor(projectDir, name) {
  const manifest = path.join(projectDir, "node_modules", ...name.split("/"), "package.json")
  if (!existsSync(manifest)) return undefined
  return Number(String(JSON.parse(readFileSync(manifest, "utf8")).version).split(".")[0])
}

function isViteTemplate(projectDir, relative) {
  const full = path.join(projectDir, ...relative.split("/"))
  if (!existsSync(full) || !VITE_TEMPLATE[relative]) return false
  const bytes = readFileSync(full)
  const normalized = relative.endsWith(".png") ? bytes : Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"))
  return VITE_TEMPLATE[relative].includes(sha256(normalized))
}

function missingPackages(packageJson, items) {
  const present = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const wanted = Object.assign({}, ...items.map((item) => item.packages ?? {}))
  return Object.entries(wanted)
    .filter(([name]) => !(name in present))
    .map(([name, version]) => `${name}@${version}`)
}
