# ADR 011 — Next.js 15+ (App Router)

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

The React library supports Vite ([ADR 006](006-react-first-milestone.md), [ADR 010](010-vite-6-and-later.md)). Next.js is the most common React framework. Its structure differs: an App Router with a root `app/layout.tsx` instead of `src/main.tsx`, React Server Components by default, global CSS only from the root layout, and an optional `src/` directory. `create-next-app` adds Tailwind by default, whose base reset (preflight) overrides Bootstrap.

## Decision

- **Supported:** Next.js **15 or later**, **App Router**, **TypeScript**, **without Tailwind**. The CLI reads the installed Next.js version (or the `package.json` range) and rejects older versions, the Pages Router, JavaScript layouts, and projects with `tailwindcss`, `@tailwindcss/postcss`, or Tailwind in the PostCSS config, each with a clear message.
- **Source root:** `src/` when `src/app` exists, otherwise the project root. Components, `lib/`, and `styles/` install there; `@/` imports in registry sources are rewritten to relative paths as for Vite.
- **Styles:** `init` creates `styles/sheenui.scss` and imports it once, as the first line of `app/layout.tsx`. The layout itself is not replaced (it holds fonts and metadata). Next's Sass pipeline cannot follow Bootstrap's own relative imports when Bootstrap is imported by package name, so the Next.js stylesheet imports Bootstrap by path (`../node_modules/bootstrap/scss/bootstrap`, one more `../` with `src/`). Hoisted monorepos must adjust that line.
- **Client components:** `lib/theme.tsx` and `components/ui/button.tsx` start with `"use client"` (context and hooks). The directive is harmless under Vite.
- **Starter:** a `starter-next` registry item installs `app/page.tsx` (the same shell and welcome page as Vite, as a client component, using `next/link` for the brand link). It replaces only an unmodified `create-next-app` 15.x or 16.x page and then removes the template's `page.module.css`, `globals.css` (and its import in the layout), and `public/*.svg`, each only if unmodified ([ADR 008](008-starter-app.md)).
- **Configuration:** `sheenui.react.json` records `bundler: "next"`, the layout as `entry`, and the stylesheet path.
- **Tests:** unit tests on fake Next.js projects (root and `src/`, rejections, kept files); CI runs a real-app acceptance test with `create-next-app` 15.5.28 and 16.4.3 on Ubuntu and Windows: `next build`, `next start`, theme controls in Chromium, reruns change nothing.

## Alternatives Considered

- **Pages Router too:** A second entry (`pages/_app.tsx`) and starter to maintain for a legacy router.
- **Support Tailwind projects with a warning:** Preflight resets button and heading styles; the result looks broken by default.
- **Edit `next.config` to add Sass include paths:** Edits a file the developer owns and that varies widely; a path in our own stylesheet is local and visible.

## Consequences

- One CLI serves Vite and Next.js projects; the project type is detected from dependencies.
- The repository typechecks the Next.js starter with a small `next/link` declaration (`tests/react/next-link.d.ts`); the real types are checked by `next build` in CI.
- New `create-next-app` templates are not recognized until their fingerprints are added; `init` then keeps those files and says so.
