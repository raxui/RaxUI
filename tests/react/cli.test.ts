// @vitest-environment node
import { execFileSync } from "node:child_process"
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
  root = mkdtempSync(path.join(tmpdir(), "rax-react-"))
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

const VITE_9_FILES = ["src/App.tsx", "src/App.css", "src/index.css", "src/assets/hero.png", "src/assets/react.svg", "src/assets/vite.svg", "public/icons.svg"]
const VITE_CLASSIC_FILES = ["src/App.tsx", "src/App.css", "src/index.css", "src/assets/react.svg", "public/vite.svg"]

/**
 * Copies template files the starter knows into the fake app; returns their paths. Fixtures: create-vite 9.3.1
 * (`vite-react-ts`) and create-vite 6.5.0, whose template 7.x and 8.x share (`vite-react-ts-classic`).
 */
function createViteTemplateFiles(fixtureName = "vite-react-ts", files = VITE_9_FILES) {
  const fixture = path.resolve("tests/react/fixtures", fixtureName)
  const copied: Record<string, true> = {}
  for (const relative of files) {
    mkdirSync(path.dirname(file(relative)), { recursive: true })
    writeFileSync(file(relative), readFileSync(path.join(fixture, relative)))
    copied[relative] = true
  }
  return copied
}
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

it.each(["blazorui.react.json", "blazorui.react.lock.json", "sheenui.react.json", "sheenui.react.lock.json"])("preserves former identity state %s and refuses initialization", (legacyFile) => {
  writeFileSync(file(legacyFile), "original state")
  const before = snapshot()
  expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("former BlazorUI or SheenUI registry") })
  expect(snapshot()).toEqual(before)
  expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("former BlazorUI or SheenUI registry") })
  expect(snapshot()).toEqual(before)
})

