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
import { ConfirmDialog } from "./components/ui/confirm-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu"
import { SheenThemeProvider, type SheenAppearance } from "./lib/theme"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "./components/ui/form"
import { FormSection, FormRowLink } from "./components/ui/form-section"

const params = new URLSearchParams(window.location.search)
const schema = z.object({ name: z.string().min(1, "Name is required") })

export default function App() {
  const [count, setCount] = useState(0)
  const [picked, setPicked] = useState("")
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "" }, shouldFocusError: false })
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
          <DropdownMenuItem onSelect={() => setPicked("Delete")}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p id="picked">{picked}</p>
      <ConfirmDialog
        trigger={<Button variant="destructive">Delete project</Button>}
        title="Delete project?"
        tone="destructive"
        confirmText="Delete"
        onConfirm={() => setPicked("Deleted")}
      />
      <Form {...form} schema={schema}>
        <form onSubmit={form.handleSubmit(() => setPicked("Saved"))} noValidate>
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><input className="form-control" {...field} /></FormControl>
              <FormDescription>Your full name</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <button type="submit">Save</button>
        </form>
      </Form>
      <FormSection title="Preferences"><FormRowLink label="Language" value="English" /></FormSection>
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
  sh("npx sheenui-react add confirm-dialog", app)
  sh("npx sheenui-react add input", app)
  sh("npx sheenui-react add input-group", app)
  sh("npx sheenui-react add textarea", app)
  sh("npx sheenui-react add checkbox", app)
  sh("npx sheenui-react add radio-group", app)
  sh("npx sheenui-react add switch", app)
  sh("npx sheenui-react add select", app)
  sh("npx sheenui-react add slider", app)
  sh("npx sheenui-react add rating", app)
  sh("npx sheenui-react add calendar", app)
  sh("npx sheenui-react add date-picker", app)
  sh("npx sheenui-react add date-range-picker", app)
  sh("npx sheenui-react add navbar", app)
  sh("npx sheenui-react add sidebar", app)
  sh("npx sheenui-react add navigation-menu", app)
  sh("npx sheenui-react add menubar", app)
  sh("npx sheenui-react add footer", app)
  sh("npx sheenui-react add banner", app)
  sh("npx sheenui-react add data-table", app)
  sh("npx sheenui-react add data-grid", app)
  sh("npx sheenui-react add sortable", app)
  sh("npx sheenui-react add resizable", app)
  sh("npx sheenui-react add date-input", app)
  sh("npx sheenui-react add time-picker", app)
  sh("npx sheenui-react add date-time-input", app)
  sh("npx sheenui-react add date-range-input", app)
  sh("npx sheenui-react add file-upload", app)
  sh("npx sheenui-react add popover", app)
  sh("npx sheenui-react add combobox", app)
  sh("npx sheenui-react add autocomplete", app)
  sh("npx sheenui-react add alert", app)
  sh("npx sheenui-react add badge", app)
  sh("npx sheenui-react add avatar", app)
  sh("npx sheenui-react add card", app)
  sh("npx sheenui-react add skeleton", app)
  sh("npx sheenui-react add spinner", app)
  sh("npx sheenui-react add progress", app)
  sh("npx sheenui-react add table", app)
  sh("npx sheenui-react add timeline", app)
  sh("npx sheenui-react add tabs", app)
  sh("npx sheenui-react add accordion", app)
  sh("npx sheenui-react add breadcrumb", app)
  sh("npx sheenui-react add pagination", app)
  sh("npx sheenui-react add stepper", app)
  sh("npx sheenui-react add toggle", app)
  sh("npx sheenui-react add menu-toggle", app)
  sh("npx sheenui-react add tooltip", app)
  sh("npx sheenui-react add hover-card", app)
  sh("npx sheenui-react add toast", app)
  sh("npx sheenui-react add sheet", app)
  sh("npx sheenui-react add drawer", app)
  sh("npx sheenui-react add context-menu", app)
  sh("npx sheenui-react add command", app)
  sh("npx sheenui-react add form", app)
  sh("npx sheenui-react add form-section", app)

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

  // Below 576px the dialog is a bottom sheet (boot-ui motion); wait for the slide-in to settle.
  await page.setViewportSize({ width: 375, height: 700 })
  await page.getByRole("button", { name: "Open dialog" }).click()
  await expect(dialog).toBeVisible()
  await expect.poll(async () => { const box = (await dialog.boundingBox())!; return Math.round(700 - box.y - box.height) }).toBe(8)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await page.setViewportSize({ width: 1280, height: 720 })

  await page.getByRole("button", { name: "Options" }).click()
  const menu = page.getByRole("menu")
  await expect(menu).toHaveClass(/\bsheen-dropdown-menu\b/)
  await expect(menu).toBeFocused() // a pointer open focuses the menu; arrows move in (ADR 013)
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused()
  // The highlight glides to the item Radix highlights.
  await expect(menu).toHaveAttribute("data-hover", "")
  const edit = await page.getByRole("menuitem", { name: "Edit" }).evaluate((el: HTMLElement) => `${el.offsetTop}px`)
  expect(await menu.evaluate((el) => el.style.getPropertyValue("--sheen-menu-hover-y"))).toBe(edit)
  const remove = page.getByRole("menuitem", { name: "Delete" })
  await remove.hover()
  await expect(remove).toBeFocused()
  expect(await menu.evaluate((el) => el.style.getPropertyValue("--sheen-menu-hover-y"))).toBe(await remove.evaluate((el: HTMLElement) => `${el.offsetTop}px`))
  await page.getByRole("menuitem", { name: "Edit" }).hover()
  await page.keyboard.press("Enter")
  await expect(page.locator("#picked")).toHaveText("Edit")
  await expect(menu).toBeHidden()
})

