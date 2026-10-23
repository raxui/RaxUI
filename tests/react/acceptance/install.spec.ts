// End to end (ADR 006): a real `npm create vite` React app, the packed CLI, init, add button,
// a real `npm run build` (tsc + vite), and the built app in Chromium.
import { expect, test, type Page } from "@playwright/test"
import { execSync, spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const CREATE_VITE = "vite@9.3.1" // `npm create vite@x` runs create-vite@x

const APP = `import { useState } from "react"
import { Button } from "./components/ui/button"
import { BootThemeProvider, type BootAppearance } from "./lib/theme"

const params = new URLSearchParams(window.location.search)

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <BootThemeProvider
      data-testid="theme"
      appearance={(params.get("appearance") ?? "default") as BootAppearance}
      mode={params.get("mode") === "dark" ? "dark" : "light"}
      direction={params.get("dir") === "rtl" ? "rtl" : "ltr"}
    >
      <Button id="count" onClick={() => setCount((value) => value + 1)}>
        Count {count}
      </Button>
    </BootThemeProvider>
  )
}
`

let root: string
let app: string
let server: ChildProcess | undefined
let baseUrl: string

const sh = (command: string, cwd: string) => execSync(command, { cwd, stdio: "pipe", encoding: "utf8" })

function snapshot(dir: string) {
  const result: Record<string, string> = {}
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (entry === "node_modules" || entry === "dist") continue
      const full = path.join(current, entry)
      if (statSync(full).isDirectory()) walk(full)
      else result[path.relative(dir, full)] = createHash("sha256").update(readFileSync(full)).digest("hex")
    }
  }
  walk(dir)
  return result
}

async function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.once("error", reject)
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })
}

test.beforeAll(async () => {
  root = mkdtempSync(path.join(tmpdir(), "bui-react-e2e-"))
  app = path.join(root, "app")

  sh(`npm create --yes ${CREATE_VITE} app -- --template react-ts --no-interactive`, root)
  sh("npm install --no-audit --no-fund", app)

  const packed = sh(`npm pack "${path.join(repo, "src/react-cli")}" --pack-destination "${root}" --silent`, repo).trim().split(/\r?\n/).pop()!
  sh(`npm install -D --save-exact --ignore-scripts --no-audit --no-fund "${path.join(root, packed)}"`, app)

  sh("npx blazorui-react init", app)
  sh("npx blazorui-react add button", app)
  writeFileSync(path.join(app, "src/App.tsx"), APP)
  sh("npm run build", app)

  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  server = spawn(`npx vite preview --host 127.0.0.1 --port ${port} --strictPort`, { cwd: app, shell: true, stdio: "pipe" })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("vite preview did not start")), 60_000)
    server!.stdout!.on("data", (chunk) => {
      if (String(chunk).includes(String(port))) {
        clearTimeout(timer)
        resolve()
      }
    })
    server!.once("exit", (code) => reject(new Error(`vite preview exited with ${code}`)))
  })
})

test.afterAll(() => {
  if (server?.pid) {
    if (process.platform === "win32") execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" })
    else server.kill("SIGTERM")
  }
  if (root) rmSync(root, { recursive: true, force: true })
})

const button = (page: Page) => page.locator("#count")
const style = (page: Page, property: string) => button(page).evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property)

test("the installed Button renders with the shared classes and handles clicks", async ({ page }) => {
  await page.goto(baseUrl)
  await expect(button(page)).toHaveClass(/\bbtn\b/)
  await expect(button(page)).toHaveClass(/\bbui-button\b/)
  await expect(button(page)).toHaveClass(/\bbtn-glass-primary\b/)
  await expect(button(page)).toHaveAttribute("type", "button")
  await button(page).click()
  await button(page).click()
  await expect(button(page)).toHaveText("Count 2")
})

test("appearances change the look: default has a shadow, flat has none, glass blurs", async ({ page }) => {
  await page.goto(`${baseUrl}/?appearance=default`)
  const defaultShadow = await style(page, "box-shadow")
  expect(defaultShadow).not.toBe("none")

  await page.goto(`${baseUrl}/?appearance=flat`)
  expect(await style(page, "box-shadow")).toBe("none")

  await page.goto(`${baseUrl}/?appearance=glass`)
  expect(await style(page, "backdrop-filter")).toContain("blur")
  await expect(button(page)).toHaveAttribute("data-bui-appearance", "glass")
})

test("dark mode and RTL apply through the theme provider", async ({ page }) => {
  await page.goto(baseUrl)
  const lightBg = await page.getByTestId("theme").evaluate((el) => getComputedStyle(el).getPropertyValue("--bs-body-bg"))

  await page.goto(`${baseUrl}/?mode=dark&dir=rtl`)
  const theme = page.getByTestId("theme")
  await expect(theme).toHaveAttribute("data-bs-theme", "dark")
  expect(await theme.evaluate((el) => getComputedStyle(el).getPropertyValue("--bs-body-bg"))).not.toBe(lightBg)
  expect(await button(page).evaluate((el) => getComputedStyle(el).direction)).toBe("rtl")
})

test("running init and add again changes no files", () => {
  const before = snapshot(app)
  sh("npx blazorui-react init", app)
  sh("npx blazorui-react add button", app)
  expect(snapshot(app)).toEqual(before)
})
