# ADR 007 — Blazor Uses the Shared Theme

> The single-file CSS delivery decision is superseded by [ADR 015](015-per-component-css.md). The shared theme and global styling decisions remain in effect.

- **Status:** Accepted
- **Date:** 2026-10-23
- **Supersedes:** The component-styling part of [ADR 001](001-hybrid-css.md). Completes the Blazor migration deferred by [ADR 005](005-multi-framework-shared-theme.md).

## Context

ADR 005 made `theme/scss/` the single theme for both libraries but left Blazor on its earlier `tokens.css`, `themes.css`, and isolated `Button.razor.css`. The two Buttons therefore looked different (Blazor near-black, React Bootstrap blue) and Blazor had no `default`/`flat`/`glass` appearances, accents, or density.

Blazor consumers have no Sass build (ADR 001), and the supported template already ships precompiled Bootstrap 5.3.

## Decision

- **One compiled stylesheet.** `theme/build-css.mjs` compiles the theme core and every component's styles (`theme/scss/components/`) into `registry/styles/raxui.css`, without Bootstrap. The theme uses no Bootstrap Sass API, only Bootstrap's CSS variables and `.btn` rules at runtime, which the template's `bootstrap.min.css` provides. A test fails when the committed file is stale.
- **`init` installs it.** `init` copies `raxui.css` to `wwwroot/css/raxui/` and links it once in `App.razor`, after Bootstrap and before the `{AssemblyName}.styles.css` bundle. `tokens.css` and `themes.css` are no longer shipped. When `App.razor` still links them, `init` says so and leaves the edit to the developer.
- **Shared component styles.** Component SCSS lives in `theme/scss/components/` and is used by both libraries: React installs the partial, Blazor gets it inside `raxui.css`. Themed Blazor components no longer use `.razor.css` isolation, so `add button` installs only `Button.razor`.
- **Same markup and options.** The Blazor Button renders the React Button's classes (`btn rax-button btn-glass btn-glass-{variant}` plus size classes) and accepts the same options: `Variant`, `Size`, `Appearance`, `Color`, plus `Type`, `Disabled`, `Class`, `OnClick`, and additional attributes.
- **Theme propagation through the DOM.** Blazor components render inline, so CSS custom properties inherit from any ancestor carrying the theme attributes (`data-rax-appearance`, `data-bs-theme`, `data-rax-accent`, `data-rax-density`, `dir`). A component's `Appearance` renders `data-rax-appearance` on its own element. No `CascadingValue` is needed until a component renders outside its parent's DOM subtree.
- **New release.** Registry content changed, so the .NET CLI version moves to `0.1.0-preview.2`.

## Alternatives Considered

- **Compile Bootstrap into `raxui.css`:** Duplicates the template's Bootstrap and conflicts with it.
- **Keep `.razor.css` with compiled button rules:** CSS isolation scopes the last selector to the component's own elements, which breaks rules that target child content (icons) and ancestor theme attributes would still need global tokens.
- **One stylesheet per component, linked by `add`:** More `App.razor` edits, rejected by ADR 001.

## Consequences

- Blazor and React Buttons look the same and support every appearance, accent, density, mode, and direction.
- `raxui.css` contains styles for every component in the release, installed or not. It is small (about 19 KB) and versioned with the CLI.
- Template Bootstrap keeps its own radii and font; the theme's Sass overrides in `_variables.scss` apply only to React, which compiles Bootstrap itself.
- Projects installed with `0.1.0-preview.1` keep their files; `add button` refuses to replace the old Button because its source changed. Migrating such a project means removing the old Button, stylesheets, links, and lock entries, then running `init` and `add button` again.