test("ConfirmDialog nudges on an outside click and confirms (boot-ui AlertDialog)", async ({ page }) => {
  await page.goto(`${baseUrl}/?accent=emerald`)
  await page.getByRole("button", { name: "Delete project" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete project?" })
  await expect(dialog).toHaveClass(/\bsheen-confirm\b/)
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused()
  expect(await dialog.evaluate((el) => !!el.closest('[data-sheen-accent="emerald"]'))).toBe(true)
  await page.mouse.click(5, 5)
  await expect(dialog).toBeVisible()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator("#picked")).toHaveText("Deleted")
})

test("the installed form wires schema hints, errors and focus through Field", async ({ page }) => {
  await page.goto(baseUrl)
  const name = page.getByRole("textbox", { name: "Name" })
  await expect(name).toHaveAttribute("aria-required", "true")
  await expect(page.locator(".sheen-field-required")).toHaveText("*")
  await expect(name).toHaveAccessibleDescription("Your full name")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.locator(".sheen-field-error")).toHaveText("Name is required")
  await expect(name).toHaveAttribute("aria-invalid", "true")
  await expect(name).toBeFocused()
  await name.fill("Ada")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.locator("#picked")).toHaveText("Saved")
  await expect(page.locator(".sheen-field-error")).toHaveCount(0)
})

test("running init and add again changes no files", () => {
  const before = snapshot(app)
  sh("npx sheenui-react init", app)
  sh("npx sheenui-react add button", app)
  sh("npx sheenui-react add dialog", app)
  sh("npx sheenui-react add dropdown-menu", app)
  sh("npx sheenui-react add confirm-dialog", app)
  sh("npx sheenui-react add input", app)
  sh("npx sheenui-react add input-group", app)
  sh("npx sheenui-react add textarea", app)
  sh("npx sheenui-react add checkbox", app)
  sh("npx sheenui-react add radio-group", app)
  sh("npx sheenui-react add switch", app)
  sh("npx sheenui-react add select", app)
  sh("npx sheenui-react add slider", app)
  sh("npx sheenui-react add rating", app)
  sh("npx sheenui-react add calendar", app)
  sh("npx sheenui-react add date-picker", app)
  sh("npx sheenui-react add date-range-picker", app)
  sh("npx sheenui-react add navbar", app)
  sh("npx sheenui-react add sidebar", app)
  sh("npx sheenui-react add navigation-menu", app)
  sh("npx sheenui-react add menubar", app)
  sh("npx sheenui-react add footer", app)
  sh("npx sheenui-react add banner", app)
  sh("npx sheenui-react add data-table", app)
  sh("npx sheenui-react add data-grid", app)
  sh("npx sheenui-react add sortable", app)
  sh("npx sheenui-react add resizable", app)
  sh("npx sheenui-react add date-input", app)
  sh("npx sheenui-react add time-picker", app)
  sh("npx sheenui-react add date-time-input", app)
  sh("npx sheenui-react add date-range-input", app)
  sh("npx sheenui-react add file-upload", app)
  sh("npx sheenui-react add popover", app)
  sh("npx sheenui-react add combobox", app)
  sh("npx sheenui-react add autocomplete", app)
  sh("npx sheenui-react add alert", app)
  sh("npx sheenui-react add badge", app)
  sh("npx sheenui-react add avatar", app)
  sh("npx sheenui-react add card", app)
  sh("npx sheenui-react add skeleton", app)
  sh("npx sheenui-react add spinner", app)
  sh("npx sheenui-react add progress", app)
  sh("npx sheenui-react add table", app)
  sh("npx sheenui-react add timeline", app)
  sh("npx sheenui-react add tabs", app)
  sh("npx sheenui-react add accordion", app)
  sh("npx sheenui-react add breadcrumb", app)
  sh("npx sheenui-react add pagination", app)
  sh("npx sheenui-react add stepper", app)
  sh("npx sheenui-react add toggle", app)
  sh("npx sheenui-react add menu-toggle", app)
  sh("npx sheenui-react add tooltip", app)
  sh("npx sheenui-react add hover-card", app)
  sh("npx sheenui-react add toast", app)
  sh("npx sheenui-react add sheet", app)
  sh("npx sheenui-react add drawer", app)
  sh("npx sheenui-react add context-menu", app)
  sh("npx sheenui-react add command", app)
  sh("npx sheenui-react add form", app)
  sh("npx sheenui-react add form-section", app)
  expect(snapshot(app)).toEqual(before)
})
