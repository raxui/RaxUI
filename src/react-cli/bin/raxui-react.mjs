#!/usr/bin/env node
import { run } from "../src/cli.mjs"

process.exitCode = run(process.argv.slice(2), { cwd: process.cwd(), stdout: process.stdout, stderr: process.stderr, interactive: Boolean(process.stdin.isTTY) })
