# SheenUI for React

Source-owned React components on Bootstrap 5.3 SCSS and Radix UI, with the shared SheenUI theme: `default`, `flat`, and `glass` appearances, light and dark mode, accents, density, and RTL. It supports **React 18.3 or 19 with TypeScript** on **Vite 6 or later** or **Next.js 15 or later (App Router, without Tailwind)**, and the **Button** component ([ADR 006](adr/006-react-first-milestone.md), [ADR 010](adr/010-vite-6-and-later.md), [ADR 011](adr/011-nextjs.md)).

## Install

The CLI is not published to npm yet; install it from a packed tarball. From this repository:

```sh
npm ci
npm pack ./src/react-cli --pack-destination .
```

In a React + Vite (TypeScript) app:

```sh
npm install -D --save-exact --ignore-scripts /path/to/sheenui-react-0.1.0-preview.1.tgz
npx sheenui-react init
npx sheenui-react add button
```

`init`:

- copies `src/lib/theme.tsx`, `src/lib/utils.ts`, and the theme partials into `src/styles/sheenui/`;
- creates `src/styles/sheenui.scss` (theme variables, then Bootstrap, then the theme core);
- adds `import "./styles/sheenui.scss"` as the first line of `src/main.tsx` (or `src/main.jsx`);
- installs Button (`src/components/ui/button.tsx` and its style partial), used by the welcome page;
- replaces the unmodified Vite template `src/App.tsx` with a SheenUI app shell and welcome page where you can try the theme, and removes the template files only that App used (`App.css`, `index.css` and its import, `src/assets/*`, `public/icons.svg`). Files you changed are kept and reported ([ADR 008](adr/008-starter-app.md));
- installs missing packages (`bootstrap`, `sass`, `clsx`, `@radix-ui/react-slot`) with `npm install --save-exact --ignore-scripts`.

`add <component>` copies a component and its style partial and adds the style import to `src/styles/sheenui.scss`. `add button` after `init` changes nothing, since Button is already installed.

Options: `--cwd <dir>`, `--no-install` (print the npm command instead of running it). With Yarn, pnpm, or Bun lockfiles the CLI prints the command for you to run.

If your entry already imports Bootstrap CSS (for example `bootstrap/dist/css/bootstrap.min.css`), remove that import first: Bootstrap is compiled from SCSS in `src/styles/sheenui.scss`.

## Next.js

In a Next.js 15+ App Router project created without Tailwind (`npx create-next-app@latest --ts --app --no-tailwind`), the same commands work. The CLI detects Next.js and:

- installs into the project root, or into `src/` when you used `--src-dir`;
- creates `styles/sheenui.scss`, which imports Bootstrap by path (`../node_modules/bootstrap/scss/bootstrap`), and imports it as the first line of `app/layout.tsx`. Your layout is kept;
- replaces the unmodified template `app/page.tsx` with the welcome page (a client component), and removes the template `page.module.css`, `globals.css` (and its import), and `public/*.svg`. Changed files are kept and reported;
- installs `lib/theme.tsx` and `components/ui/button.tsx` with `"use client"`, so use them from client components or pass them into server components as children.

Tailwind projects, the Pages Router, JavaScript layouts, and Next.js 14 or older are rejected with a message ([ADR 011](adr/011-nextjs.md)).

## Tooling diagnostics

`init` configures plain Vite `defineConfig({ ... })` and Next.js `nextConfig`
template objects for Bootstrap 5 Sass compatibility. It suppresses only the
`import`, `global-builtin`, `color-functions`, and `if-function` deprecation
categories, which Bootstrap 5 still uses. This is temporary compatibility
configuration, not a migration of Bootstrap to modern Sass. Other Sass warnings
and compilation errors remain enabled. These category settings also apply to
your own SCSS in the same build.
Next.js also suppresses `legacy-js-api`, because Next 15's Turbopack loader uses
that Sass API; this does not change the loader's implementation.

For Vite the options go in `css.preprocessorOptions.scss.silenceDeprecations`;
for Next.js they go in `sassOptions.silenceDeprecations`:

```ts
silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"]
```

