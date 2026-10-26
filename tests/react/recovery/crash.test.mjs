import { afterEach, beforeEach, test } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { setTimeout as delay } from "node:timers/promises"
import { FileTransaction, TRANSACTION_DIR } from "../../../src/react-cli/src/transaction.mjs"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const entry = path.join(repo, "src/react-cli/bin/sheenui-react.mjs")
let root, app, children
const full = name => path.join(app, ...name.split("/"))
const read = name => readFileSync(full(name), "utf8")
const digest = value => createHash("sha256").update(value).digest("hex")
const journal = () => JSON.parse(read(`${TRANSACTION_DIR}/journal.json`))
function cli(...args) {
  const result = spawnSync(process.execPath, [entry, ...args, "--cwd", app, "--no-install"], { encoding: "utf8" })
  return { code: result.status, out: result.stdout, err: result.stderr }
}
const ok = result => { assert.equal(result.code, 0, result.err); return result }

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "sheen-recovery-")); app = path.join(root, "app"); children = []
  mkdirSync(full("src"), { recursive: true })
  writeFileSync(full("package.json"), JSON.stringify({ dependencies: { react: "18.3.1", "react-dom": "18.3.1" }, devDependencies: { vite: "8.3.5" } }))
  writeFileSync(full("src/main.tsx"), 'import "./index.css"; import App from "./App";\n')
  // Recognized starter files exercise removal and byte-exact restoration too.
  for (const name of ["src/App.tsx", "src/App.css", "src/index.css", "src/assets/react.svg"]) {
    mkdirSync(path.dirname(full(name)), { recursive: true })
    writeFileSync(full(name), readFileSync(path.join(repo, "tests/react/fixtures/vite-react-ts-classic", name)))
  }
})

afterEach(async () => {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGKILL"); await exited
  }
  assert.equal(path.dirname(root), path.resolve(tmpdir()))
  assert.ok(path.basename(root).startsWith("sheen-recovery-"))
  rmSync(root, { recursive: true, force: true })
})

function snapshot() {
  const result = {}
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === TRANSACTION_DIR) continue
      const file = path.join(dir, name), relative = path.relative(app, file), stat = lstatSync(file)
      if (stat.isDirectory()) { result[relative + "/"] = "directory"; walk(file) }
      else if (stat.isSymbolicLink()) result[relative] = "link"
      else result[relative] = digest(readFileSync(file))
    }
  }
  walk(app); return result
}

async function crash(command, at = "first-write", name = "dialog") {
  const hook = path.join(root, "crash-hook.mjs"), ready = path.join(root, "ready")
  if (existsSync(ready)) unlinkSync(ready)
  // Intercept Node's real filesystem operation, then let the parent kill the actual CLI.
  // This is test-only instrumentation; the production command has no crash/backdoor flags.
  writeFileSync(hook, `import fs from "node:fs"; import cp from "node:child_process"; import path from "node:path"; import {syncBuiltinESMExports} from "node:module";
const rename=fs.renameSync, unlink=fs.unlinkSync, write=fs.writeFileSync, read=fs.readFileSync;
const app=${JSON.stringify(app)}, ready=${JSON.stringify(ready)}, at=${JSON.stringify(at)};
function stop(target,kind){const rel=path.relative(app,String(target)).split(path.sep).join("/");
const project=!rel.startsWith("../")&&!rel.startsWith(".sheenui-react-transaction/");
const hit=at==="npm"?kind==="npm":at==="cleanup"?kind==="delete"&&rel.startsWith(".sheenui-react-transaction/before-"):at==="first-write"?project&&kind==="write":at==="delete"?project&&kind==="delete":at==="commit"?rel===".sheenui-react-transaction/journal.json"&&JSON.parse(read(target,"utf8")).phase==="committed":rel===at&&kind==="write";
if(hit){write(ready,rel);Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0)}}
cp.spawnSync=()=>{write(path.join(app,"package.json"),"npm changed bytes");stop(path.join(app,"package.json"),"npm");return {status:1}};
fs.renameSync=(from,to)=>{const result=rename(from,to);stop(to,"write");return result};
fs.unlinkSync=file=>{const result=unlink(file);stop(file,"delete");return result};syncBuiltinESMExports();`)
  const args = ["--import", pathToFileURL(hook).href, entry, command, ...(command === "add" ? [name] : []), "--cwd", app, ...(at === "npm" ? [] : ["--no-install"])]
  const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] }); children.push(child)
  let output = ""; child.stderr.on("data", data => output += data)
  const deadline = Date.now() + 20_000
  while (!existsSync(ready)) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`CLI exited before crash point ${at}: ${output}`)
    if (Date.now() > deadline) throw new Error(`No crash point ${at}: ${output}`)
    await delay(20)
  }
  const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGKILL"); await exited
  assert.ok(existsSync(full(`${TRANSACTION_DIR}/journal.json`)))
}

