// End to end (ADR 011): a real create-next-app project (App Router, TypeScript, no Tailwind), the packed CLI,
// init, `next build`, `next start`, and the welcome page in Chromium.
import { expect, test, type Page } from "@playwright/test"
import { execSync, spawnSync, spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Keep keyboard/selection checks independent of spring animation timing.
test.use({ reducedMotion: "reduce", actionTimeout: 15_000 })

const OVERLAYS = ["file-upload", "tooltip", "hover-card", "toast", "sheet", "drawer", "context-menu", "command", "date-input", "time-picker", "date-time-input", "date-range-input", "date-picker", "date-range-picker", "combobox", "autocomplete", "select", "navbar", "sidebar", "navigation-menu", "menubar", "footer", "banner", "data-table", "data-grid", "sortable", "resizable", "carousel", "chat", "ai", "text-editor", "qr-code", "speed-dial", "kanban"]
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
// CI runs 15.5.28 and 16.4.3.
const CREATE_NEXT_APP = `create-next-app@${process.env.CREATE_NEXT_APP_VERSION ?? "16.4.3"}`

let root: string
let app: string
let server: ChildProcess | undefined
let baseUrl: string

const sh = (command: string, cwd: string) => {
  const result = spawnSync(command, { cwd, shell: true, encoding: "utf8" })
  const output = (result.stdout ?? "") + (result.stderr ?? "")
  if (result.status !== 0) throw new Error(`Command failed: ${command}\n${output}`)
  if (/raxui-react|npm run build/.test(command))
    expect(output).not.toMatch(/DEP0190|Deprecation Warning|SassWarning|inferred your workspace root/i)
  return result.stdout
}

function snapshot(dir: string) {
  const result: Record<string, string> = {}
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (entry === "node_modules" || entry === ".next") continue
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
  root = mkdtempSync(path.join(tmpdir(), "rax-next-e2e-"))
  app = path.join(root, "app")

  sh(`npx --yes ${CREATE_NEXT_APP} app --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`, root)

  const packed = sh(`npm pack "${path.join(repo, "src/react-cli")}" --pack-destination "${root}" --silent`, repo).trim().split(/\r?\n/).pop()!
  sh(`npm install -D --save-exact --ignore-scripts --no-audit --no-fund "${path.join(root, packed)}"`, app)
  sh("npx raxui-react init", app)

  if (!readFileSync(path.join(app, "app/page.tsx"), "utf8").includes("Welcome to your RaxUI app"))
    throw new Error("init did not install the Next.js starter page")
  for (const leftover of ["app/page.module.css", "app/globals.css", "public/next.svg"]) {
    if (existsSync(path.join(app, leftover))) throw new Error(`init left the template file ${leftover}`)
  }

  // Phase 3 overlays under Next.js: a server page renders the client components across their
  // "use client" boundaries, and a client button raises a toast.
  for (const item of OVERLAYS) sh(`npx raxui-react add ${item}`, app)
  mkdirSync(path.join(app, "app/overlays"))
  writeFileSync(path.join(app, "app/overlays/toast-button.tsx"), `"use client"
import { toast } from "@/components/ui/use-toast"

export function ToastButton() {
  return <button type="button" onClick={() => toast({ title: "Saved", tone: "success" })}>Save</button>
}
`)
  writeFileSync(path.join(app, "app/overlays/page.tsx"), `import { RaxThemeProvider } from "@/lib/theme"
import { Tooltip } from "@/components/ui/tooltip"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { Toaster } from "@/components/ui/toaster"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet"
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu"
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command"
import { DateInput, DateTimeInput, TimeInput } from "@/components/ui/date-input"
import { TimePicker } from "@/components/ui/time-picker"
import { DateRangeInput } from "@/components/ui/date-range-input"
import { DatePicker } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Combobox } from "@/components/ui/combobox"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ToastButton } from "./toast-button"

export default function Overlays() {
  return (
    <RaxThemeProvider className="rax-app">
      <Tooltip content="Save your work" side="top"><button type="button">Help</button></Tooltip>
      <HoverCard><HoverCardTrigger href="#author">Author</HoverCardTrigger><HoverCardContent><p>Author details</p></HoverCardContent></HoverCard>
      <section aria-label="Date and choice parity">
        <DatePicker locale="en-GB" aria-label="Due picker" name="duePicker" defaultValue={new Date(2026, 9, 15)} />
        <DateRangePicker locale="en-GB" aria-label="Report picker" name="reportPicker" defaultValue={{ from: new Date(2026, 9, 10), to: new Date(2026, 9, 13) }} />
        <DateInput locale="en-GB" aria-label="Birthday" defaultValue={new Date(2026, 9, 25)} name="birthday" />
        <DateTimeInput locale="en-GB" aria-label="Appointment" defaultValue={new Date(2026, 9, 25, 9, 30)} />
        <TimeInput locale="en-GB" aria-label="Opening time" defaultValue={new Date(2026, 9, 25, 9, 30)} />
        <TimePicker locale="en-GB" defaultValue={{ hours: 9, minutes: 30 }} />
        <DateRangeInput locale="en-GB" aria-label="Stay" name="stay" defaultValue={{ from: new Date(2026, 9, 10), to: new Date(2026, 9, 13) }} />
        <Combobox aria-label="Frameworks" multiple defaultValue={["react"]} options={[{ value: "react", label: "React", group: "Web" }, { value: "vue", label: "Vue", group: "Web" }]} />
        <Autocomplete aria-label="City" minChars={0} options={[{ value: "iq", label: "Baghdad", description: "Iraq" }]} />
        <Select><SelectTrigger aria-label="Priority"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
      </section>
      <ToastButton />
      <Toaster />
      <Sheet><SheetTrigger>Settings</SheetTrigger><SheetContent side="end">
        <SheetHeader><SheetTitle>Settings</SheetTitle><SheetDescription>Your preferences</SheetDescription></SheetHeader>
        <SheetBody>Settings content</SheetBody>
      </SheetContent></Sheet>
      <Drawer><DrawerTrigger>Actions</DrawerTrigger><DrawerContent>
        <DrawerTitle>Actions</DrawerTitle><DrawerDescription>Choose an action</DrawerDescription><DrawerClose>Done</DrawerClose>
      </DrawerContent></Drawer>
      <ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent>
        <ContextMenuItem>Open file</ContextMenuItem>
      </ContextMenuContent></ContextMenu>
      <CommandDialog><CommandInput /><CommandList><CommandGroup heading="Files">
        <CommandItem value="Open file">Open file</CommandItem>
      </CommandGroup><CommandEmpty /></CommandList></CommandDialog>
    </RaxThemeProvider>
  )
}
`)

  mkdirSync(path.join(app, "app/shell"))
  writeFileSync(path.join(app, "app/shell/demo.tsx"), readFileSync(path.join(repo, "tests/react/fixtures/app-shell.tsx"), "utf8"))
  writeFileSync(path.join(app, "app/shell/page.tsx"), 'import ShellDemo from "./demo"; export default function Page() { return <ShellDemo /> }')
  mkdirSync(path.join(app, "app/advanced-components"))
  writeFileSync(path.join(app, "app/advanced-components/demo.tsx"), readFileSync(path.join(repo,"tests/react/fixtures/advanced-components.tsx"),"utf8"))
  writeFileSync(path.join(app, "app/advanced-components/page.tsx"), `import Demo from "./demo"; export default function Page(){return <Demo/>}`)
  mkdirSync(path.join(app, "app/data-components"))
  writeFileSync(path.join(app, "app/data-components/demo.tsx"), readFileSync(path.join(repo,"tests/react/fixtures/data-components.tsx"),"utf8"))
  writeFileSync(path.join(app, "app/data-components/page.tsx"), 'import DataDemo from "./demo"; export default function Page(){ return <DataDemo/> }')
  mkdirSync(path.join(app, "app/file-upload"))
  writeFileSync(path.join(app, "app/file-upload/demo.tsx"), readFileSync(path.join(repo, "tests/react/fixtures/file-upload.tsx"), "utf8"))
  writeFileSync(path.join(app, "app/file-upload/page.tsx"), 'import Demo from "./demo"; export default function Page(){return <Demo/>}')
  sh("npm run build", app)

  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  server = spawn(`npx next start -H 127.0.0.1 -p ${port}`, { cwd: app, shell: true, stdio: "pipe" })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("next start did not start")), 60_000)
    server!.stdout!.on("data", (chunk) => {
      if (/ready|started|Local:/i.test(String(chunk))) {
        clearTimeout(timer)
        resolve()
      }
    })
    server!.once("exit", (code) => reject(new Error(`next start exited with ${code}`)))
  })
})

