# ADR 004 — Simplified First Milestone

- **Status:** Accepted
- **Date:** 2026-10-23
- **Supersedes:** Parts of [ADR 003](003-installation-and-registry-contract.md) for the first milestone only, as listed below. [ADR 002](002-first-milestone-scope.md) remains in force; this ADR narrows its scope further.

## Context

ADR 002 limits the first milestone to `blazorui init` and `blazorui add button`. Even within that scope, ADR 003 and the brief require a hosted remote registry, CLI-managed Bootstrap assets, and configurable component paths with namespace-token substitution. None of these is needed to prove the core workflow: copying owned source into a project, loading its styles, and refusing to overwrite local changes. Each one adds hosting, download, validation, or templating work before the first end-to-end test can run.

## Decision

For the first milestone:

### 1. Embedded registry

- The registry ships as embedded resources inside the CLI package (`BlazorUI.Cli`).
- The CLI package version is the registry version. NuGet package versions are immutable, so each CLI release is an immutable registry snapshot, as ADR 003 requires.
- No remote download, HTTPS transport, or registry hosting is implemented. A remote registry is deferred.
- Manifests keep `schemaVersion`, per-file SHA-256 hashes, and path validation from ADR 003. Embedded content is still validated before any write.
- `blazorui.lock.json` still records the registry version and the manifest digest.

### 2. Template Bootstrap

- `init` uses the Bootstrap already shipped by `dotnet new blazor` in `wwwroot/lib/bootstrap/`.
- If Bootstrap is missing, `init` fails with an actionable message and writes nothing.
- The CLI does not install, pin, or update its own Bootstrap copy. Managed Bootstrap and `blazorui bootstrap update` are deferred.

### 3. No custom namespace

- Components install to `Components/UI`; shared styles install to `wwwroot/css/blazorui`. Neither path is configurable.
- Components declare no `@namespace`. Razor derives the namespace from the folder: `<RootNamespace>.Components.UI`. `init` adds that `@using` once to `Components/_Imports.razor`.
- No template-token substitution. The installed hash equals the registry source hash; the lock file still stores both fields so later substitution needs no schema change.
- Custom `componentsPath`, `stylesPath`, and `componentsNamespace` are deferred. Brief §14 criterion 5 is removed from this milestone.

### Superseded parts of ADR 003

| ADR 003 section | Status in the first milestone |
| --------------- | ----------------------------- |
| Registry releases (hosted snapshots) | Replaced by the embedded registry; immutability via the CLI package version. |
| Namespaces (override, token substitution) | Deferred; Razor folder-derived namespace only. |
| Path safety: HTTPS for remote registries | Not applicable until a remote registry exists. |

All other ADR 003 rules stay in force: manifest validation, lock file contents, staged writes with rollback, lock file written last, conflict refusal, and path-escape checks.

## Alternatives Considered

- **Keep ADR 003 as written:** Delays the first end-to-end test behind hosting, download, and templating work that does not test the core workflow.
- **Remote registry from day one:** Adds HTTPS, caching, and failure handling before the manifest schema is proven.
- **Managed Bootstrap from day one:** Duplicates assets the supported template already provides and adds an update path nobody uses yet.
- **Configurable namespace via text tokens:** Needs a substitution step and two diverging hashes per file, for a feature no first-milestone user needs.

## Consequences

- The first milestone needs no network access at install time.
- A registry fix requires a new CLI release.
- Projects without template Bootstrap are unsupported in this milestone.
- Projects that want components outside `Components/UI` must wait for the deferred configuration work.
- When a remote registry, managed Bootstrap, or custom namespaces arrive, a new ADR reinstates the relevant ADR 003 sections. Existing lock files remain valid because their schema is unchanged.
