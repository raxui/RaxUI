# Blazor guide

Install, theme and update RaxUI components in a Blazor Web App. Component notes are in [components](components.md).

## Render modes

All four Blazor Web App render modes are supported: static SSR, Interactive
Server, Interactive WebAssembly, and Interactive Auto, per page or global
([ADR 021](adr/021-blazor-render-modes.md)). Components never set
`@rendermode`; choose it on your page or in `App.razor`.

Run `raxui init` and `raxui add` in the **server project** (the one with
`Components/App.razor`). If it references a WebAssembly `.Client` project, as
`dotnet new blazor --interactivity WebAssembly` or `Auto` creates, components
are installed into `SampleApp.Client/Components/UI` so the browser can run them.
Their usings are added to the `_Imports.razor` of both projects. Styles and
configuration stay in the server project. Standalone Blazor WebAssembly apps
(`dotnet new blazorwasm`) are not supported.

```bash
dotnet new blazor --interactivity Auto -n SampleApp
cd SampleApp/SampleApp
raxui init
raxui add dialog
```

## Quick start

Install the .NET tool, then create an app:

```sh
dotnet tool install --global RaxUI --prerelease
dotnet new blazor --interactivity Server -n MyApp
cd MyApp
raxui init
raxui add button
```

`init` asks for an appearance (`default`, `flat`, `glass`) and an accent (`blue`,
`emerald`, `indigo`, `amber`) on its first run in a terminal. Skip the questions
with `raxui init --appearance glass --accent emerald`; piped or CI runs use the
flags or the defaults. The choice is saved in `raxui.json` and written as
`data-rax-appearance` and `data-rax-accent` on `<html>` in `Components/App.razor`.
`raxui add button card input` installs several components in one command.
`npx @raxui/react init` takes the same two flags (saved in `raxui.react.json`,
written on `<html>` in `index.html` or `app/layout.tsx`) and
`npx @raxui/react add button card input` adds several.

`init` replaces the template's sidebar layout and sample pages with a RaxUI
app shell and a welcome page where you can try the theme, and replaces the
template `wwwroot/app.css` with a minimal one (validation, error boundary, and
heading focus styles only), so it no longer overrides the theme's buttons. It only replaces or
removes template files you have not changed; anything you edited is kept and
reported ([ADR 008](adr/008-starter-app.md)).

Use Button in any page, for example a new `Components/Pages/Counter.razor`:

```razor
@page "/counter"
@rendermode InteractiveServer

<Button OnClick="@(() => count++)">Clicked @count times</Button>

@code {
    private int count;
}
```

`init` installs the core theme as `wwwroot/css/raxui/raxui.css`, plus the
starter's `starter.css`, and links the core after Bootstrap. `add button` copies
`Components/UI/Button/Button.razor` and `wwwroot/css/raxui/components/button.css`,
adds its namespace to `_Imports.razor`, and adds one CSS import to `raxui.css`.
Only installed components' CSS is loaded. Edit `components/button.css` to customize
Button independently; the CLI keeps those edits. Keep custom core overrides in a
separate stylesheet: the CLI manages the core's leading import list and refuses
manual changes to `raxui.css` ([ADR 015](adr/015-per-component-css.md)). Keep the template Bootstrap and
application styles links. If `Program.cs` does not enable Interactive Server (an
app created without `--interactivity Server`), `init` prints a warning with the
two lines to add; it does not edit `Program.cs`.

Button has the same options and look as the React Button:
`Variant` (`default`, `solid`, `secondary`, `tinted`, `destructive`, `outline`,
`ghost`, `link`), `Size` (`default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`),
`Appearance` (`default`, `flat`, `glass`), `Color` (a Bootstrap theme color such
as `success`), plus `Disabled`, `Type`, `Class`, and `OnClick`.

Theme any part of the page with attributes; components inherit them:

```razor
<div data-rax-appearance="glass" data-bs-theme="dark" data-rax-accent="emerald" dir="rtl">
    <Button>Glass</Button>
    <Button Appearance="flat" Color="success">Flat override</Button>
</div>
```

### Icons

