# ADR 010 — React on Vite 6 and Later

- **Status:** Accepted
- **Date:** 2026-10-23
- **Refines:** [ADR 006](006-react-first-milestone.md), which named Vite without a version.

## Context

ADR 006 supports React + Vite, and the starter ([ADR 008](008-starter-app.md)) recognized only the `create-vite` 9.3.1 template. Many projects run Vite 6 or 7. The `create-vite` releases that scaffold them (6.x, 7.x, and 8.x, which scaffolds Vite 7) share one `react-ts` template; 9.x (Vite 8) has a different one.

## Decision

- **Supported:** React 18.3 or 19 with TypeScript on **Vite 6 or later**. The CLI reads the installed Vite version from `node_modules/vite/package.json`, or the major version of the `vite` range in `package.json` before `npm install`. Older versions are rejected with a clear error.
- **Starter templates:** the CLI recognizes both `react-ts` templates by fingerprint: `create-vite` 9 and `create-vite` 6–8. It replaces an unmodified template `App.tsx` and removes that template's files only that App used. `public/vite.svg` stays, because the older template's `index.html` uses it as the favicon.
- **Tests:** CI runs the real-app acceptance test with `create-vite` 6.5.0 (Vite 6), 7.1.3 (Vite 7), and 9.3.1 (Vite 8), on Ubuntu and Windows. Unit tests use fixtures of both templates.

## Alternatives Considered

- **Vite 8 only:** Excludes the many projects still on Vite 6 and 7.
- **Support Vite 5:** Vite 5 uses the legacy Sass API by default and its template differs again; Vite 6 is the oldest release the theme was tested with.

## Consequences

- The React CI job runs six combinations instead of two.
- A new `create-vite` template is not recognized until its fingerprints are added; `init` then keeps those files and says so.
