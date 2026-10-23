// @vitest-environment node
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { run, VERSION } from "../../src/react-cli/src/cli.mjs"

let root: string
let app: string

const MAIN = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
`
const DEPENDENCIES = {
  react: "18.3.1",
  "react-dom": "18.3.1",
  bootstrap: "5.3.8",
  sass: "1.106.1",
  clsx: "2.1.1",
  "@radix-ui/react-slot": "1.5.0",
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "bui-react-"))
  app = path.join(root, "app")
  mkdirSync(path.join(app, "src"), { recursive: true })
  writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: DEPENDENCIES, devDependencies: { vite: "8.3.5" } }))
  writeFileSync(path.join(app, "src/main.tsx"), MAIN)
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

function cli(...args: string[]) {
  let out = ""
  let err = ""
  const code = run([...args, "--no-install"], {
    cwd: app,
    stdout: { write: (text: string) => (out += text) },
    stderr: { write: (text: string) => (err += text) },
  })
  return { code, out, err }
}

const file = (relative: string) => path.join(app, ...relative.split("/"))
const read = (relative: string) => readFileSync(file(relative), "utf8")
const json = (relative: string) => JSON.parse(read(relative))

function snapshot(dir = root): Record<string, string> {
  const result: Record<string, string> = {}
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = path.join(current, entry)
      if (statSync(full).isDirectory()) walk(full)
      else result[path.relative(dir, full)] = createHash("sha256").update(readFileSync(full)).digest("hex")
    }
  }
  walk(dir)
  return result
}

function ok(result: { code: number; err: string }) {
  expect(result.err).toBe("")
  expect(result.code).toBe(0)
}

describe("blazorui-react init and add button", () => {
  it("installs the foundation and Button with relative imports, one stylesheet, and one entry import", () => {
    ok(cli("init"))
    ok(cli("add", "button"))

    expect(read("src/components/ui/button.tsx")).toContain('from "../../lib/theme"')
    expect(read("src/components/ui/button.tsx")).not.toContain("@/lib")
    expect(existsSync(file("src/lib/utils.ts"))).toBe(true)
    expect(existsSync(file("src/styles/blazorui/_core.scss"))).toBe(true)
    expect(existsSync(file("src/styles/blazorui/components/_button.scss"))).toBe(true)

    const stylesheet = read("src/styles/blazorui.scss")
    expect(stylesheet.indexOf('@import "blazorui/variables";')).toBeLessThan(stylesheet.indexOf('@import "bootstrap/scss/bootstrap";'))
    expect(stylesheet.indexOf('@import "blazorui/core";')).toBeLessThan(stylesheet.indexOf('@import "blazorui/components/button";'))
    expect(read("src/main.tsx").startsWith('import "./styles/blazorui.scss"\n')).toBe(true)

    expect(json("blazorui.react.json")).toMatchObject({ registryVersion: VERSION, framework: "react", bundler: "vite", entry: "src/main.tsx" })
    const button = json("blazorui.react.lock.json").items.button
    const tsx = button.files.find((entry: { target: string }) => entry.target === "src/components/ui/button.tsx")
    expect(tsx.installedHash).not.toBe(tsx.sourceHash) // imports were rewritten
    expect(button.manifestSha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it("changes no bytes when both commands run again", () => {
    ok(cli("init"))
    ok(cli("add", "button"))
    const before = snapshot()
    ok(cli("init"))
    ok(cli("add", "button"))
    expect(snapshot()).toEqual(before)
  })

  it("requires init before add", () => {
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("Run 'blazorui-react init' first") })
  })

  it("rejects projects that are not React + Vite", () => {
    writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: { react: "18.3.1" } }))
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("Only React + Vite") })
  })

  it("refuses to overwrite a locally modified file", () => {
    ok(cli("init"))
    ok(cli("add", "button"))
    writeFileSync(file("src/components/ui/button.tsx"), "// mine")
    const before = snapshot()
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("modified locally") })
    expect(snapshot()).toEqual(before)
  })

  it("refuses to overwrite an unknown file", () => {
    ok(cli("init"))
    mkdirSync(file("src/components/ui"), { recursive: true })
    writeFileSync(file("src/components/ui/button.tsx"), "// not ours")
    const before = snapshot()
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("not managed by BlazorUI") })
    expect(snapshot()).toEqual(before)
  })

  it("does not silently update a file installed from another release", () => {
    ok(cli("init"))
    ok(cli("add", "button"))
    const lock = json("blazorui.react.lock.json")
    lock.items.button.files[0].sourceHash = "0".repeat(64)
    writeFileSync(file("blazorui.react.lock.json"), JSON.stringify(lock))
    const before = snapshot()
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("Updating installed files is not supported yet") })
    expect(snapshot()).toEqual(before)
  })

  it("rejects state written by a newer CLI and accepts an older one", () => {
    ok(cli("init"))
    const lock = json("blazorui.react.lock.json")
    writeFileSync(file("blazorui.react.lock.json"), JSON.stringify({ ...lock, registryVersion: "99.0.0" }))
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("newer than this CLI") })

    writeFileSync(file("blazorui.react.lock.json"), JSON.stringify({ ...lock, registryVersion: "0.0.1" }))
    ok(cli("add", "button"))
    expect(json("blazorui.react.lock.json").registryVersion).toBe(VERSION)
  })

  it("prints manual steps and writes nothing when the entry imports Bootstrap CSS directly", () => {
    writeFileSync(file("src/main.tsx"), `import "bootstrap/dist/css/bootstrap.min.css"\n${MAIN}`)
    const before = snapshot()
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("imports Bootstrap CSS directly") })
    expect(snapshot()).toEqual(before)
  })

  it("does not edit a stylesheet that uses @use", () => {
    mkdirSync(file("src/styles"), { recursive: true })
    writeFileSync(file("src/styles/blazorui.scss"), '@use "bootstrap/scss/bootstrap";\n')
    const before = snapshot()
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("does not edit") })
    expect(snapshot()).toEqual(before)
  })

  it("rolls back files and new folders when a write fails midway", () => {
    ok(cli("init"))
    // A file where the components style folder should be makes the second write fail.
    writeFileSync(file("src/styles/blazorui/components"), "")
    const before = snapshot()
    expect(cli("add", "button").code).toBe(1)
    expect(snapshot()).toEqual(before)
    expect(existsSync(file("src/components"))).toBe(false)
  })

  it("rejects a folder link that escapes the project, and writes nothing outside", () => {
    ok(cli("init"))
    const outside = path.join(root, "outside")
    mkdirSync(outside)
    mkdirSync(file("src/components"))
    symlinkSync(outside, file("src/components/ui"), "junction")
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("escapes the project") })
    expect(readdirSync(outside)).toEqual([])
  })

  it("prints the install command when packages are missing and --no-install is set", () => {
    writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: { react: "18.3.1" }, devDependencies: { vite: "8.3.5" } }))
    const result = cli("init")
    ok(result)
    expect(result.out).toContain("npm install --save-exact --ignore-scripts bootstrap@5.3.8 sass@1.106.1 clsx@2.1.1")
  })
})
