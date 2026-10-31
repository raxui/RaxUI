// raxui.react.json and raxui.react.lock.json, with the version rules of the .NET CLI (ADR 004, ADR 006).
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { assertInsideProject } from "./safety.mjs"

export const CONFIG_FILE = "raxui.react.json"
export const LOCK_FILE = "raxui.react.lock.json"
export const STATE_SCHEMA_VERSION = 1

/** Semantic Version 2.0 precedence: build metadata ignored, prerelease below release. */
export function compareVersions(a, b) {
  const [coreA, preA] = parseVersion(a)
  const [coreB, preB] = parseVersion(b)
  for (let i = 0; i < 3; i++) if (coreA[i] !== coreB[i]) return Math.sign(coreA[i] - coreB[i])
  if (preA.length === 0 || preB.length === 0) return Math.sign(preB.length - preA.length)
  for (let i = 0; i < Math.min(preA.length, preB.length); i++) {
    const numA = /^\d+$/.test(preA[i])
    const numB = /^\d+$/.test(preB[i])
    const result =
      numA && numB ? Math.sign(Number(preA[i]) - Number(preB[i])) : numA ? -1 : numB ? 1 : preA[i] < preB[i] ? -1 : preA[i] > preB[i] ? 1 : 0
    if (result !== 0) return result
  }
  return Math.sign(preA.length - preB.length)
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(version))
  if (!match) throw new Error(`Invalid version '${version}'.`)
  return [[Number(match[1]), Number(match[2]), Number(match[3])], match[4] ? match[4].split(".") : []]
}

/** Accepts files written by this or an older CLI; rejects a newer one. */
export function ensureSupported(recorded, current, file) {
  if (compareVersions(recorded, current) > 0)
    throw new Error(`'${file}' was written by raxui-react ${recorded}, which is newer than this CLI (${current}). Install raxui-react ${recorded} or later.`)
}

function readJson(projectDir, file) {
  const full = path.join(projectDir, file)
  assertInsideProject(projectDir, full)
  if (!existsSync(full)) return null
  const data = JSON.parse(readFileSync(full, "utf8"))
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(`'${file}' must be a JSON object.`)
  if (data.schemaVersion !== STATE_SCHEMA_VERSION) throw new Error(`Unsupported '${file}' schema version ${data.schemaVersion}.`)
  return data
}

export function loadConfig(projectDir, current) {
  const config = readJson(projectDir, CONFIG_FILE)
  if (!config) return null
  ensureSupported(config.registryVersion, current, CONFIG_FILE)
  if (config.framework !== "react" || !["vite", "next"].includes(config.bundler))
    throw new Error(`'${CONFIG_FILE}' must use framework 'react' and bundler 'vite' or 'next'.`)
  return config
}

export function loadLock(projectDir, current) {
  const lock = readJson(projectDir, LOCK_FILE) ?? { schemaVersion: STATE_SCHEMA_VERSION, registryVersion: current, items: {} }
  ensureSupported(lock.registryVersion, current, LOCK_FILE)
  if (lock.items === null || typeof lock.items !== "object" || Array.isArray(lock.items))
    throw new Error(`'${LOCK_FILE}' items must be an object.`)
  return lock
}

export function findTracked(lock, target) {
  for (const item of Object.values(lock.items)) {
    const file = item.files?.find((entry) => entry.target === target)
    if (file) return file
  }
  return null
}

export function serialize(data) {
  return JSON.stringify(data, null, 2) + "\n"
}

export function writeState(backup, projectDir, file, data) {
  backup.write(path.join(projectDir, file), serialize(data))
}