for (const command of ["init", "add"]) {
  for (const at of ["first-write", "src/styles/sheenui.scss", "sheenui.react.json", "sheenui.react.lock.json"]) {
    test(`${command}: killed after ${at}, before durable commit, restores exact bytes and directories`, async () => {
      if (command === "add") ok(cli("init"))
      const before = snapshot(); await crash(command, at); ok(cli("recover"))
      assert.deepEqual(snapshot(), before); assert.equal(existsSync(full(TRANSACTION_DIR)), false)
      ok(cli(command, ...(command === "add" ? ["dialog"] : [])))
    })
  }
  test(`${command}: next invocation recovers automatically before reading config and lock`, async () => {
    if (command === "add") ok(cli("init"))
    await crash(command, "sheenui.react.json")
    const result = ok(cli(command, ...(command === "add" ? ["dialog"] : [])))
    assert.match(result.out, /Recovered interrupted/)
    assert.equal(existsSync(full(TRANSACTION_DIR)), false)
  })
  test(`${command}: commit marker keeps completed installation and later user edits`, async () => {
    if (command === "add") ok(cli("init"))
    await crash(command, "commit"); writeFileSync(full("src/main.tsx"), "user edit after commit")
    const before = snapshot(); assert.match(ok(cli("recover")).out, /completed SheenUI installation/)
    assert.deepEqual(snapshot(), before); assert.ok(existsSync(full("sheenui.react.lock.json")))
  })
}

test("crash after a template deletion restores its original binary bytes", async () => {
  const before = snapshot(); await crash("init", "delete"); ok(cli("recover")); assert.deepEqual(snapshot(), before)
})

test("edited and newly created user files survive; explicit keep resolves conflicts", async () => {
  await crash("init"); const first = journal().files[0].target
  writeFileSync(full(first), "later user edit"); writeFileSync(full("src/lib/user.txt"), "keep me")
  const before = snapshot(), result = cli("init")
  assert.equal(result.code, 1); assert.match(result.err, /recovery stopped without changing files/); assert.deepEqual(snapshot(), before)
  ok(cli("recover", "--keep-changes")); assert.equal(read(first), "later user edit"); assert.equal(read("src/lib/user.txt"), "keep me")
  assert.equal(existsSync(full("sheenui.react.json")), false)
})

test("later user deletion is preserved instead of silently restoring a modified existing file", async () => {
  await crash("init", "src/styles/sheenui.scss"); unlinkSync(full("src/App.tsx"))
  const before = snapshot(); assert.equal(cli("recover").code, 1); assert.deepEqual(snapshot(), before)
  ok(cli("recover", "--keep-changes")); assert.equal(existsSync(full("src/App.tsx")), false)
})

test("recovery refuses a target replaced by an outside junction", async () => {
  await crash("init"); const outside = path.join(root, "outside"); mkdirSync(outside)
  renameSync(full("src/lib"), path.join(root, "original-lib")); symlinkSync(outside, full("src/lib"), "junction")
  const before = snapshot(); const result = cli("recover")
  assert.equal(result.code, 1); assert.match(result.err, /escapes the project|linked path/); assert.deepEqual(readdirSync(outside), []); assert.deepEqual(snapshot(), before)
})