describe("raxui-react init and add button", () => {
  it("installs the foundation and Button with relative imports, one stylesheet, and one entry import", () => {
    ok(cli("init"))
    ok(cli("add", "button"))

    expect(read("src/components/ui/button.tsx")).toContain('from "../../lib/theme"')
    expect(read("src/components/ui/button.tsx")).not.toContain("@/lib")
    expect(existsSync(file("src/lib/utils.ts"))).toBe(true)
    expect(existsSync(file("src/styles/raxui/_core.scss"))).toBe(true)
    expect(existsSync(file("src/styles/raxui/components/_button.scss"))).toBe(true)

    const stylesheet = read("src/styles/raxui.scss")
    expect(stylesheet.indexOf('@import "raxui/variables";')).toBeLessThan(stylesheet.indexOf('@import "bootstrap/scss/bootstrap";'))
    expect(stylesheet.indexOf('@import "raxui/core";')).toBeLessThan(stylesheet.indexOf('@import "raxui/components/button";'))
    expect(read("src/main.tsx").startsWith('import "./styles/raxui.scss"\n')).toBe(true)

    expect(json("raxui.react.json")).toMatchObject({ registryVersion: VERSION, framework: "react", bundler: "vite", entry: "src/main.tsx" })
    const button = json("raxui.react.lock.json").items.button
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
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("Run 'raxui-react init' first") })
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

  it("keeps an installed dependency as it is, local edits included", () => {
    ok(cli("init"))
    writeFileSync(file("src/lib/theme.tsx"), "// my theme")
    const foundation = json("raxui.react.lock.json").items.foundation
    ok(cli("add", "dialog")) // dialog requires the foundation
    expect(readFileSync(file("src/lib/theme.tsx"), "utf8")).toBe("// my theme")
    expect(existsSync(file("src/components/ui/dialog.tsx"))).toBe(true)
    expect(json("raxui.react.lock.json").items.foundation).toEqual(foundation)
  })

  it("refuses to overwrite an unknown file", () => {
    mkdirSync(file("src/components/ui"), { recursive: true })
    writeFileSync(file("src/components/ui/button.tsx"), "// not ours")
    const before = snapshot()
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("not managed by RaxUI") })
    expect(snapshot()).toEqual(before)
  })

  it("does not silently update a file installed from another release", () => {
    ok(cli("init"))
    ok(cli("add", "button"))
    const lock = json("raxui.react.lock.json")
    lock.items.button.files[0].sourceHash = "0".repeat(64)
    writeFileSync(file("raxui.react.lock.json"), JSON.stringify(lock))
    const before = snapshot()
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("Updating installed files is not supported yet") })
    expect(snapshot()).toEqual(before)
  })

  it("rejects state written by a newer CLI and accepts an older one", () => {
    ok(cli("init"))
    const lock = json("raxui.react.lock.json")
    writeFileSync(file("raxui.react.lock.json"), JSON.stringify({ ...lock, registryVersion: "99.0.0" }))
    expect(cli("add", "button")).toMatchObject({ code: 1, err: expect.stringContaining("newer than this CLI") })

    writeFileSync(file("raxui.react.lock.json"), JSON.stringify({ ...lock, registryVersion: "0.0.1" }))
    ok(cli("add", "button"))
    expect(json("raxui.react.lock.json").registryVersion).toBe(VERSION)
  })

  it("prints manual steps and writes nothing when the entry imports Bootstrap CSS directly", () => {
    writeFileSync(file("src/main.tsx"), `import "bootstrap/dist/css/bootstrap.min.css"\n${MAIN}`)
    const before = snapshot()
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("imports Bootstrap CSS directly") })
    expect(snapshot()).toEqual(before)
  })

  it("does not edit a stylesheet that uses @use", () => {
    mkdirSync(file("src/styles"), { recursive: true })
    writeFileSync(file("src/styles/raxui.scss"), '@use "bootstrap/scss/bootstrap";\n')
    const before = snapshot()
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("does not edit") })
    expect(snapshot()).toEqual(before)
  })

  it("rolls back files and new folders when a write fails midway", () => {
    // A file where the components style folder should be lets the first writes succeed, then fails.
    mkdirSync(file("src/styles/raxui"), { recursive: true })
    writeFileSync(file("src/styles/raxui/components"), "")
    const before = snapshot()
    expect(cli("init").code).toBe(1)
    expect(snapshot()).toEqual(before)
    expect(existsSync(file("src/lib"))).toBe(false)
    expect(existsSync(file("src/components"))).toBe(false)
  })

  it("rejects a folder link that escapes the project, and writes nothing outside", () => {
    const outside = path.join(root, "outside")
    mkdirSync(outside)
    mkdirSync(file("src/components"))
    symlinkSync(outside, file("src/components/ui"), "junction")
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("escapes the project") })
    expect(readdirSync(outside)).toEqual([])
  })

  it("replaces the unmodified Vite template App with the starter and removes its leftovers", () => {
    const template = createViteTemplateFiles()
    ok(cli("init"))

    expect(read("src/App.tsx")).toContain("Welcome to your RaxUI app")
    expect(read("src/App.tsx")).toContain('from "./lib/theme"')
    for (const leftover of Object.keys(template).filter((name) => name !== "src/App.tsx")) {
      expect(existsSync(file(leftover)), leftover).toBe(false)
    }
    expect(read("src/main.tsx")).not.toContain("./index.css")
    expect(read("src/styles/raxui.scss")).toContain('@import "raxui/components/starter";')
    expect(json("raxui.react.lock.json").items["starter-react"].files.map((entry: { target: string }) => entry.target)).toContain("src/App.tsx")

    const before = snapshot()
    ok(cli("init"))
    expect(snapshot()).toEqual(before)
  })

  it("replaces the create-vite 6-8 template App and keeps public/vite.svg, the favicon", () => {
    createViteTemplateFiles("vite-react-ts-classic", VITE_CLASSIC_FILES)
    ok(cli("init"))

    expect(read("src/App.tsx")).toContain("Welcome to your RaxUI app")
    for (const leftover of ["src/App.css", "src/index.css", "src/assets/react.svg"]) {
      expect(existsSync(file(leftover)), leftover).toBe(false)
    }
    expect(existsSync(file("public/vite.svg"))).toBe(true)
    expect(read("src/main.tsx")).not.toContain("./index.css")
  })

  it.each([
    ["^5.4.10", undefined],
    ["^6.0.0", "5.4.10"], // the installed version wins over the range
  ])("rejects Vite older than 6 (range %s, installed %s)", (range, installed) => {
    writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: DEPENDENCIES, devDependencies: { vite: range } }))
    if (installed) {
      mkdirSync(file("node_modules/vite"), { recursive: true })
      writeFileSync(file("node_modules/vite/package.json"), JSON.stringify({ version: installed }))
    }
    expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("Vite 6 or later is required") })
  })

  it("keeps a changed App.tsx and the files it may use, and says so", () => {
    createViteTemplateFiles()
    writeFileSync(file("src/App.tsx"), "export default function App() { return <h1>Mine</h1> }\n")
    const result = cli("init")
    ok(result)

    expect(read("src/App.tsx")).toContain("Mine")
    expect(existsSync(file("src/index.css"))).toBe(true)
    expect(read("src/main.tsx")).toContain("./index.css")
    expect(result.out).toContain("Kept your src/App.tsx")
  })

  describe("Next.js (App Router)", () => {
    const NEXT_FILES = ["app/layout.tsx", "app/page.tsx", "app/page.module.css", "app/globals.css", "public/file.svg", "public/globe.svg", "public/next.svg", "public/vercel.svg", "public/window.svg"]

    /** A create-next-app 16 project without Tailwind, optionally with --src-dir. */
    function createNextApp({ srcDir = false, dependencies = {} as Record<string, string> } = {}) {
      rmSync(file("src"), { recursive: true, force: true })
      writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: { ...DEPENDENCIES, next: "16.4.3", ...dependencies } }))
      const fixture = path.resolve("tests/react/fixtures/next-app")
      for (const relative of NEXT_FILES) {
        const target = srcDir && relative.startsWith("app/") ? `src/${relative}` : relative
        mkdirSync(path.dirname(file(target)), { recursive: true })
        writeFileSync(file(target), readFileSync(path.join(fixture, relative)))
      }
    }

    it.each([false, true])("installs into the source root and replaces the template page (src dir: %s)", (srcDir) => {
      createNextApp({ srcDir })
      const root = srcDir ? "src/" : ""
      ok(cli("init"))

      expect(read(`${root}app/page.tsx`)).toMatch(/^"use client"/)
      expect(read(`${root}app/page.tsx`)).toContain('from "../components/ui/button"')
      expect(read(`${root}lib/theme.tsx`)).toMatch(/^"use client"/)
      expect(existsSync(file(`${root}components/ui/button.tsx`))).toBe(true)
      expect(read(`${root}styles/raxui.scss`)).toContain('@import "raxui/components/starter";')
      expect(read(`${root}styles/raxui.scss`)).toContain(`@import "${srcDir ? "../../" : "../"}node_modules/bootstrap/scss/bootstrap";`)
      for (const leftover of [`${root}app/page.module.css`, `${root}app/globals.css`, "public/next.svg", "public/vercel.svg"]) {
        expect(existsSync(file(leftover)), leftover).toBe(false)
      }

      const layout = read(`${root}app/layout.tsx`)
      expect(layout.startsWith('import "../styles/raxui.scss"\n')).toBe(true)
      expect(layout).not.toContain("./globals.css")
      expect(layout).toContain("next/font/google") // the layout itself is kept
      expect(json("raxui.react.json")).toMatchObject({ bundler: "next", entry: `${root}app/layout.tsx`, stylesheet: `${root}styles/raxui.scss` })

      const before = snapshot()
      ok(cli("init"))
      expect(snapshot()).toEqual(before)
    })

    it("keeps a changed page and its styles", () => {
      createNextApp()
      writeFileSync(file("app/page.tsx"), "export default function Home() { return <h1>Mine</h1> }\n")
      const result = cli("init")
      ok(result)
      expect(read("app/page.tsx")).toContain("Mine")
      expect(existsSync(file("app/globals.css"))).toBe(true)
      expect(read("app/layout.tsx")).toContain("./globals.css")
      expect(result.out).toContain("Kept your app/page.tsx (it differs from the Next.js template)")
    })

    it.each([
      ["Tailwind dependency", { dependencies: { "@tailwindcss/postcss": "4.1.0" } }, /Tailwind are not supported/],
      ["Next.js 14", { dependencies: { next: "14.2.0" } }, /Next.js 15 or later is required/],
    ])("rejects %s", (_label, options, message) => {
      createNextApp(options)
      const before = snapshot()
      expect(cli("init")).toMatchObject({ code: 1, err: expect.stringMatching(message) })
      expect(snapshot()).toEqual(before)
    })

    it("rejects Tailwind configured in postcss", () => {
      createNextApp()
      writeFileSync(file("postcss.config.mjs"), 'export default { plugins: ["@tailwindcss/postcss"] }\n')
      expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("Tailwind are not supported") })
    })

    it("rejects the Pages Router", () => {
      writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: { ...DEPENDENCIES, next: "15.5.0" } }))
      mkdirSync(file("pages"), { recursive: true })
      writeFileSync(file("pages/index.tsx"), "export default function Home() { return null }\n")
      expect(cli("init")).toMatchObject({ code: 1, err: expect.stringContaining("Pages Router is not supported") })
    })
  })

  it("keeps every packed CLI file visible to git", () => {
    // A .NET-style `bin/` ignore once hid the CLI entry point, so CI packed a CLI without its command.
    const packed = ["bin/raxui-react.mjs", "src/cli.mjs", "src/registry.mjs", "src/safety.mjs", "src/transaction.mjs", "src/state.mjs", "package.json"]
    const ignored = packed.filter((relative) => {
      try {
        execFileSync("git", ["check-ignore", "-q", `src/react-cli/${relative}`])
        return true // exit 0: ignored
      } catch {
        return false
      }
    })
    expect(ignored).toEqual([])
  })

  it("prints the install command when packages are missing and --no-install is set", () => {
    writeFileSync(path.join(app, "package.json"), JSON.stringify({ dependencies: { react: "18.3.1" }, devDependencies: { vite: "8.3.5" } }))
    const result = cli("init")
    ok(result)
    expect(result.out).toContain("npm install --save-exact --ignore-scripts bootstrap@5.3.8 sass@1.106.1 clsx@2.1.1")
  })
})