For plain Next.js templates, `init` also sets `turbopack.root` and
`outputFileTracingRoot` to the config file's directory (`__dirname`, or
`import.meta.dirname` for ES module configs) so unrelated parent lockfiles do not
change the application root, wherever the command runs from.
Monorepos or linked packages may need a shared parent root instead.
Existing CSS/Sass/root settings, spreads, and unsupported config shapes are kept
and reported for manual setup. Review custom settings before merging these options.
Windows package installation runs `npm-cli.js` directly with Node, without a shell.

## Use

```tsx
import { Button } from "./components/ui/button"
import { SheenAppearanceScope, SheenThemeProvider } from "./lib/theme"

export default function App() {
  return (
    <SheenThemeProvider appearance="default" mode="light" direction="ltr" density="comfortable">
      <Button onClick={() => alert("Saved")}>Save</Button>
      <Button variant="outline" size="sm">Cancel</Button>
      <Button color="success">Approve</Button>
      <Button asChild variant="link">
        <a href="/docs">Docs</a>
      </Button>

      <SheenAppearanceScope appearance="glass">
        <Button>Glass</Button>
        <Button appearance="flat">Flat override</Button>
      </SheenAppearanceScope>
    </SheenThemeProvider>
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

### Dialog and DropdownMenu

`npx sheenui-react add dialog` and `npx sheenui-react add dropdown-menu` install wrappers over Radix with the shared styles ([ADR 013](adr/013-overlay-primitives.md)). Their content renders inside the nearest `SheenThemeProvider`, so mode, appearance, accent, and direction apply to it.

```tsx
<Dialog>
  <DialogTrigger asChild><Button variant="destructive">Delete…</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete file?</DialogTitle>
      <DialogDescription>This cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button variant="destructive" onClick={remove}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="secondary">Options</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuItem onSelect={edit}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem disabled>Archive</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

`DialogContent` also takes `appearance`, `showCloseButton`, and `closeLabel`; `DropdownMenuContent` takes `appearance` and every Radix content prop (it defaults to `align="start"` and `sideOffset={4}`).

### ConfirmDialog

`npx sheenui-react add confirm-dialog` installs boot-ui's confirmation on Radix AlertDialog (it also installs Button). A click outside nudges it instead of closing; focus starts on Cancel.

```tsx
<ConfirmDialog
  trigger={<Button variant="destructive">Delete project</Button>}
  title="Delete project?"
  description="This removes it for everyone."
  tone="destructive"
  confirmText="Delete"
  confirmationText="my-app"
  onConfirm={() => api.deleteProject()} // a promise keeps it open with a spinner; a rejection shows its message
/>
```

Props: `tone` (`default`, `destructive`, `warning`, `success`), `icon`, `cancelText`, `confirmationLabel`, `layout` (`inline` or `stacked`), `appearance`, `open`/`defaultOpen`/`onOpenChange`, and `onCancel`. The file also exports the `AlertDialog*` parts for custom layouts.

Appearance precedence: the component's `appearance`, then the nearest `SheenAppearanceScope`, then `SheenThemeProvider`, then `default`. `mode`, `direction`, and `density` travel the same way.

## Customize

- **Bootstrap variables:** set them at the top of `src/styles/sheenui.scss`, above the imports, for example `$primary: #0a84ff;`.
- **Theme tokens:** override `--sheen-*` custom properties in your own CSS, for example `--sheen-radius-control` or `--sheen-glass-blur`.
- **Accent:** add `data-sheen-accent="emerald"` (or `indigo`, `amber`) on `<html>` or any wrapper.
- **Source:** component files such as `button.tsx` and `_button.scss` are yours to edit. Repeated `init`/`add` never overwrite files you changed.

Users who set their system to reduce transparency get opaque glass automatically.

## Guarantees and limits

- `sheenui.react.json` and `sheenui.react.lock.json` record the CLI release and SHA-256 hashes of installed files.
- Unknown files, locally modified files, and files from another release are never silently replaced. Paths that escape the project, including through symlinks or junctions, are rejected.
- Ordinary write failures restore original files and remove new empty folders.
- Sass prints `@import` deprecation warnings that come from Bootstrap 5.3 itself.
- Only React on Vite 6+ or Next.js 15+ (App Router, no Tailwind) and the Button, Dialog, ConfirmDialog, and DropdownMenu components are supported. The welcome page replaces the `create-vite` 6.x–9.x `react-ts` App or the `create-next-app` 15.x–16.x page; other templates are kept and reported. Other components, `update`/`diff`, path aliases, and other build tools are future work.
