// sheenui-react: init and add for React projects on Vite 6+ or Next.js 15+ App Router (ADR 006, 010, 011).
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { resolveItems, sha256 } from "./registry.mjs"
import { assertInsideProject, FileBackup } from "./safety.mjs"
import { CONFIG_FILE, findTracked, LOCK_FILE, loadConfig, loadLock, STATE_SCHEMA_VERSION, writeState } from "./state.mjs"
import { npmInvocation, planTooling } from "./tooling.mjs"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
// Packed CLI carries registry/ and theme/ itself; in the repository they live two levels up.
const registryRoot = existsSync(path.join(packageRoot, "registry/react/index.json")) ? packageRoot : path.resolve(packageRoot, "../..")
export const VERSION = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")).version

const STARTER_ITEMS = ["starter", "starter-next"]
const MIN_VITE_MAJOR = 6 // ADR 010
const MIN_NEXT_MAJOR = 15 // ADR 011

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

// SHA-256 of create-next-app 15.x and 16.x files without Tailwind (ADR 011). Keys under app/ are relative to
// the source root (project root, or src/ with --src-dir); public/ is always at the project root.
const NEXT_TEMPLATE = {
  "app/page.tsx": [
    "4d09bbe55512b0eecad21a251893d1f9c74c3bd08af42c4226a126f940fc05c4",
    "8b6f29326d0989b4f8ad8d5bfe990eaa6d0d71654c135639a13283cddcb552dc",
  ],
  "app/page.module.css": [
    "bce0df4eaf83e53bba4426aea15753c02ded184eed40225b0083823ff43f6d9d",
    "165ea66bc56f27938f8b512f2a51ee859be738be78bebf37adb9ec29c52415b3",
  ],
  "app/globals.css": [
    "82c39fcc9632c0daab7c53a8c6c4946c0da049b13a6deb8e67a8548a182c14b4",
    "e1c0289930d17ef10122ec7347f09b03f84e3d51dbbe982785f7316c00e49c08",
  ],
  "public/file.svg": ["2b67812c325c199a02536cdbeea0c593a72f707d323b72ee3e08dbab06753bd4"],
  "public/globe.svg": ["b614b9bf183925957661ac851498fe1d8029fd43a62fbfed86f9e2624a57e7cf"],
  "public/next.svg": ["55995dfad6ecb4945a1e856ddca03c5e16aa5bf13fd21b4df6a74ae79357bcfc"],
  "public/vercel.svg": ["f081337b2fee635b455b63275406a3e7f39d6a014e25ad90dab5a67e62a12ac4"],
  "public/window.svg": ["644768c4aaeb4767bce293344eeb0c125fb804a94d801440424072202d85e3a1"],
}

const baseImports = ({ bootstrapImport }) => ['@import "sheenui/variables";', `@import "${bootstrapImport}";`, '@import "sheenui/core";']
const stylesheetTemplate = (project) => `// SheenUI theme. Set Bootstrap Sass variables above the imports, for example:
// $primary: #0a84ff;
${baseImports(project).join("\n")}
`