test("recovery rejects outside journal links and keeps their contents untouched", async () => {
  const outside = path.join(root, "outside"); mkdirSync(outside); writeFileSync(path.join(outside, "journal.json"), "external sentinel")
  symlinkSync(outside, full(TRANSACTION_DIR), "junction"); assert.equal(cli("init").code, 1); assert.equal(readFileSync(path.join(outside,"journal.json"),"utf8"),"external sentinel")
})

test("malformed, traversing and damaged journals stop before project writes", async () => {
  await crash("init", "src/styles/sheenui.scss"); const original = journal(), before = snapshot()
  for (const mutate of [j => {j.schemaVersion=99},j => {j.files[0].target="../outside"},j => {j.files[0].target="src/../outside"},j => {j.files[0].before={file:"../../outside",hash:"a".repeat(64)}},j => {j.files[0].after=["bad"]},j => {j.root=root}]) {
    const changed=structuredClone(original);mutate(changed);writeFileSync(full(`${TRANSACTION_DIR}/journal.json`),JSON.stringify(changed))
    assert.equal(cli("recover").code,1);assert.deepEqual(snapshot(),before)
  }
  writeFileSync(full(`${TRANSACTION_DIR}/journal.json`),JSON.stringify(original));const backup=original.files.find(f=>f.before).before.file
  writeFileSync(full(`${TRANSACTION_DIR}/${backup}`),"damaged");assert.match(cli("recover").err,/damaged/);assert.deepEqual(snapshot(),before)
})

test("hard-linked targets and hard-linked backup files are never restored through", async () => {
  await crash("init", "src/styles/sheenui.scss");const data=journal(), first=data.files[0].target, outside=path.join(root,"sentinel")
  writeFileSync(outside,"external sentinel");unlinkSync(full(first));linkSync(outside,full(first))
  assert.equal(cli("recover").code,1);assert.equal(readFileSync(outside,"utf8"),"external sentinel")
  unlinkSync(full(first));const saved=data.files.find(f=>f.before).before.file;unlinkSync(full(`${TRANSACTION_DIR}/${saved}`));linkSync(outside,full(`${TRANSACTION_DIR}/${saved}`))
  assert.equal(cli("recover").code,1);assert.equal(readFileSync(outside,"utf8"),"external sentinel")
})

test("live owner and competing recovery lock prevent a second writer", async () => {
  const transaction = new FileTransaction(app);assert.match(cli("init").err,/still running/);transaction.restore()
  await crash("init");writeFileSync(full(`${TRANSACTION_DIR}/recovery.lock`),"another recovery")
  assert.match(cli("recover").err,/Recovery lock exists/)
})

test("an interrupted external package install requires explicit reconciliation", async () => {
  const childScript=path.join(root,"external.mjs"), transactionUrl=new URL("../../../src/react-cli/src/transaction.mjs",import.meta.url).href
  writeFileSync(childScript,`import {FileTransaction} from ${JSON.stringify(transactionUrl)};import fs from "node:fs";const t=new FileTransaction(${JSON.stringify(app)});t.write(${JSON.stringify(full("generated.txt"))},"generated");t.beginExternal([${JSON.stringify(full("package.json"))},${JSON.stringify(full("package-lock.json"))}]);fs.writeFileSync(${JSON.stringify(full("package.json"))},"npm changed bytes");`)
  assert.equal(spawnSync(process.execPath,[childScript]).status,0);assert.match(cli("init").err,/npm was interrupted/)
  ok(cli("recover","--keep-changes"));assert.equal(read("package.json"),"npm changed bytes");assert.equal(existsSync(full("generated.txt")),false)
})

test("handled npm failure restores its observed package writes and original bytes", () => {
  const before=snapshot(),t=new FileTransaction(app);t.beginExternal([full("package.json"),full("package-lock.json")]);writeFileSync(full("package.json"),"npm mutation");writeFileSync(full("package-lock.json"),"npm lock");t.endExternal();t.restore();assert.deepEqual(snapshot(),before)
})