describe("raxui-react init theme options and multi-component add", () => {
  const INDEX_HTML = '<!doctype html>\n<html lang="en">\n  <head></head>\n  <body><div id="root"></div></body>\n</html>\n'

  it("writes the chosen appearance and accent to <html>, the config, and the starter defaults", () => {
    writeFileSync(file("index.html"), INDEX_HTML)
    createViteTemplateFiles()
    ok(cli("init", "--appearance", "glass", "--accent", "emerald"))

    expect(read("index.html")).toContain('<html lang="en" data-rax-appearance="glass" data-rax-accent="emerald">')
    expect(json("raxui.react.json").theme).toEqual({ appearance: "glass", accent: "emerald" })
    expect(read("src/App.tsx")).toContain('useState<RaxAppearance>("glass")')
    expect(read("src/App.tsx")).toContain('useState<Accent>("emerald")')
  })

  it("keeps the saved choice on a later init, and a flag replaces it without duplicating attributes", () => {
    writeFileSync(file("index.html"), INDEX_HTML)
    ok(cli("init", "--appearance", "flat", "--accent", "amber"))
    ok(cli("init"))
    expect(read("index.html")).toContain('data-rax-appearance="flat" data-rax-accent="amber"')

    ok(cli("init", "--accent", "blue"))
    const html = read("index.html")
    expect(html).not.toContain("data-rax-accent")
    expect(html.split("data-rax-appearance").length - 1).toBe(1)
  })

  it("writes no attributes for the defaults and rejects bad values before writing", () => {
    writeFileSync(file("index.html"), INDEX_HTML)
    ok(cli("init"))
    expect(read("index.html")).toBe(INDEX_HTML)

    const before = snapshot()
    expect(cli("init", "--accent", "pink")).toMatchObject({ code: 1, err: expect.stringContaining("Unknown accent 'pink'") })
    expect(cli("add", "button", "--accent", "emerald")).toMatchObject({ code: 1, err: expect.stringContaining("only supported by init") })
    expect(snapshot()).toEqual(before)
  })

  it("adds several components in one command and installs nothing when one name is unknown", () => {
    ok(cli("init"))
    ok(cli("add", "button", "card", "input", "button"))
    for (const name of ["button", "card", "input"]) expect(existsSync(file(`src/components/ui/${name}.tsx`)), name).toBe(true)
    expect(Object.keys(json("raxui.react.lock.json").items)).toEqual(expect.arrayContaining(["button", "card", "input"]))

    const before = snapshot()
    expect(cli("add", "dialog", "nope").code).toBe(1)
    expect(snapshot()).toEqual(before)
  })
})

it("writes the chosen theme on the <html> tag of a Next.js layout", () => {
  mkdirSync(file("app"), { recursive: true })
  writeFileSync(file("package.json"), JSON.stringify({ dependencies: { ...DEPENDENCIES, next: "15.0.0" } }))
  writeFileSync(file("app/layout.tsx"), 'export default function Layout({ children }) {\n  return <html lang="en"><body>{children}</body></html>\n}\n')
  ok(cli("init", "--appearance", "flat", "--accent", "indigo"))
  expect(read("app/layout.tsx")).toContain('<html lang="en" data-rax-appearance="flat" data-rax-accent="indigo">')
})
