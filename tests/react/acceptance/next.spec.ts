// End to end (ADR 011): a real create-next-app project (App Router, TypeScript, no Tailwind), the packed CLI,
// init, `next build`, `next start`, and the welcome page in Chromium.
import { expect, test, type Page } from "@playwright/test"
import { execSync, spawnSync, spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

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
  if (/sheenui-react|npm run build/.test(command))
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
  root = mkdtempSync(path.join(tmpdir(), "sheen-next-e2e-"))
  app = path.join(root, "app")

  sh(`npx --yes ${CREATE_NEXT_APP} app --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`, root)

  const packed = sh(`npm pack "${path.join(repo, "src/react-cli")}" --pack-destination "${root}" --silent`, repo).trim().split(/\r?\n/).pop()!
  sh(`npm install -D --save-exact --ignore-scripts --no-audit --no-fund "${path.join(root, packed)}"`, app)
  sh("npx sheenui-react init", app)

  if (!readFileSync(path.join(app, "app/page.tsx"), "utf8").includes("Welcome to your SheenUI app"))
    throw new Error("init did not install the Next.js starter page")
  for (const leftover of ["app/page.module.css", "app/globals.css", "public/next.svg"]) {
    if (existsSync(path.join(app, leftover))) throw new Error(`init left the template file ${leftover}`)
  }

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

const shell = (page: Page) => page.locator(".sheen-app")

test("the welcome page renders in the SheenUI shell with Bootstrap and the theme", async ({ page }) => {
  await page.goto(baseUrl)
  await expect(page.locator("h1")).toHaveText("Welcome to your SheenUI app")
  const primary = page.getByRole("button", { name: "Primary" })
  await expect(primary).toHaveClass(/\bbtn sheen-button btn-glass btn-glass-primary\b/)
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
  await expect(shell(page)).toHaveAttribute("data-sheen-appearance", "glass")
  await expect(shell(page)).toHaveAttribute("data-bs-theme", "dark")
  await expect(shell(page)).toHaveAttribute("data-sheen-accent", "emerald")
  await expect(shell(page)).toHaveAttribute("dir", "rtl")
  expect(await page.locator(".sheen-panel").first().evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur")
})

test("running init and add again changes no files", () => {
  const before = snapshot(app)
  sh("npx sheenui-react init", app)
  sh("npx sheenui-react add button", app)
  expect(snapshot(app)).toEqual(before)
})
