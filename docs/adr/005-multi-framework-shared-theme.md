# ADR 005 — Multi-Framework Repository and Shared Theme

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

BlazorUI now also targets React. A separate project, [boot-ui](https://github.com/SaadAlsaree/boot-ui), already provides React components built on Radix UI behaviour and Bootstrap 5.3 SCSS, with a theme that offers `default`, `flat`, and `glass` appearances, accents, density, light/dark mode, and RTL.

The goal is one visual identity across both frameworks. Keeping Blazor and React in separate repositories, or letting each own its tokens, lets the two looks drift. Today they already differ: BlazorUI's `tokens.css` and boot-ui's `_tokens.scss` both use the `--bui-` prefix with unrelated token names.

## Decision

### One repository

The Blazor library, the React library, and their shared theme live in this repository. Changes to the theme are built and tested against both libraries in the same pull request.

### boot-ui is copied once

The boot-ui theme and the components this repository needs are copied once, from boot-ui commit `4b973e103077eec2ba19025b8c71093449023232`. After the copy, this repository is the only source of truth. boot-ui stays read-only, as a reference for comparison. It is not a submodule or a package dependency.

### What is shared and what is framework-specific

| Shared (one contract) | Framework-specific |
| --- | --- |
| Theme source in `theme/scss/`: tokens, appearance, accents, density, mixins, materials | Component source: `.tsx` for React, `.razor` for Blazor |
| Theme attributes: `data-bs-theme`, `data-bui-appearance`, `data-bui-accent`, `data-bui-density`, `dir` | Behaviour: Radix UI for React; Blazor-native code for Blazor |
| Component class names (for example `btn bui-button btn-glass btn-glass-{variant}`) and component styles | Theme propagation: React context for React; `CascadingValue` for Blazor (later) |
| Registry concepts: manifest `schemaVersion`, SHA-256 per file | Installer: Node CLI (`npx`) for React; `dotnet tool` for Blazor |
| Install safety rules: refuse unknown or modified files, path and link checks, staged writes with rollback, lock written last, refuse files from a newer release | Style delivery: SCSS for React; precompiled CSS for Blazor (later) |
| The package version is the registry version ([ADR 004](004-simplified-first-milestone.md)) | Package manager: npm for React; NuGet for Blazor |

The theme attributes are the contract. Any component in either framework reads its look from CSS custom properties resolved under these attributes, so a theme change needs no component code change.

### Blazor migration is deferred

The Blazor library keeps its current `tokens.css`, `themes.css`, and isolated `.razor.css` styles ([ADR 001](001-hybrid-css.md)) until a later ADR moves it to the shared theme. That ADR will decide how Blazor consumes the compiled theme CSS and how isolated styles give way to the shared component styles.

## Alternatives Considered

- **Separate repositories per framework:** Theme changes cannot be verified against both libraries at once, and the looks drift.
- **Depend on boot-ui as a submodule or npm package:** Two sources of truth; every theme change has to land in boot-ui first.
- **Keep BlazorUI's current tokens as the shared theme:** They lack appearances, accents, and density, and boot-ui's set is broader and already tested.

## Consequences

- The repository gains a Node toolchain beside the .NET toolchain, and CI gains a Node job.
- Theme changes can break either library; both test suites run on every change.
- Until the Blazor migration, the two libraries look different and use different `--bui-*` names. Apps use one framework, so the names do not collide inside one app.
- boot-ui fixes made after the copy commit are not picked up automatically; porting them is a deliberate change here.
