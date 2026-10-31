# ADR 003 — Installation and Registry Contract

- **Status:** Accepted; partially superseded for the first milestone by [ADR 004](004-simplified-first-milestone.md)
- **Date:** 2026-10-23

## Context

The CLI writes downloaded source into a developer-owned project. Installations must be reproducible, must not damage the project on failure, and must treat registry content as untrusted until validated.

## Decision

### Registry releases

- Published registry releases are immutable, versioned snapshots.
- `raxui.json` selects an exact `registryVersion`. Installation never resolves through a mutable branch such as `main` or an unpinned `latest` URL.
- Each snapshot pins exact component and asset versions. Corrections require a new release.

### Manifests

- Manifests declare a `schemaVersion`. Unsupported schema versions and file types are rejected before any write.
- Each file entry declares `source`, `destination`, `target`, `type`, and a SHA-256 hash. `destination` selects a configured base directory; `target` is relative to it.
- Manifests declare framework requirements, shared asset references, and exact dependency versions.

### Namespaces

- The CLI reads the evaluated MSBuild `RootNamespace` and `AssemblyName`. It does not infer them from folder names.
- `componentsNamespace` defaults to `<RootNamespace>.Components.UI` and can be overridden in `raxui.json`.
- Registry templates use explicit, documented namespace tokens. The CLI substitutes only those tokens, never broad text replacement, and validates the resulting namespace.
- Generated components declare the namespace explicitly. Its `@using` is added once to the applicable `_Imports.razor`.
- Changing `componentsPath` or `componentsNamespace` later is a migration, not an implicit move during `add`.

### Lock file

`raxui.lock.json` records, in addition to component versions and paths:

- The exact registry release identity and manifest digest.
- The registry source hash and the installed hash after namespace substitution, stored separately.

### Writing files

1. Validate the complete installation plan before writing anything.
2. Stage files and preserve originals for rollback.
3. Write the lock file last.

An ordinary failure restores previous contents and removes newly created files. Interrupted-process recovery is specified in ADR 017 (React) and ADR 018 (Blazor).

Repeated commands must not duplicate links or imports, adopt unknown files, or overwrite modified files.

### Path safety

Reject rooted paths, traversal segments, and destinations that escape the selected project, including escapes through symlinks or junctions. Use HTTPS for remote registries and never execute downloaded scripts during installation.

## Alternatives Considered

- **Install from `main` or `latest`:** Not reproducible, and a compromised or broken commit reaches every user immediately.
- **Text replacement of the registry namespace:** Can corrupt unrelated identifiers and strings.
- **Write files directly without staging:** A mid-install failure leaves the project inconsistent.
- **Single hash per file:** Cannot distinguish an upstream change from a local modification after namespace substitution.

## Consequences

- Any installation can be reproduced from `raxui.json` and the lock file.
- Publishing a fix requires cutting a registry release.
- The installer is more complex than a direct copy, but failures leave the project as it was.
- Future `update` and `diff` commands can compare source and installed hashes without guessing.