test.afterAll(() => {
  if (server?.pid) {
    if (process.platform === "win32") execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" })
    else server.kill("SIGTERM")
  }
  if (root) rmSync(root, { recursive: true, force: true })
})

const shell = (page: Page) => page.locator(".rax-app")

test("phase 3 overlays render from a server page and open", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${baseUrl}/overlays`)
  await page.getByRole("button", { name: "Help" }).hover()
  await expect(page.getByRole("tooltip")).toContainText("Save your work")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible()
  // Complete the toast flow before starting the independent sheet flow.
  await page.getByRole("button", { name: "Dismiss", exact: true }).click()
  await expect(page.getByText("Saved", { exact: true }).first()).toBeHidden()
  await page.getByRole("button", { name: "Settings" }).click()
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByText("Right-click here").click({ button: "right" })
  await expect(page.getByRole("menuitem", { name: "Open file" })).toBeVisible()
  expect(errors).toEqual([])
})

test("the welcome page renders in the RaxUI shell with Bootstrap and the theme", async ({ page }) => {
  await page.goto(baseUrl)
  await expect(page.locator("h1")).toHaveText("Welcome to your RaxUI app")
  const primary = page.getByRole("button", { name: "Primary" })
  await expect(primary).toHaveClass(/\bbtn rax-button btn-glass btn-glass-primary\b/)
  // inline-flex, blockified to flex inside the preview row's flex container
  await expect(primary).toHaveCSS("display", /flex$/)
  expect(await primary.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
})

test("the theme controls switch appearance, mode, accent, and direction", async ({ page }) => {
  await page.goto(baseUrl)
  await page.getByRole("button", { name: "Glass" }).click()
  await page.getByRole("button", { name: "Dark" }).click()
  await page.getByRole("button", { name: "Emerald" }).click()
  await page.getByRole("button", { name: "RTL" }).click()
  await expect(shell(page)).toHaveAttribute("data-rax-appearance", "glass")
  await expect(shell(page)).toHaveAttribute("data-bs-theme", "dark")
  await expect(shell(page)).toHaveAttribute("data-rax-accent", "emerald")
  await expect(shell(page)).toHaveAttribute("dir", "rtl")
  expect(await page.locator(".rax-panel").first().evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur")
})

test("Primary follows the selected accent in every appearance and mode, including returning to Blue", async ({ page }) => {
  await page.goto(baseUrl)
  const primary = page.getByRole("button", { name: "Primary", exact: true })
  const colors = {
    Light: { Emerald: "rgb(14, 122, 109)", Indigo: "rgb(79, 70, 229)", Amber: "rgb(194, 86, 12)", Blue: "rgb(13, 110, 253)" },
    Dark: { Emerald: "rgb(19, 131, 113)", Indigo: "rgb(94, 97, 241)", Amber: "rgb(181, 91, 25)", Blue: "rgb(13, 110, 253)" },
  }
  for (const appearance of ["Default", "Flat", "Glass"]) {
    await page.getByRole("button", { name: appearance, exact: true }).click()
    for (const [mode, accents] of Object.entries(colors)) {
      await page.getByRole("button", { name: mode, exact: true }).click()
      for (const [accent, color] of Object.entries(accents)) {
        const swatch = page.getByRole("button", { name: accent, exact: true })
        await expect(swatch).toHaveClass("rax-accent-swatch")
        await swatch.click()
        await expect(swatch).toHaveAttribute("aria-pressed", "true")
        await expect(page.getByRole("group", { name: "Accent", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(1)
        await expect(primary).toHaveCSS("background-color", color)
      }
    }
  }
})

test("accent swatches have distinct colors and support keyboard selection", async ({ page }) => {
  await page.goto(baseUrl)
  const accents = page.getByRole("group", { name: "Accent", exact: true })
  const swatches = accents.getByRole("button")
  await expect(swatches).toHaveCount(4)
  const colors = await swatches.evaluateAll((elements) => elements.map((el) => getComputedStyle(el, "::before").backgroundColor))
  expect(new Set(colors).size).toBe(4)
  const indigo = accents.getByRole("button", { name: "Indigo" })
  await indigo.focus()
  await expect(indigo).toBeFocused()
  await indigo.press("Space")
  await expect(indigo).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: "Primary", exact: true })).toHaveCSS("background-color", "rgb(79, 70, 229)")
  expect(await indigo.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
})

test("running init and add again changes no files", () => {
  const before = snapshot(app)
  sh("npx raxui-react init", app)
  sh("npx raxui-react add button", app)
  for (const item of OVERLAYS) sh(`npx raxui-react add ${item}`, app)
  expect(snapshot(app)).toEqual(before)
})


test("date and rich choice components hydrate from server imports and remain interactive", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(baseUrl + "/overlays")
  const section = page.getByRole("region", { name: "Date and choice parity" })
  const birthday = section.getByRole("group", { name: "Birthday", exact: true })
  await birthday.getByRole("spinbutton", { name: "year", exact: true }).press("ArrowUp")
  await expect(birthday.locator('input[name="birthday"]')).toHaveValue("2027-10-25")
  await birthday.getByRole("button", { name: "Choose date", exact: true }).click()
  await expect(page.locator(".rax-calendar")).toBeVisible()
  await page.keyboard.press("Escape")
  await section.getByRole("combobox", { name: "Frameworks", exact: true }).click()
  const choices = page.locator(".rax-rich-combobox-content")
  await expect(choices).toHaveCSS("padding", "0px")
  await expect(choices.locator(".rax-command")).toHaveCSS("border-top-width", "0px")
  await expect(choices.locator(".rax-command")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  await expect(choices.locator(".rax-command")).toHaveCSS("box-shadow", "none")
  await page.getByRole("option", { name: "Vue", exact: true }).click()
  await page.keyboard.press("Escape")
  await expect(section.getByRole("button", { name: "Remove Vue", exact: true })).toBeVisible()
  await section.getByRole("combobox", { name: "City", exact: true }).fill("Bag")
  await page.getByRole("option", { name: "Baghdad Iraq", exact: true }).click()
  await expect(section.getByRole("combobox", { name: "City", exact: true })).toHaveValue("Baghdad")
  await section.getByRole("combobox", { name: "Priority", exact: true }).click()
  await page.getByRole("option", { name: "High", exact: true }).click()
  await expect(section.getByRole("combobox", { name: "Priority", exact: true })).toHaveText("High")
  expect(errors).toEqual([])
})


test("time wheels reach both ends and select the final values", async ({ page }) => {
  await page.goto(baseUrl + "/overlays")
  const wheels = page.locator(".rax-time-wheel")
  const hour = wheels.getByRole("listbox", { name: "hour", exact: true })
  const minute = wheels.getByRole("listbox", { name: "minute", exact: true })
  await hour.press("End")
  await expect(hour.getByRole("option", { selected: true })).toHaveText("23")
  for (const label of ["22", "23", "00"]) {
    await hour.getByRole("option", { name: label, exact: true }).click()
    await expect(hour.getByRole("option", { selected: true })).toHaveText(label)
    await expect.poll(() => hour.evaluate(el => Math.round(el.scrollTop))).toBe(Number(label) * 36)
  }
  await minute.hover()
  await page.mouse.wheel(0, 10000)
  await expect(minute.getByRole("option", { selected: true })).toHaveText("59")
  for (const label of ["58", "59", "00"]) {
    await minute.getByRole("option", { name: label, exact: true }).click()
    await expect(minute.getByRole("option", { selected: true })).toHaveText(label)
    await expect.poll(() => minute.evaluate(el => Math.round(el.scrollTop))).toBe(Number(label) * 36)
  }
})

test("segmented range hydrates, posts ISO endpoints and opens a range calendar", async ({ page }) => {
  await page.goto(baseUrl + "/overlays")
  const range = page.getByRole("group", { name: "Stay", exact: true })
  await expect(range.locator('input[name="stay_from"]')).toHaveValue("2026-10-10")
  await expect(range.locator('input[name="stay_to"]')).toHaveValue("2026-10-13")
  await range.getByRole("button", { name: "Choose dates", exact: true }).click()
  const popup = page.locator(".rax-date-range-popover")
  await expect(popup.getByRole("grid")).toHaveCount(2)
  await popup.getByRole("button", { name: "Done", exact: true }).click()
  await range.getByRole("button", { name: "Clear dates", exact: true }).click()
  await expect(range.locator('input[name="stay_from"]')).toHaveValue("")
})


test("calendar pickers hydrate and commit single dates or range drafts through their public entries", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  await page.goto(baseUrl + "/overlays")
  await page.getByRole("button", { name: "Due picker", exact: true }).click()
  const single = page.getByRole("dialog", { name: "Choose date", exact: true })
  await expect(single.locator('.rax-calendar-day[tabindex="0"]')).toBeFocused()
  await single.locator('[data-date="2026-10-16"]').click()
  await expect(page.locator('input[name="duePicker"]')).toHaveValue("2026-10-16")
  const trigger = page.getByRole("button", { name: "Report picker", exact: true })
  const from = page.locator('input[name="reportPicker_from"]')
  const to = page.locator('input[name="reportPicker_to"]')
  await trigger.click()
  const range = page.getByRole("dialog", { name: "Choose date range", exact: true })
  await range.getByRole("button", { name: "Today", exact: true }).click()
  await expect(from).toHaveValue("2026-10-10")
  await range.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(from).toHaveValue("2026-10-10")
  await trigger.click()
  await range.getByRole("button", { name: "Today", exact: true }).click()
  await range.getByRole("button", { name: "Apply", exact: true }).click()
  await expect(from).toHaveValue(await to.inputValue())
  await expect(trigger).toBeFocused()
  expect(errors).toEqual([])
})

test("app shell hydrates with stored preferences, keeps theme portals and handles desktop and mobile navigation", async ({page})=>{
 const errors:string[]=[]
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())})
 await page.addInitScript(()=>{localStorage.setItem("acceptance-sidebar","false");localStorage.setItem("rax-banner:acceptance-tip","dismissed")})
 await page.goto(baseUrl+"/shell")
 const sidebar=page.getByRole("button",{name:"Toggle sidebar"})
 await expect(sidebar).toHaveAttribute("aria-expanded","false")
 await expect(page.getByText("Remembered tip")).toBeHidden()
 await sidebar.click();await expect(sidebar).toHaveAttribute("aria-expanded","true")
 await page.getByRole("button",{name:"Settings",exact:true}).click();await expect(page.getByRole("link",{name:"Profile"})).toBeVisible()
 await page.getByRole("button",{name:"Products",exact:true}).click();await expect(page.getByRole("link",{name:/UI kit/})).toBeVisible()
 for(const padding of [12,32]){
 await page.getByRole("button",{name:"Products",exact:true}).evaluate((el,p)=>el.style.paddingInline=p+"px",padding)
 await expect.poll(async()=>{
  const trigger=await page.getByRole("button",{name:"Products",exact:true}).boundingBox(),panel=await page.locator(".rax-nav-viewport").boundingBox()
  if(!trigger||!panel)return Infinity
  const expected=Math.max(8,Math.min(trigger.x+trigger.width-panel.width,page.viewportSize()!.width-8-panel.width))
  return Math.abs(panel.x-expected)
 }).toBeLessThan(2)
 }
 await page.keyboard.press("Escape")
 await page.getByRole("menuitem",{name:"File",exact:true}).click();await page.getByRole("menuitem",{name:"New",exact:true}).click();await expect(page.getByLabel("Menu action")).toHaveText("New document")
 await page.getByRole("menuitem",{name:"View",exact:true}).click();await page.getByRole("menuitemcheckbox",{name:"Toolbar"}).click();await expect(page.getByLabel("Toolbar state")).toHaveText("true")
 await page.getByRole("textbox",{name:"Stay in the loop"}).fill("user@example.com");await page.getByRole("button",{name:"Subscribe"}).click();await expect(page.getByText("Thanks! Check your inbox to confirm.")).toBeVisible()
 await page.setViewportSize({width:390,height:844})
 await page.getByRole("button",{name:"Menu",exact:true}).click();await expect(page.locator('.rax-navbar-menu')).toHaveAttribute("data-state","open");await page.keyboard.press("Escape")
 await sidebar.click();const dialog=page.getByRole("dialog",{name:"Workspace"});await expect(dialog).toBeVisible();await expect(dialog).toHaveAttribute("data-side","right");await page.keyboard.press("Escape");await expect(sidebar).toBeFocused()
 const footer=page.getByRole("button",{name:"Resources",exact:true});await footer.click();await expect(page.getByRole("link",{name:"Guide",exact:true})).toBeVisible()
 expect(errors).toEqual([])
})

test("data components hydrate and handle table state, safe grid edits, reordering and persisted panels",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())})
 await page.addInitScript(()=>{if(!sessionStorage.getItem("layout-tested"))localStorage.setItem("react-resizable-panels:acceptance-split","not-json")})
 await page.goto(baseUrl+"/data-components")
 const table=page.getByRole("region",{name:"Table demo"});await table.getByRole("searchbox").fill("Row 0002");await expect(table.getByRole("cell",{name:"Row 0002",exact:true})).toBeVisible();await table.getByRole("button",{name:"Reset",exact:true}).click()
 await table.getByRole("checkbox",{name:"Select row",exact:true}).first().click();await page.getByRole("button",{name:"Use selection"}).click();await expect(page.getByLabel("Last edit")).toHaveText("1 selected");await page.getByRole("button",{name:"Clear selection"}).click()
 const grid=page.getByRole("grid",{name:"Inventory"});await expect(grid.getByRole("gridcell",{name:"Row 0001",exact:true})).toBeVisible();await grid.getByRole("gridcell",{name:"Row 0001",exact:true}).click();await grid.press("Enter");const editor=grid.getByRole("textbox",{name:"Name, row 1",exact:true});await editor.fill("Edited row");await editor.press("Enter");await expect(page.getByLabel("Last edit")).toHaveText("0:name:Edited row")
 await grid.press("Control+Home");await grid.press("ArrowRight");await grid.press("Enter");const number=grid.getByRole("textbox",{name:"Amount, row 1",exact:true});await number.fill("invalid");await number.press("Enter");await expect(grid.getByRole("alert")).toHaveText("Enter a number.");await number.press("Escape")
 await grid.press("Control+End");await expect.poll(()=>grid.getAttribute("aria-activedescendant")).toMatch(/r9999-c4$/);await expect(grid.locator('.rax-grid-body [role=row]')).not.toHaveCount(10000)
 const tasks=page.getByRole("region",{name:"Sortable demo"}),handle=tasks.locator('button[aria-label="Move Alpha"]');await handle.focus();await page.keyboard.press("Space");await expect(handle).toHaveAttribute("data-dragging","");await page.waitForTimeout(60);await page.keyboard.press("ArrowDown");await page.waitForTimeout(100);await page.keyboard.press("Space");await expect(page.getByLabel("Task order")).toHaveText("Beta,Alpha,Gamma");await expect(handle).toBeFocused()
 const separator=page.getByRole("separator",{name:"Resize panels"});await separator.focus();const old=await separator.getAttribute("aria-valuenow");await separator.press("ArrowRight");await expect(separator).not.toHaveAttribute("aria-valuenow",old!);const changed=await separator.getAttribute("aria-valuenow");await expect.poll(()=>page.evaluate(()=>localStorage.getItem("react-resizable-panels:acceptance-split"))).not.toBe("not-json")
 // Do not reset storage on reload: verify the saved layout hydrates without a mismatch.
 await page.evaluate(()=>sessionStorage.setItem("layout-tested","true"));await page.reload();await expect(page.getByRole("separator",{name:"Resize panels"})).toHaveAttribute("aria-valuenow",changed!)
 await page.getByRole("button",{name:"Toggle direction"}).click();await expect(page.locator('.rax-resizable')).toHaveAttribute("data-mirrored","");expect(errors).toEqual([])
})

 test("advanced components hydrate and support keyboard, editor, QR and conversation flows",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())})
 await page.goto(baseUrl+"/advanced-components");await expect(page.getByRole("heading",{name:"Advanced components"})).toBeVisible();await expect(page.locator(".rax-carousel-counter")).toHaveText("1 / 3");await page.getByRole("button",{name:"Next slide"}).click();await expect(page.locator(".rax-carousel-counter")).toHaveText("2 / 3")
 await page.getByPlaceholder("Compose message").fill("Hello chat");await page.getByPlaceholder("Compose message").press("Enter");await expect(page.locator(".rax-chat-bubble").filter({hasText:"Hello chat"})).toHaveText("Hello chat")
 await page.getByPlaceholder("Ask assistant").fill("Answer");await page.getByPlaceholder("Ask assistant").press("Enter");await expect(page.locator(".rax-ai-response")).toHaveAttribute("data-streaming","");await page.getByRole("button",{name:"Stop",exact:true}).click();await expect(page.locator(".rax-ai-response")).not.toHaveAttribute("data-streaming","")
 const editor=page.getByRole("textbox",{name:"Document",exact:true});await editor.fill("Edited");await expect(page.getByLabel("Saved HTML")).toContainText("Edited");await editor.press("ControlOrMeta+a");await page.getByRole("button",{name:"Bold",exact:true}).first().click();await expect(page.getByLabel("Saved HTML")).toContainText("<strong>")
 await expect(page.getByRole("img",{name:"Scan code"}).locator("path")).toHaveAttribute("d",/.+/);const download=page.waitForEvent("download");await page.getByRole("button",{name:"Download SVG"}).click();expect((await download).suggestedFilename()).toMatch(/\.svg$/)
 const trigger=page.getByRole("button",{name:"More actions"});await trigger.focus();await trigger.press("ArrowUp");await expect(page.getByRole("menuitem",{name:"Share",exact:true})).toBeFocused();await page.keyboard.press("Enter");await expect(page.getByText("Shared",{exact:true})).toBeVisible()
 const handle=page.getByRole("button",{name:"Move Alpha",exact:true});await handle.scrollIntoViewIfNeeded();await handle.focus();await page.keyboard.press("Space");await page.waitForTimeout(80);await page.keyboard.press("ArrowRight");await page.waitForTimeout(150);await page.keyboard.press("Space");await expect(page.getByLabel("Board state")).toHaveText('{"todo":["Beta"],"done":["Alpha"]}')
 await page.getByRole("button",{name:"Toggle direction"}).click();await page.getByRole("button",{name:"Toggle mode"}).click();await expect(page.locator(".rax-kanban")).toHaveCSS("direction","rtl");expect(errors).toEqual([])
 })

test.describe("Carousel motion",()=>{
 test.use({reducedMotion:"no-preference"})
 test("Carousel animates through intermediate positions with its default options",async({page})=>{
  await page.goto(baseUrl+"/advanced-components")
  const carousel=page.getByRole("region",{name:"Featured slides",exact:true})
  await expect(carousel.locator(".rax-carousel-counter")).toHaveText("1 / 3")
  const positions=await carousel.evaluate(el=>new Promise<number[]>(resolve=>{
   const track=el.querySelector<HTMLElement>(".rax-carousel-container")!
   const x=()=>new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
   const samples=[x()]
   el.querySelector<HTMLButtonElement>('button[aria-label="Next slide"]')!.click()
   function sample(){samples.push(x());if(samples.length<60)requestAnimationFrame(sample);else resolve(samples)}
   requestAnimationFrame(sample)
  }))
  expect(new Set(positions.map(x=>Math.round(x*1000)/1000)).size).toBeGreaterThan(4)
  await expect(carousel.locator(".rax-carousel-counter")).toHaveText("2 / 3")
 })
})

test("FileUpload queue installs, hydrates, retries and posts its current files", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(baseUrl + "/file-upload")
  const root = page.locator(".rax-queue-upload").first()
  const picker = root.locator('input[type="file"]').first()
  await picker.setInputFiles({ name: "fail.pdf", mimeType: "application/pdf", buffer: Buffer.from("pdf") })
  await page.getByRole("button", { name: "Retry: fail.pdf", exact: true }).click()
  await expect(root.locator('[data-status="success"]')).toHaveCount(1)
  await page.getByRole("button", { name: "Send", exact: true }).click()
  await expect(page.getByRole("status")).toHaveText("fail.pdf")
  await page.getByRole("button", { name: "Remove: fail.pdf", exact: true }).click()
  await page.getByRole("button", { name: "Send", exact: true }).click()
  await expect(page.getByRole("status")).toHaveText("No files")
  expect(errors).toEqual([])
})

test("FileUpload photo grid contains large images and long filenames", async ({ page }) => {
  await page.goto(baseUrl + "/file-upload")
  const images = await page.evaluate(() => [[2400, 4200], [4200, 700], [1600, 1600]].map(([width, height], index) => {
    const canvas = document.createElement("canvas")
    canvas.width = width; canvas.height = height
    const context = canvas.getContext("2d")!
    context.fillStyle = ["#547aa5", "#a56354", "#5d9568"][index]
    context.fillRect(0, 0, width, height)
    return { name: "Photographed document with a long original filename " + index + ".png", data: canvas.toDataURL().split(",")[1] }
  }))
  const grid = page.locator('.rax-queue-upload[data-layout="grid"]')
  await grid.locator('input[type="file"]').setInputFiles(images.map(image => ({ name: image.name, mimeType: "image/png", buffer: Buffer.from(image.data, "base64") })))
  await expect(grid.locator("img")).toHaveCount(3)
  await expect.poll(() => grid.locator("img").evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true)
  for (const width of [1200, 390]) for (const dir of ["ltr", "rtl"]) {
    await page.setViewportSize({ width, height: 900 })
    await grid.evaluate((element, direction) => { element.setAttribute("dir", direction) }, dir)
    const geometry = await grid.evaluate(element => {
      const list = element.querySelector(".rax-queue-upload-list")!
      return { overflow: list.scrollWidth - list.clientWidth, items: Array.from(list.children).map(item => {
        const tile = item.querySelector(".rax-queue-upload-tile")!.getBoundingClientRect()
        const image = item.querySelector("img")!.getBoundingClientRect()
        return { width: item.getBoundingClientRect().width, square: Math.abs(tile.width - tile.height), tileWidth: tile.width,
          contained: image.left >= tile.left - 1 && image.right <= tile.right + 1 && image.top >= tile.top - 1 && image.bottom <= tile.bottom + 1 }
      }) }
    })
    expect(geometry.overflow).toBeLessThanOrEqual(1)
    for (const item of geometry.items) {
      expect(item.square).toBeLessThanOrEqual(1)
      expect(item.tileWidth).toBeLessThanOrEqual(item.width + 1)
      expect(item.contained).toBe(true)
    }
  }
})
