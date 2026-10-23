# ADR 008 — Starter App Replaces the Template Shell

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

After `init`, a new app still showed the framework template: the purple Blazor sidebar with Counter and Weather, or the Vite/React counter page. Nothing of SheenUI's look was visible until the developer built pages. The owner wants a fresh app to start clean, in SheenUI's own shell, in both libraries.

`init` must still never overwrite or delete the developer's work (ADR 003).

## Decision

### `init` installs a starter

Both CLIs install, as part of `init`:

- **Blazor:** `Components/Layout/MainLayout.razor` (app shell) and `Components/Pages/Home.razor` (welcome page).
- **React:** `src/App.tsx` (app shell and welcome page). The React starter requires the Button item, so `init` also installs Button and the welcome page uses it.

The shell is a header with the app name and a centered main area, styled by `theme/scss/components/_starter.scss`, shared by both libraries. The welcome page shows a theme panel (appearance, mode, accent, direction), a preview of the Button variants, and next steps.

- Blazor reads the theme from the query string (`?appearance=glass&mode=dark&accent=emerald&dir=rtl`) through `[SupplyParameterFromQuery]`, so switching works without interactivity, in any render mode. Only known values reach the attributes.
- React keeps the theme in component state and passes it to `SheenThemeProvider`.

The layout and welcome page keep Blazor's error UI and the template's `Error`, `NotFound`, and `ReconnectModal` components. The error bar's styles (`#blazor-error-ui`, hidden until `blazor.web.js` shows it) move from the removed `MainLayout.razor.css` into `_starter.scss`.

**Blazor `app.css`:** the template's `wwwroot/app.css` overrides Bootstrap buttons, links, fonts, and adds a focus ring to every `.btn:focus`, which conflicts with the theme. When it is unmodified, `init` replaces it with a minimal `app.css` that keeps only what Blazor's built-in features need: `h1:focus` for `FocusOnNavigate`, form validation classes, and the default `ErrorBoundary` content, all using Bootstrap's theme variables. A changed `app.css` is kept and reported.

### Template files are replaced only when unmodified

A template file is replaced or removed only when its content is a known version of the framework template, recognized by SHA-256 after normalizing line endings to LF and (Blazor) replacing the project name with a placeholder. Known versions: the .NET 10 `dotnet new blazor` templates with and without interactivity (Visual Studio produces the same files), and `create-vite` 9.3.1 `react-ts`.

- The layout or entry page is replaced only if unmodified. The template pages and files that only the old layout or App used (Blazor: `NavMenu`, `MainLayout.razor.css`, `Counter`, `Weather`; React: `App.css`, `index.css` and its import, `assets/*`, `public/icons.svg`) are removed only once the starter owns the layout or App, and only if unmodified.
- A changed or unknown file is kept and reported. Starter files never make `init` fail.
- Starter files are tracked in the lock as the `starter` item. After installation they belong to the developer: a later `init` refreshes an unchanged starter file from the same release and leaves edited or deleted ones alone.
- Removals go through the same rollback as writes.

## Alternatives Considered

- **A separate opt-in command (`init --starter`):** Safer for existing projects, but the owner wants every new app to start clean, and the unmodified-template rule already protects existing work.
- **Point `Routes.razor` at a new layout and leave template files:** The template pages stay routable and the `/` route would conflict with the welcome page.
- **Replace template files without checking them:** Destroys work in projects that customized the template.

## Consequences

- A new app opens on the SheenUI welcome page in both frameworks, with the same look.
- New template versions are not recognized until their hashes are added; until then `init` keeps those files and says so. The real-app tests in CI catch a template change.
- React apps get Button from `init`; `add button` afterwards is a no-op.
- The welcome page is example content; developers are expected to replace it.