test("empty or truncated journal is actionable and does not permit a new install", () => {
  mkdirSync(full(TRANSACTION_DIR));const before=snapshot();assert.match(cli("init").err,/Missing.*journal/);assert.deepEqual(snapshot(),before)
  writeFileSync(full(`${TRANSACTION_DIR}/journal.json`),"{");assert.equal(cli("init").code,1);assert.deepEqual(snapshot(),before)
})

test("actual CLI package-install interruption retains edits and requires reconciliation",async()=>{
 await crash("init","npm");assert.equal(journal().external,true);const before=snapshot();assert.match(cli("init").err,/npm was interrupted/);assert.deepEqual(snapshot(),before)
 ok(cli("recover","--keep-changes"));assert.equal(read("package.json"),"npm changed bytes");assert.equal(existsSync(full("src/lib/theme.tsx")),false)
})

test("actual CLI package-install failure rolls back its observed writes",()=>{
 const hook=path.join(root,"failed-npm.mjs"),before=snapshot()
 writeFileSync(hook,'import fs from "node:fs";import cp from "node:child_process";import {syncBuiltinESMExports} from "node:module";cp.spawnSync=()=>{fs.writeFileSync('+JSON.stringify(full("package.json"))+',"npm mutation");fs.writeFileSync('+JSON.stringify(full("package-lock.json"))+',"npm lock");return {status:1}};syncBuiltinESMExports();')
 const result=spawnSync(process.execPath,["--import",pathToFileURL(hook).href,entry,"init","--cwd",app],{encoding:"utf8"});assert.equal(result.status,1);assert.match(result.stderr,/failed/);assert.deepEqual(snapshot(),before);assert.equal(existsSync(full(TRANSACTION_DIR)),false)
})

test("transiently locked targets are retried instead of rolling back",()=>{
 const hook=path.join(root,"locked-rename.mjs")
 writeFileSync(hook,'import fs from "node:fs";import {syncBuiltinESMExports} from "node:module";const rename=fs.renameSync;let locks=0;fs.renameSync=(from,to)=>{if(locks<4){locks++;throw Object.assign(new Error("locked"),{code:locks%2?"EBUSY":"EPERM"})}return rename(from,to)};syncBuiltinESMExports();')
 const result=spawnSync(process.execPath,["--import",pathToFileURL(hook).href,entry,"init","--cwd",app,"--no-install"],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);assert.equal(existsSync(full("src/lib/theme.tsx")),true);assert.equal(existsSync(full(TRANSACTION_DIR)),false)
})

test("replaced empty directories are retained using exact filesystem identities",async()=>{
 await crash("init");renameSync(full("src/lib"),path.join(root,"old-lib"));mkdirSync(full("src/lib"));ok(cli("recover"));assert.equal(lstatSync(full("src/lib")).isDirectory(),true)
})

test("a torn journal/stage write uses the previous complete journal",async()=>{
 const before=snapshot();await crash("init");writeFileSync(full(TRANSACTION_DIR+"/journal.next"),"{");writeFileSync(full(TRANSACTION_DIR+"/write.next"),"partial stage");ok(cli("recover"));assert.deepEqual(snapshot(),before)
})

test("interrupted rollback remains replayable after clearing its reported stale recovery lock",async()=>{
 const before=snapshot();await crash("init","sheenui.react.lock.json");await crash("recover");assert.match(cli("recover").err,/Recovery lock exists/);unlinkSync(full(TRANSACTION_DIR+"/recovery.lock"));ok(cli("recover"));assert.deepEqual(snapshot(),before)
})

test("a crash while cleaning committed backups never rolls back the installation",async()=>{
 await crash("init","cleanup");const before=snapshot();assert.match(ok(cli("recover")).out,/completed/);assert.deepEqual(snapshot(),before)
})

test("recovery options cannot silently affect init/add",()=>{
 const before=snapshot();assert.match(cli("init","--keep-changes").err,/only supported by recover/);assert.deepEqual(snapshot(),before);assert.match(ok(cli("recover")).out,/No interrupted/)
})
