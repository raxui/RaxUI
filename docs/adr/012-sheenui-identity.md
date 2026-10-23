# ADR 012 — SheenUI identity

Status: Accepted

## Decision

The project previously called BlazorUI is now **SheenUI**, covering both Blazor
and React (including Next.js). No npm or NuGet publication is part of this change.

| Surface | New identity |
| --- | --- |
| GitHub repository | `SaadAlsaree/SheenUI` |
| .NET solution and namespaces | `SheenUI.slnx`, `SheenUI.Cli` |
| .NET tool package and command | `SheenUI.Cli`, `sheenui` |
| Node package and command | `sheenui-react` |
| Blazor state | `sheenui.json`, `sheenui.lock.json` |
| React state | `sheenui.react.json`, `sheenui.react.lock.json` |
| Installed theme | `sheenui.css` / `sheenui.scss` |
| CSS classes, custom properties, appearance attributes | `sheen-*`, `--sheen-*`, `data-sheen-*` |
| React theme API | `SheenThemeProvider`, `SheenAppearanceScope`, `useSheenTheme` |

Bootstrap's `bs-*` attributes and variables remain Bootstrap's API. The
`boot-ui` repository remains the historical theme reference; its attribution
and source URL are preserved.

## Existing applications

This is an intentional identity change before public distribution, not an
automatic update of installed source. Both installers stop before writing if
they find old BlazorUI config or lock files. They do not rename or delete those
files. Old applications can continue using their existing tool and installed
components.

For local testing, create a fresh application and initialize it with SheenUI.
For manual migration, back up the old application, initialize a separate fresh
application, and compare its component, theme, imports and config against the
old project. Merge custom component edits and update all CSS/API references
together. Do not just rename or remove the old lock file: its hashes describe
different source bytes and target paths. Automatic source merging and
compatibility aliases are outside this phase.

## Verification and rollback

Regenerate the shared CSS and every affected registry hash. Verify .NET 8/9/10
installation, Vite and Next.js initialization/build/browser behavior, repeated
installation, preservation of local edits, and rejection of old state.

The rename is delivered as a PR on `saad`. Reverting the PR restores the former
code identity; installations already created with SheenUI must keep their
matching CLI or be migrated separately. Reverting the code does not rewrite
consumer applications. A GitHub repository rename can be reversed independently.

The local checkout directory is renamed to `C:\Users\saada\source\repos\SheenUI`
after verification and PR creation. This filesystem operation is separate from
the Git patch. Other checkouts can retain their existing folder name; substitute
the actual checkout path in documentation examples.