export const USAGE = `sheenui-react ${VERSION}

React + Vite 6 or later, or Next.js 15 or later (App Router).

Usage:
  sheenui-react init [options]
  sheenui-react add <component> [options]

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
        // The starter requires the foundation and Button, so this installs all three (ADR 008).
        return installItems(projectDir, null, { init: true, install, stdout })
      case "add":
        if (!name) throw new Error("Missing component name. Usage: sheenui-react add <component>")
        if (name === "foundation" || STARTER_ITEMS.includes(name)) throw new Error(`'${name}' is installed by 'sheenui-react init'.`)
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
  if (["blazorui.react.json", "blazorui.react.lock.json"].some((file) => existsSync(path.join(projectDir, file))))
    throw new Error("This app uses the former BlazorUI registry. SheenUI uses different files and theme APIs. Test in a new app or follow docs/adr/012-sheenui-identity.md; existing files were not changed.")
  const project = detectProject(projectDir)
  const config = loadConfig(projectDir, VERSION)
  if (!init && !config) throw new Error(`SheenUI is not initialized here. Run 'sheenui-react init' first.`)
  const lock = loadLock(projectDir, VERSION)
  const items = resolveItems(registryRoot, name ?? project.starter)

  // 1. Plan every write and check every conflict before touching the disk.
  const planned = []
  const notes = []
  for (const item of items) {
    // Starter files never stop init: what the developer changed is kept and reported (ADR 008).
    const starter = STARTER_ITEMS.includes(item.name)
    for (const file of item.files) {
      const target = project.target(file.target)
      const full = path.join(projectDir, ...target.split("/"))
      assertInsideProject(projectDir, full)
      const content = rewriteImports(readFileSync(path.join(registryRoot, ...file.source.split("/"))), file)
      const installedHash = sha256(content)
      const tracked = findTracked(lock, target)

      if (tracked && tracked.sourceHash !== file.sha256) {
        if (starter) {
          notes.push(`Kept ${target} from an earlier SheenUI release.`)
          continue
        }
        throw new Error(`'${target}' was installed from another registry release and differs from this CLI's version. Updating installed files is not supported yet.`)
      }
      if (existsSync(full)) {
        if (!tracked && !(starter && isTemplate(projectDir, project, target))) {
          if (!starter) throw new Error(`'${target}' already exists and is not managed by SheenUI. Refusing to overwrite unknown file.`)
          notes.push(`Kept your ${target} (it differs from the ${project.label} template), so the SheenUI version was not installed.`)
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

  // Template files only the template page used go once the starter owns that page.
  const deletes = []
  if (planned.some((write) => write.target === project.starterTarget) || findTracked(lock, project.starterTarget)) {
    for (const relative of Object.keys(project.template).filter((file) => file !== project.starterTarget)) {
      const full = path.join(projectDir, ...relative.split("/"))
      assertInsideProject(projectDir, full)
      if (isTemplate(projectDir, project, relative)) deletes.push({ full, relative })
      else if (existsSync(full)) notes.push(`Kept your ${relative} (it differs from the ${project.label} template); remove it if you no longer need it.`)
    }
  }

  const stylesheet = planStylesheet(projectDir, project, items)
  const entry = planEntry(project, deletes.map(({ relative }) => relative))
  const tooling = init ? planTooling(projectDir, project.kind, notes) : null
  const packageManifest = path.join(projectDir, "package.json")
  const lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].map((file) => path.join(projectDir, file))

  // 2. Write, keeping originals for rollback; config, then the lock, last.
  const backup = new FileBackup()
  try {
    for (const write of planned) backup.write(write.full, write.content)
    for (const { full } of deletes) backup.delete(full)
    if (stylesheet.content !== null) backup.write(stylesheet.full, stylesheet.content)
    if (entry.content !== null) backup.write(entry.full, entry.content)
    if (tooling) backup.write(tooling.full, tooling.content)

    const missing = missingPackages(project.packageJson, items)
    if (missing.length > 0) {
      const command = `npm install --save-exact --ignore-scripts ${missing.join(" ")}`
      const otherManager = lockfiles.slice(1).some((file) => existsSync(file))
      if (install && !otherManager) {
        backup.remember(packageManifest)
        backup.remember(lockfiles[0])
        stdout.write(`Installing ${missing.join(", ")}...\n`)
        const [executable, args] = npmInvocation(["install", "--save-exact", "--ignore-scripts", "--no-audit", "--no-fund", ...missing])
        const result = spawnSync(executable, args, {
          cwd: projectDir,
          stdio: "inherit",
          shell: false,
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
      bundler: project.kind,
      entry: project.entry,
      stylesheet: project.stylesheet,
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
    ...(tooling ? [`  ~ ${path.basename(tooling.full)} (Bootstrap Sass compatibility${project.kind === "next" ? ", project root" : ""})`] : []),
    ...deletes.map(({ relative }) => `  - ${relative} (template file)`),
    ...notes.map((note) => `Note: ${note}`),
  ]
  stdout.write(`${init ? "SheenUI initialized" : `Added ${name}`}:\n${lines.join("\n")}\n`)
  return 0
}

/** Describes where things go in a Vite or Next.js project. */
function detectProject(projectDir) {
  const packagePath = path.join(projectDir, "package.json")
  assertInsideProject(projectDir, packagePath)
  if (!existsSync(packagePath)) throw new Error(`No package.json in '${projectDir}'. Run this in your React project.`)
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"))
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  if (!dependencies.react) throw new Error("This is not a React project: 'react' must be a dependency.")

  const project = dependencies.next ? detectNext(projectDir, dependencies) : detectVite(projectDir, dependencies)
  const entryPath = path.join(projectDir, ...project.entry.split("/"))
  assertInsideProject(projectDir, entryPath)
  const prefix = project.sourceRoot ? `${project.sourceRoot}/` : ""
  return { ...project, packageJson, entryPath, target: (relative) => `${prefix}${relative}` }
}

function detectVite(projectDir, dependencies) {
  if (!dependencies.vite) throw new Error("Only React + Vite and Next.js projects are supported: add 'vite' or 'next'.")
  const major = installedMajor(projectDir, "vite") ?? rangeMajor(dependencies.vite)
  if (!(major >= MIN_VITE_MAJOR)) throw new Error(`Vite ${MIN_VITE_MAJOR} or later is required; this project uses Vite '${dependencies.vite}'.`)
  const entry = ["src/main.tsx", "src/main.jsx"].find((candidate) => existsSync(path.join(projectDir, candidate)))
  if (!entry) throw new Error("No src/main.tsx or src/main.jsx found.")
  return {
    kind: "vite",
    label: "Vite",
    sourceRoot: "src",
    entry,
    entryImport: "./styles/sheenui.scss",
    stylesheet: "src/styles/sheenui.scss",
    bootstrapImport: "bootstrap/scss/bootstrap",
    starter: "starter",
    starterTarget: "src/App.tsx",
    template: VITE_TEMPLATE,
  }
}

function detectNext(projectDir, dependencies) {
  const major = installedMajor(projectDir, "next") ?? rangeMajor(dependencies.next)
  if (!(major >= MIN_NEXT_MAJOR)) throw new Error(`Next.js ${MIN_NEXT_MAJOR} or later is required; this project uses Next.js '${dependencies.next}'.`)
  if (usesTailwind(projectDir, dependencies)) {
    throw new Error(
      "Next.js projects that use Tailwind are not supported: Tailwind's base styles conflict with Bootstrap (ADR 011). " +
        "Create the app with 'npx create-next-app@latest --no-tailwind', or remove Tailwind first.",
    )
  }

  const sourceRoot = existsSync(path.join(projectDir, "src", "app")) ? "src" : ""
  const appDir = sourceRoot ? `${sourceRoot}/app` : "app"
  const entry = `${appDir}/layout.tsx`
  if (!existsSync(path.join(projectDir, ...entry.split("/")))) {
    if (["app/layout.jsx", "app/layout.js", "src/app/layout.jsx", "src/app/layout.js"].some((file) => existsSync(path.join(projectDir, file))))
      throw new Error("Next.js projects must use TypeScript: rename app/layout to layout.tsx.")
    if (existsSync(path.join(projectDir, "pages")) || existsSync(path.join(projectDir, "src", "pages")))
      throw new Error("The Next.js Pages Router is not supported; use the App Router (app/layout.tsx).")
    throw new Error("No app/layout.tsx or src/app/layout.tsx found.")
  }

  const template = Object.fromEntries(
    Object.entries(NEXT_TEMPLATE).map(([key, hashes]) => [key.startsWith("app/") && sourceRoot ? `${sourceRoot}/${key}` : key, hashes]),
  )
  const stylesheet = sourceRoot ? `${sourceRoot}/styles/sheenui.scss` : "styles/sheenui.scss"
  return {
    kind: "next",
    label: "Next.js",
    sourceRoot,
    entry,
    entryImport: "../styles/sheenui.scss",
    stylesheet,
    // Next's Sass pipeline cannot follow Bootstrap's own relative imports when it is imported by package
    // name, so the stylesheet imports it by path. shortcut: assumes node_modules at the project root; a
    // hoisted monorepo needs this line adjusted by hand.
    bootstrapImport: path.posix.relative(path.posix.dirname(stylesheet), "node_modules/bootstrap/scss/bootstrap"),
    starter: "starter-next",
    starterTarget: `${appDir}/page.tsx`,
    template,
  }
}

function usesTailwind(projectDir, dependencies) {
  if (dependencies.tailwindcss || dependencies["@tailwindcss/postcss"]) return true
  return ["postcss.config.mjs", "postcss.config.js", "postcss.config.cjs", "postcss.config.ts", ".postcssrc", ".postcssrc.json"].some((file) => {
    const full = path.join(projectDir, file)
    return existsSync(full) && /tailwind/i.test(readFileSync(full, "utf8"))
  })
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

function planStylesheet(projectDir, project, items) {
  const { stylesheet } = project
  const full = path.join(projectDir, ...stylesheet.split("/"))
  assertInsideProject(projectDir, full)
  const original = existsSync(full) ? readFileSync(full, "utf8") : null
  let content = original ?? stylesheetTemplate(project)
  const base = baseImports(project)
  if (/^\s*@use\s/m.test(content) || !base.every((line) => content.includes(line))) {
    throw new Error(
      `'${stylesheet}' is customized in a way this CLI does not edit (@use, or missing base imports). Make sure it contains, in order:\n  ${base.join("\n  ")}\nthen one '@import "sheenui/<style>";' line per installed component.`,
    )
  }
  for (const style of items.flatMap((item) => item.styles ?? [])) {
    const line = `@import "sheenui/${style}";`
    if (!content.split(/\r?\n/).some((existing) => existing.trim() === line)) content = content.replace(/\s*$/, `\n${line}\n`)
  }
  return { full, content: content === original ? null : content }
}

/** Imports the theme stylesheet once from the entry (main.tsx or app/layout.tsx) and drops imports of deleted template CSS. */
function planEntry({ entry, entryPath, entryImport, stylesheet }, deleted) {
  const original = readFileSync(entryPath, "utf8")
  if (/bootstrap(\/dist\/css\/bootstrap(\.min)?\.css|\.min\.css|\.css)/.test(original))
    throw new Error(`'${entry}' imports Bootstrap CSS directly. Remove that import: Bootstrap is compiled from SCSS in '${stylesheet}'. Then run init again.`)
  const newline = original.includes("\r\n") ? "\r\n" : "\n"
  let content = original
  const entryDir = path.posix.dirname(entry)
  for (const relative of deleted.filter((file) => file.endsWith(".css") && path.posix.dirname(file) === entryDir)) {
    const name = path.posix.basename(relative).replace(/\./g, "\\.")
    content = content.replace(new RegExp(`^import ['"]\\./${name}['"];?\\r?\\n`, "m"), "")
  }
  // First line, so the app's own CSS (imported later) can override the theme.
  if (!content.includes("styles/sheenui.scss")) content = `import "${entryImport}"${newline}${content}`
  return { full: entryPath, content: content === original ? null : content }
}

/** Major version of an installed package, or undefined before `npm install`. */
function installedMajor(projectDir, name) {
  const manifest = path.join(projectDir, "node_modules", ...name.split("/"), "package.json")
  if (!existsSync(manifest)) return undefined
  return Number(String(JSON.parse(readFileSync(manifest, "utf8")).version).split(".")[0])
}

const rangeMajor = (range) => Number(/\d+/.exec(range ?? "")?.[0])

function isTemplate(projectDir, { template }, relative) {
  const full = path.join(projectDir, ...relative.split("/"))
  if (!existsSync(full) || !template[relative]) return false
  const bytes = readFileSync(full)
  const normalized = relative.endsWith(".png") ? bytes : Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"))
  return template[relative].includes(sha256(normalized))
}

function missingPackages(packageJson, items) {
  const present = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const wanted = Object.assign({}, ...items.map((item) => item.packages ?? {}))
  return Object.entries(wanted)
    .filter(([name]) => !(name in present))
    .map(([name, version]) => `${name}@${version}`)
}
