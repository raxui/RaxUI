// End to end (ADR 006): a real `npm create vite` React app, the packed CLI, init, add button,
// a real `npm run build` (tsc + vite), and the built app in Chromium.
import { expect, test, type Page } from "@playwright/test"
import { execSync, spawnSync, spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
// `npm create vite@x` runs create-vite@x. CI runs 6.5.0 (Vite 6), 7.1.3 (Vite 7), and 9.3.1 (Vite 8) (ADR 010).
const CREATE_VITE = `vite@${process.env.CREATE_VITE_VERSION ?? "9.3.1"}`

const APP = `import { useState } from "react"
import { Button } from "./components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu"
import { SheenThemeProvider, type SheenAppearance } from "./lib/theme"

const params = new URLSearchParams(window.location.search)

export default function App() {
  const [count, setCount] = useState(0)
  const [picked, setPicked] = useState("")
  return (
    <SheenThemeProvider
      data-testid="theme"
      data-sheen-accent={params.get("accent") ?? undefined}
      appearance={(params.get("appearance") ?? "default") as SheenAppearance}
      mode={params.get("mode") === "dark" ? "dark" : "light"}
      direction={params.get("dir") === "rtl" ? "rtl" : "ltr"}
    >
      <Button id="count" onClick={() => setCount((value) => value + 1)}>
        Count {count}
      </Button>
      <Dialog>
        <DialogTrigger asChild><Button variant="outline">Open dialog</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="secondary">Options</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setPicked("Edit")}>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p id="picked">{picked}</p>
    </SheenThemeProvider>
  )
}
`

let root: string
let app: string
let server: ChildProcess | undefined
let baseUrl: string

const sh = (command: string, cwd: string) => {
  const result = spawnSync(command, { cwd, shell: true, encoding: "utf8" })
  const output = (result.stdout ?? "") + (result.stderr ?? "")
  if (result.status !== 0) throw new Error(`Command failed: ${command}\n${output}`)
  if (/sheenui-react|npm run build/.test(command))
    expect(output).not.toMatch(/DEP0190|Deprecation Warning|SassWarning|inferred your workspace root/i)
  return result.stdout
}

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
  root = mkdtempSync(path.join(tmpdir(), "sheen-react-e2e-"))
  app = path.join(root, "app")

  sh(`npm create --yes ${CREATE_VITE} app -- --template react-ts --no-interactive`, root)
  sh("npm install --no-audit --no-fund", app)

  const packed = sh(`npm pack "${path.join(repo, "src/react-cli")}" --pack-destination "${root}" --silent`, repo).trim().split(/\r?\n/).pop()!
  sh(`npm install -D --save-exact --ignore-scripts --no-audit --no-fund "${path.join(root, packed)}"`, app)

  sh("npx sheenui-react init", app)
  sh("npx sheenui-react add button", app)
  sh("npx sheenui-react add dialog", app)
  sh("npx sheenui-react add dropdown-menu", app)

  // The starter replaced the unmodified template App and removed what only it used (ADR 008).
  if (!readFileSync(path.join(app, "src/App.tsx"), "utf8").includes("Welcome to your SheenUI app"))
    throw new Error("init did not install the starter App.tsx")
  for (const leftover of ["src/App.css", "src/index.css", "src/assets/react.svg"]) {
    if (existsSync(path.join(app, leftover))) throw new Error(`init left the template file ${leftover}`)
  }
  sh("npm run build", app) // the starter itself builds

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
  await expect(button(page)).toHaveClass(/\bsheen-button\b/)
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
  await expect(button(page)).toHaveAttribute("data-sheen-appearance", "glass")
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

test("light and dark Primary inherit the provider's accent", async ({ page }) => {
  for (const appearance of ["default", "flat", "glass"]) {
    for (const [mode, color] of [["light", "rgb(14, 122, 109)"], ["dark", "rgb(19, 131, 113)"]]) {
      await page.goto(`${baseUrl}/?appearance=${appearance}&mode=${mode}&accent=emerald`)
      await expect(button(page)).toHaveCSS("background-color", color)
    }
  }
})

test("Dialog and DropdownMenu portal into the theme root and use the shared styles (ADR 013)", async ({ page }) => {
  await page.goto(`${baseUrl}/?mode=dark&accent=emerald`)
  await page.getByRole("button", { name: "Open dialog" }).click()
  const dialog = page.getByRole("dialog", { name: "Delete file?" })
  await expect(dialog).toHaveClass(/\bsheen-dialog\b/)
  await expect(dialog).toHaveCSS("position", "fixed")
  expect(await dialog.evaluate((el) => !!el.closest('[data-bs-theme="dark"][data-sheen-accent="emerald"]'))).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()

  await page.getByRole("button", { name: "Options" }).click()
  const menu = page.getByRole("menu")
  await expect(menu).toHaveClass(/\bsheen-dropdown-menu\b/)
  await expect(menu).toBeFocused() // a pointer open focuses the menu; arrows move in (ADR 013)
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#picked")).toHaveText("Edit")
  await expect(menu).toBeHidden()
})

test("running init and add again changes no files", () => {
  const before = snapshot(app)
  sh("npx sheenui-react init", app)
  sh("npx sheenui-react add button", app)
  sh("npx sheenui-react add dialog", app)
  sh("npx sheenui-react add dropdown-menu", app)
  expect(snapshot(app)).toEqual(before)
})
