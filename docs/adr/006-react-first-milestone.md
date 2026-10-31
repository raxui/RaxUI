# ADR 006 — React First Milestone

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

[ADR 005](005-multi-framework-shared-theme.md) adds a React library to this repository with a shared theme. As with Blazor ([ADR 002](002-first-milestone-scope.md), [ADR 004](004-simplified-first-milestone.md)), the first React milestone must prove one complete installation path before more components or commands are added.

## Decision

The first React milestone delivers `init` followed by `add button` in a React + Vite application.

### Scope

- One component: Button.
- React 18.3 and 19, TypeScript, Vite. Other build tools (Next.js, Create React App) are not supported.
- Behaviour from Radix UI (`@radix-ui/react-slot` for `asChild`). Styling from Bootstrap 5.3 and the shared theme.
- Styles are delivered as **SCSS**. The application compiles Bootstrap and the theme with Dart Sass 1.79+, so it can override Bootstrap Sass variables such as `$primary`.
- A separate **Node CLI**, run with `npx`, with only `init` and `add button`. No `list`, `diff`, `doctor`, `update`, HTTP registry, or path aliases.
- The CLI package name is provisional (`raxui-react`). Nothing is published to npm in this milestone; acceptance uses a packed tarball.

### Installation layout

`init` installs the foundation:

- `src/lib/theme.tsx` and `src/lib/utils.ts`.
- `src/styles/raxui/` with the theme partials.
- `src/styles/raxui.scss`, which imports theme variables, then Bootstrap, then the theme core, then installed components.
- One import of `src/styles/raxui.scss` in `src/main.tsx` (or `src/main.jsx`).

`add button` installs `src/components/ui/button.tsx` and `src/styles/raxui/components/_button.scss`, and adds the button import to `src/styles/raxui.scss` once. Imports written as `@/lib/*` in the registry are rewritten to relative paths.

If the entry already imports Bootstrap CSS directly, or the stylesheet uses `@use` integration, `init` writes nothing and prints the manual steps.

`init` installs the pinned npm packages with `npm install --ignore-scripts`. With another package manager it prints the command instead of running it.

### Registry and lock

- The React registry lives in `registry/react/`: `index.json` and one directory per item. `foundation` is an item that `button` requires.
- A manifest shares Blazor's concepts: `schemaVersion`, `name`, `version`, and `files` entries with `source`, `target`, `type`, and `sha256`. React adds `requires`, `packages` (exact npm versions), and `styles` (ordered SCSS partials).
- File types are `tsx`, `ts`, and `scss`. Unknown types, unknown destinations, unsafe paths, and hash mismatches are rejected before any write.
- The registry is bundled into the CLI package; the package version is the registry version.
- Configuration is `raxui.react.json`; the lock is `raxui.react.lock.json`. Because import rewriting changes file content, the lock stores `sourceHash` and `installedHash` separately.

### Safety

The Node CLI follows the same rules as the .NET CLI ([ADR 003](003-installation-and-registry-contract.md), [ADR 004](004-simplified-first-milestone.md)):

- Reject paths that escape the project, including through symlinks or junctions.
- Refuse to overwrite unknown or locally modified files.
- Refuse to replace a tracked file whose registry source differs from this release.
- Stage writes, restore original bytes and remove new directories on failure, and write the lock last.
- Accept files written by the same or an older release; reject files written by a newer one.

## Alternatives Considered

- **Extend the .NET CLI to install React components:** Shares safety code, but every React developer would need the .NET SDK.
- **Precompiled CSS for React:** No Sass needed, but Bootstrap Sass variables could not be customized, unlike boot-ui today.
- **Port all boot-ui components and commands at once:** Delays end-to-end proof and multiplies the test matrix before the contract is settled.

## Consequences

- React consumers need Sass and see Sass `@import` deprecation warnings from Bootstrap 5.3. This is documented; the CLI does not edit the consumer's Vite configuration.
- The two CLIs implement the same safety rules in two languages; their tests mirror each other.
- The package name must be decided before the first npm release.

React interrupted-process recovery is now specified by [ADR 017](017-react-cli-recovery.md); the .NET CLI remains unchanged.
