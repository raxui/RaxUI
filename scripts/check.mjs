// Local validation entry point. Run acceptance suites sequentially: each packs the same CLI.
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { npmInvocation } from "../src/react-cli/src/tooling.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
if (args.some((arg) => arg !== "--full") || args.length > 1) {
  console.error("Usage: npm run check | npm run check:full")
  process.exit(2)
}
if (!existsSync(path.join(root, "node_modules/typescript/package.json"))) {
  console.error("Install the repository dependencies first: npm ci")
  process.exit(1)
}

const full = args.includes("--full")
const started = Date.now()
function run(label, command, args, env = {}) {
  console.log(`\n[check] ${label}`)
  const result = spawnSync(command, args, {
    cwd: root, stdio: "inherit", shell: false, env: { ...process.env, ...env },
  })
  if (result.error || result.status !== 0) {
    console.error(`[check] FAILED: ${label}${result.error ? `: ${result.error.message}` : ""}`)
    process.exit(result.status && result.status > 0 ? result.status : 1)
  }
}
function npm(label, args, env = {}) {
  const [command, argv] = npmInvocation(args)
  run(label, command, argv, env)
}

// Registry paths and byte-level line endings are part of the manifest contract.
const reactEntries = readdirSync(path.join(root, "registry/react")).sort()
if (JSON.stringify(reactEntries) !== JSON.stringify(["components", "foundation", "index.json", "starter-next", "starter-react"]))
  throw new Error("Unexpected React registry layout (ADR 015).")
function checkLf(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name)
    if (entry.isDirectory()) checkLf(file)
    else if (readFileSync(file).includes(13)) throw new Error(`CR byte in ${file}; registry and theme require LF.`)
  }
}
for (const tree of ["registry", "theme"]) checkLf(path.join(root, tree))

run("Shared CSS is current", process.execPath, ["theme/build-css.mjs", "--check"])
npm("TypeScript", ["run", "typecheck"])
npm("React, CLI, registry, and theme tests", ["test"])
npm("React CLI crash/restart recovery", ["run", "test:recovery"])
run("Build .NET 8/9/10", "dotnet", ["build", "SheenUI.slnx", "-c", "Release"])
run("C# formatting", "dotnet", ["format", "SheenUI.slnx", "--verify-no-changes", "--no-restore"])

if (full) {
  run("Install Blazor test browser", "pwsh", ["-NoProfile", "-File", "tests/SheenUI.Integration.Tests/bin/Release/net10.0/playwright.ps1", "install", "chromium"])
  npm("Install React test browser", ["exec", "--", "playwright", "install", "chromium"])
}

run(full ? "All .NET tests and real Blazor apps" : ".NET tests without browser E2E", "dotnet", [
  "test", "SheenUI.slnx", "-c", "Release", "--no-build",
  ...(!full ? ["--filter", "Category!=E2E"] : []),
])

if (full) {
  run("Pack .NET CLI locally", "dotnet", ["pack", "src/SheenUI.Cli/SheenUI.Cli.csproj", "-c", "Release", "--no-build", "-o", "nupkg"])
  for (const version of ["6.5.0", "7.1.3", "9.3.1"])
    npm(`Vite acceptance: create-vite ${version}`, ["run", "test:acceptance"], { CREATE_VITE_VERSION: version })
  for (const version of ["15.5.28", "16.4.3"])
    npm(`Next.js acceptance: create-next-app ${version}`, ["run", "test:acceptance:next"], { CREATE_NEXT_APP_VERSION: version })
}

run("Diff whitespace", "git", ["diff", "--check"])
console.log(`\n[check] PASS (${full ? "full" : "quick"}, ${Math.round((Date.now() - started) / 1000)}s). Nothing was published.`)