Components take any icon markup. For your own icons, RaxUI recommends Lucide
through [`Blazicons.Lucide`](https://github.com/kyleherzog/Blazicons.Lucide)
([ADR 014](adr/014-icons.md)); icons follow the text color and the slot's size:

```razor
@* dotnet add package Blazicons.Lucide, then @using Blazicons in _Imports.razor *@
<Button><Blazicon Svg="Lucide.Trash" aria-hidden="true" /> Delete</Button>
```

### Dialog and DropdownMenu

`raxui add dialog` and `raxui add dropdown-menu` install overlays built on the
native `<dialog>` element and the `popover` attribute, each with a small
collocated `.razor.js` module ([ADR 013](adr/013-overlay-primitives.md)).
They need an interactive render mode, for example `@rendermode InteractiveServer`:

```razor
<Button OnClick="@(() => open = true)">Delete…</Button>
<Dialog @bind-Open="open" Title="Delete file?" Description="This cannot be undone.">
    <Footer>
        <Button Variant="outline" OnClick="@(() => open = false)">Cancel</Button>
        <Button Variant="destructive" OnClick="Delete">Delete</Button>
    </Footer>
</Dialog>

<DropdownMenu>
    <Trigger>Options</Trigger>
    <ChildContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem OnSelect="Edit">Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem OnSelect="Archive" Disabled>Archive</DropdownMenuItem>
    </ChildContent>
</DropdownMenu>
```

`Dialog` also takes `ShowCloseButton`, `CloseLabel`, `Appearance`, and `Class`;
`Esc`, a click outside, and the close button set `Open` to `false`.
`raxui add confirm-dialog` installs a centred confirmation (from boot-ui's
AlertDialog). A click outside nudges it instead of closing; Esc or Cancel run
`OnCancel`. `OnConfirm` may be async: the dialog shows a spinner, closes when it
finishes, and shows the message if it throws:

```razor
<ConfirmDialog @bind-Open="confirm" Title="Delete project?" Description="This removes it for everyone."
               Tone="destructive" ConfirmText="Delete" ConfirmationText="my-app" OnConfirm="DeleteAsync" />
```

`Tone` is `default`, `destructive`, `warning`, or `success`; also `ShowIcon`,
`CancelText`, `ConfirmationLabel`, `Layout` (`inline` or `stacked`), `OnCancel`,
`Appearance`, and `Class`.

`DropdownMenu` takes `TriggerVariant` (a Button variant, `secondary` by default),
`TriggerClass`, `Disabled`, `Appearance`, and `Class`; the menu supports arrow
keys, `Home`/`End`, and typeahead.

## Installation guarantees and limits

- Configuration and lock files record the CLI's embedded registry release. A newer
  CLI can keep adding components to a project; an older CLI refuses files written
  by a newer one. Files installed from another release whose content differs are
  never silently replaced by `init` or `add`; use the explicit Blazor `update` command.
- Custom install paths are not supported in this preview. Destinations and
  existing symlinks/junctions must stay inside the selected project.
- Locally edited and untracked destination files are never silently replaced.
- `add` installs a component's dependencies first, in one transaction with a
  single lock-file write. A dependency that is already installed is kept as it
  is, including your edits.
- Both CLIs write through a durable journal. If `init`, `add` or `update` is killed,
  the next run rolls the change back, or run `raxui recover` yourself. Files you
  changed afterwards stop automatic rollback; `raxui recover --keep-changes` keeps
  them and restores the rest. See [ADR 018](adr/018-blazor-cli-recovery.md) and
  the React [interrupted installation recovery](react.md#interrupted-installation-recovery).
- `init` and `add` support `button`, `dialog`, `confirm-dialog`, `dropdown-menu`,
  `field`, `form`, `form-section`, `input`, `input-group`, `textarea`, `checkbox`,
  `radio-group`, `switch`, `select`, `slider`, and `rating`. WebAssembly testing
  and configurable paths remain future work.

### Updating an existing Blazor application

Install or build the newer CLI first: its embedded registry is the update source.
From your app directory, preview and apply the changes:

```powershell
raxui update --dry-run
raxui update
dotnet build
```

Use `raxui update button` to update one installed component and its dependencies;
the shared theme is refreshed with either form. `--cwd <app-directory>` works on
both commands. A new dependency is installed automatically. Existing imports are
retained, new imports are added once, and obsolete, unmodified component files are
removed. The lockfile is written last; ordinary write failures roll the operation
back. A dry run never writes files and returns a nonzero exit code on conflicts.

Local changes are kept when the corresponding registry file is unchanged. If
both changed, the entire update stops before writing and reports every conflict.
Save your edits separately, restore the previous installed bytes, update, then
reapply the edits. Alternatively, replace the app file with the exact new registry
source and retry; this refreshes its baseline. Automatic three-way merges are not
provided. There is no force-overwrite option. Locally deleted managed files,
untracked destination files, and edits to the shared `raxui.css` also require
explicit recovery; keep custom theme rules in a separate app stylesheet.

Starter pages, layouts, `wwwroot/app.css`, and Bootstrap are not updated. Your
demo pages therefore remain app-owned. Keep `raxui.lock.json`: it supplies the
baseline needed to distinguish your changes from registry changes. React's Node
CLI does not yet provide this update workflow.
