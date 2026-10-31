# ADR 002 — First Milestone Scope

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

The long-term repository map in `ARCHITECTURE.md` lists several CLI commands, templates, samples, and test projects. Building all of them before one installation works end to end risks unused structure and late discovery of core problems: CSS loading, namespace handling, and safe file writes.

## Decision

The first implementation milestone delivers one complete workflow: `raxui init` followed by `raxui add button` in a supported project.

In scope:

- `init` and `add button`.
- `raxui.json` configuration and `raxui.lock.json` lock metadata from the first installation, including baseline file hashes.
- Refusing an installation that would overwrite an unknown or locally modified file.
- One tested support target: a .NET 10 Blazor Web App with Interactive Server, including prerendering.
- Only the projects this workflow needs. Further projects are added when a concrete responsibility justifies them.

Deferred:

- `list`, `update`, `diff`, `remove`, `doctor`, `theme init`, and `bootstrap update`.
- Diff generation and update workflows.
- Static SSR-only applications, standalone WebAssembly, Interactive Auto, and other hosting models, until each is tested. ([ADR 021](021-blazor-render-modes.md) adds static SSR, WebAssembly and Auto Blazor Web Apps.)

Reusable components do not hard-code `@rendermode`. The consumer selects interactivity at the page or application boundary.

## Alternatives Considered

- **Scaffold the full repository map first:** Produces projects without behavior and delays end-to-end feedback.
- **Support all hosting models from the start:** Multiplies the test matrix before the installation contract is proven.
- **Defer the lock file until updates exist:** Installations made without baseline hashes could never be updated safely later.

## Consequences

- The milestone is small enough to verify with an integration test that builds the generated application.
- Later commands rely on lock metadata that already exists.
- Documentation must state which targets are tested; untested targets are future support, not claimed support.
