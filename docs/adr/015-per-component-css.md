# ADR 015 — Per-component Blazor CSS and aligned React registry layout

- **Status:** Accepted
- **Date:** 2026-10-24
- **Supersedes:** The single-file delivery part of [ADR 007](007-blazor-shared-theme.md).

## Context

Blazor's single compiled stylesheet includes every component, even when an app installs only Button. Editing one component's rules also changes a shared asset. React already delivers source-owned component partials, but its flat registry mixes components with foundation and starter items.

## Decision

- Compile `registry/blazor/styles/raxui.css` from the theme core only: tokens, accents, appearances, motion, materials, and text. Compile each styled component independently into `styles/components/<name>.css`. Load definitions-only variables and mixins at compile time; emit core CSS once. `_input-mixins.scss` is a helper, not a component asset. Build `_starter.scss` into `starter/starter.css`, owned by the starter installed by `init`. Check every generated file with `--check`.
- `init` installs core and starter CSS. `App.razor` retains one link to `css/raxui/raxui.css`. Its leading marked import list starts with `@import url("starter.css");`; CSS imports must precede all style rules.
- Each component manifest declares its compiled CSS as a `css` asset with destination `styles` and target `components/<name>.css`. `add` installs assets under `wwwroot/css/raxui/` and records them in that component's lock entry. Edited component CSS is kept, including on repeated adds; its original installed hash remains unchanged.
- `add` appends `@import url("components/<name>.css");` once per styled component, dependencies first. Components without styles add no import. Installed dependencies keep their files and imports.
- Plan all files and the import edit before writing ([ADR 003](003-installation-and-registry-contract.md)). Require a tracked core, its exact installed hash, the same registry source hash, and matching core bytes outside the marked list. Refuse manually edited or unknown core files with restore instructions; custom rules belong in another stylesheet or the component CSS. Edit only the import list, use `FileBackup`, roll back on failure, and write the lock last. Record the core's source hash separately from its installed hash, which includes imports. Re-running `init` preserves imports.
- Keep global CSS. CSS isolation attributes prevent components from styling descendants rendered by other components, such as a FormRow's input.
- Move React component items into `registry/react/components/<name>/`. Keep `foundation/` and `index.json` at the registry root. Rename the Vite starter item and folder to `starter-react`, alongside `starter-next`. Consumer paths and React CSS installation behavior stay the same.
- No migration for previously installed monolithic CSS; RaxUI is pre-release.

## Alternatives Considered

- **Keep all CSS in core:** ships unused styles and couples component ownership.
- **One link per component:** requires host markup changes for every install.
- **CSS isolation:** breaks shared styling across component boundaries.
- **Rewrite arbitrary user CSS:** cannot reliably preserve intent and exceeds the installer's safety contract.

## Consequences

- Apps load only core, starter, and installed components' CSS, through one host link.
- Each component's styles can be customized independently.
- Generated files, manifests, aliases, tests, and hashes must follow the registry layout together.
- Manual edits to core require restoring the installed copy before further CLI installs.
