# ADR 022 — RaxUI identity

- **Status:** Accepted
- **Date:** 2026-10-31
- **Supersedes:** [ADR 012](012-sheenui-identity.md)

## Context

SheenUI reads close to unwanted words for English speakers, which hurts a
library meant for a global audience. The project has not been published, so a
rename now costs no users.

## Decision

The project is now **RaxUI**. The name is short, reads as technical, and echoes
Razor/Blazor. No npm or NuGet publication is part of this change.

| Surface | New identity |
| --- | --- |
| GitHub repository | `raxui/RaxUI` |
| .NET solution and namespaces | `RaxUI.slnx`, `RaxUI.Cli` |
| .NET tool package and command | `RaxUI`, `raxui` |
| Node package and command | `@raxui/react`, `raxui-react` |
| Blazor state | `raxui.json`, `raxui.lock.json` |
| React state | `raxui.react.json`, `raxui.react.lock.json` |
| Installed theme | `raxui.css` / `raxui.scss` |
| CSS classes, custom properties, appearance attributes | `rax-*`, `--rax-*`, `data-rax-*` |
| React theme API | `RaxThemeProvider`, `RaxAppearanceScope`, `useRaxTheme` |

## Existing applications

As with ADR 012, this is an identity change, not an automatic update of
installed source. Both installers stop before writing if they find BlazorUI or
SheenUI config or lock files, and leave those files untouched. To migrate,
initialize a fresh application with RaxUI and port custom component edits and
CSS/API references by hand.
