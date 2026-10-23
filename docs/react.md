# BlazorUI for React

Source-owned React components on Bootstrap 5.3 SCSS and Radix UI, with the shared BlazorUI theme: `default`, `flat`, and `glass` appearances, light and dark mode, accents, density, and RTL. It supports **React 18.3 or 19 with TypeScript** on **Vite 6 or later** or **Next.js 15 or later (App Router, without Tailwind)**, and the **Button** component ([ADR 006](adr/006-react-first-milestone.md), [ADR 010](adr/010-vite-6-and-later.md), [ADR 011](adr/011-nextjs.md)).

## Install

The CLI is not published to npm yet; install it from a packed tarball. From this repository:

```sh
npm ci
npm pack ./src/react-cli --pack-destination .
```

In a React + Vite (TypeScript) app:

```sh
npm install -D --save-exact --ignore-scripts /path/to/blazorui-react-0.1.0-preview.1.tgz
npx blazorui-react init
npx blazorui-react add button
```

`init`:

- copies `src/lib/theme.tsx`, `src/lib/utils.ts`, and the theme partials into `src/styles/blazorui/`;
- creates `src/styles/blazorui.scss` (theme variables, then Bootstrap, then the theme core);
- adds `import "./styles/blazorui.scss"` as the first line of `src/main.tsx` (or `src/main.jsx`);
- installs Button (`src/components/ui/button.tsx` and its style partial), used by the welcome page;
- replaces the unmodified Vite template `src/App.tsx` with a BlazorUI app shell and welcome page where you can try the theme, and removes the template files only that App used (`App.css`, `index.css` and its import, `src/assets/*`, `public/icons.svg`). Files you changed are kept and reported ([ADR 008](adr/008-starter-app.md));
- installs missing packages (`bootstrap`, `sass`, `clsx`, `@radix-ui/react-slot`) with `npm install --save-exact --ignore-scripts`.

`add <component>` copies a component and its style partial and adds the style import to `src/styles/blazorui.scss`. `add button` after `init` changes nothing, since Button is already installed.

Options: `--cwd <dir>`, `--no-install` (print the npm command instead of running it). With Yarn, pnpm, or Bun lockfiles the CLI prints the command for you to run.

If your entry already imports Bootstrap CSS (for example `bootstrap/dist/css/bootstrap.min.css`), remove that import first: Bootstrap is compiled from SCSS in `src/styles/blazorui.scss`.

## Next.js

In a Next.js 15+ App Router project created without Tailwind (`npx create-next-app@latest --ts --app --no-tailwind`), the same commands work. The CLI detects Next.js and:

- installs into the project root, or into `src/` when you used `--src-dir`;
- creates `styles/blazorui.scss`, which imports Bootstrap by path (`../node_modules/bootstrap/scss/bootstrap`), and imports it as the first line of `app/layout.tsx`. Your layout is kept;
- replaces the unmodified template `app/page.tsx` with the welcome page (a client component), and removes the template `page.module.css`, `globals.css` (and its import), and `public/*.svg`. Changed files are kept and reported;
- installs `lib/theme.tsx` and `components/ui/button.tsx` with `"use client"`, so use them from client components or pass them into server components as children.

Tailwind projects, the Pages Router, JavaScript layouts, and Next.js 14 or older are rejected with a message ([ADR 011](adr/011-nextjs.md)).

## Use

```tsx
import { Button } from "./components/ui/button"
import { BootAppearanceScope, BootThemeProvider } from "./lib/theme"

export default function App() {
  return (
    <BootThemeProvider appearance="default" mode="light" direction="ltr" density="comfortable">
      <Button onClick={() => alert("Saved")}>Save</Button>
      <Button variant="outline" size="sm">Cancel</Button>
      <Button color="success">Approve</Button>
      <Button asChild variant="link">
        <a href="/docs">Docs</a>
      </Button>

      <BootAppearanceScope appearance="glass">
        <Button>Glass</Button>
        <Button appearance="flat">Flat override</Button>
      </BootAppearanceScope>
    </BootThemeProvider>
  )
}
```

Button props:

| Prop | Values |
| --- | --- |
| `variant` | `default`, `solid`, `secondary`, `tinted`, `destructive`, `outline`, `ghost`, `link` |
| `size` | `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg` |
| `appearance` | `default`, `flat`, `glass` (inherits when omitted) |
| `color` | `primary`, `secondary`, `success`, `danger`, `warning`, `info`, or any Bootstrap theme color name |
| `asChild` | Render the child element (for example a link) with the button styles |

Plus every native `<button>` attribute and a forwarded `ref`. `type` defaults to `button`, so buttons do not submit forms unless you pass `type="submit"`.

Appearance precedence: the component's `appearance`, then the nearest `BootAppearanceScope`, then `BootThemeProvider`, then `default`. `mode`, `direction`, and `density` travel the same way.

## Customize

- **Bootstrap variables:** set them at the top of `src/styles/blazorui.scss`, above the imports, for example `$primary: #0a84ff;`.
- **Theme tokens:** override `--bui-*` custom properties in your own CSS, for example `--bui-radius-control` or `--bui-glass-blur`.
- **Accent:** add `data-bui-accent="emerald"` (or `indigo`, `amber`) on `<html>` or any wrapper.
- **Source:** `button.tsx` and `_button.scss` are yours to edit. Repeated `init`/`add` never overwrite files you changed.

Users who set their system to reduce transparency get opaque glass automatically.

## Guarantees and limits

- `blazorui.react.json` and `blazorui.react.lock.json` record the CLI release and SHA-256 hashes of installed files.
- Unknown files, locally modified files, and files from another release are never silently replaced. Paths that escape the project, including through symlinks or junctions, are rejected.
- Ordinary write failures restore original files and remove new empty folders.
- Sass prints `@import` deprecation warnings that come from Bootstrap 5.3 itself.
- Only React on Vite 6+ or Next.js 15+ (App Router, no Tailwind) and the Button component are supported. The welcome page replaces the `create-vite` 6.x–9.x `react-ts` App or the `create-next-app` 15.x–16.x page; other templates are kept and reported. Other components, `update`/`diff`, path aliases, and other build tools are future work.
