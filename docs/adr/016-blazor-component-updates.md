# ADR 016 — Explicit Blazor Component Updates

- **Status:** Accepted
- **Date:** 2026-10-24
- **Supersedes:** The deferred Blazor update workflow in ADR 004; all installation safety rules remain.

## Context

Source-owned applications keep their installed component bytes when the library changes.
Reinitializing a showcase must not overwrite its customized starter pages or reset its lock baseline.

## Decision

`raxui update [component] [--dry-run]` uses the current CLI's embedded registry.
Without a component name it updates every installed component except `starter`.
A named component must already be installed. Dependencies are resolved and updated
in the same transaction, including newly required components.

For each managed component file, compare current bytes, the recorded installed
hash, and the next registry source hash:

- Current bytes match next source: accept and refresh the baseline.
- Current bytes match the installed hash: replace with next source if different.
- Only current bytes changed: preserve them and retain the old baseline.
- Both current bytes and source changed: report a conflict; write nothing.

Untracked collisions and locally deleted managed files are conflicts. Obsolete
files are deleted only if their bytes still match the installed hash; obsolete
modified files conflict. Namespace imports are adjusted for component folder changes.

The core stylesheet must still match its recorded installed hash. Replace its
core body from the new embedded release, preserving starter and unrelated imports,
adding dependency CSS once and dropping imports for removed component assets.
Starter source, starter CSS, app layout, app styles and Bootstrap are outside update scope.

Plan and validate manifest hashes, path ownership, link containment, imports,
configuration and lock paths before writing. Any conflict aborts the complete
transaction, including the shared theme. Dry runs report the plan and conflicts
without writing. Apply through FileTransaction, save configuration, then save the lock
last; ordinary write failures restore prior bytes and abrupt termination is recovered
as described in ADR 018. Concurrent edits are not covered by the rollback guarantee.

## Consequences

- Existing lock schema and source/installed hashes provide the baseline; no schema migration is needed.
- No force overwrite, automatic three-way merge, remote registry or Node CLI update is introduced.
- `init` and `add` continue refusing a different source snapshot and point to `update`.
- A newer registry release still requires a newer CLI package; updating that package alone changes no app files.
