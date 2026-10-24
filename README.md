# SheenUI

Formerly BlazorUI. See [the identity change and existing-app guidance](docs/adr/012-sheenui-identity.md).

Source-owned Blazor and React components with a shared theme, installed into your application by .NET and Node CLIs.
Licensed under [MIT](LICENSE).

للتجربة دون نشر الحزم: [دليل الاستخدام المحلي على Windows بالعربية](docs/local-development.ar.md).

For local usage without publishing packages: [Windows local usage guide in English](docs/local-development.en.md).

The first preview supports **Blazor Web Apps on .NET 8, 9, and 10 with
Interactive Server**, the template's Bootstrap, and the **Button** component.
On .NET 8, `init` upgrades the template's unmodified Bootstrap 5.1 to 5.3, which
the theme needs ([ADR 009](docs/adr/009-dotnet-8-9-10.md)). Installed components
run without the CLI or a registry connection.

## Quick start

Once the preview is published to NuGet:

```sh
dotnet tool install --global SheenUI.Cli --version 0.1.0-preview.2
dotnet new blazor --interactivity Server -n MyApp
cd MyApp
sheenui init
sheenui add button
```

`init` replaces the template's sidebar layout and sample pages with a SheenUI
app shell and a welcome page where you can try the theme, and replaces the
template `wwwroot/app.css` with a minimal one (validation, error boundary, and
heading focus styles only), so it no longer overrides the theme's buttons. It only replaces or
removes template files you have not changed; anything you edited is kept and
reported ([ADR 008](docs/adr/008-starter-app.md)).

Use Button in any page, for example a new `Components/Pages/Counter.razor`:

```razor
@page "/counter"
@rendermode InteractiveServer

<Button OnClick="@(() => count++)">Clicked @count times</Button>

@code {
    private int count;
}
```

`init` installs the shared theme as `wwwroot/css/sheenui/sheenui.css` and links
it after Bootstrap; `add button` copies `Components/UI/Button/Button.razor` and
adds its namespace to `_Imports.razor`. Keep the template Bootstrap and
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
<div data-sheen-appearance="glass" data-bs-theme="dark" data-sheen-accent="emerald" dir="rtl">
    <Button>Glass</Button>
    <Button Appearance="flat" Color="success">Flat override</Button>
</div>
```

### Icons

Components take any icon markup. For your own icons, SheenUI recommends Lucide
through [`Blazicons.Lucide`](https://github.com/kyleherzog/Blazicons.Lucide)
([ADR 014](docs/adr/014-icons.md)); icons follow the text color and the slot's size:

```razor
@* dotnet add package Blazicons.Lucide, then @using Blazicons in _Imports.razor *@
<Button><Blazicon Svg="Lucide.Trash" aria-hidden="true" /> Delete</Button>
```

### Dialog and DropdownMenu

`sheenui add dialog` and `sheenui add dropdown-menu` install overlays built on the
native `<dialog>` element and the `popover` attribute, each with a small
collocated `.razor.js` module ([ADR 013](docs/adr/013-overlay-primitives.md)).
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
`sheenui add confirm-dialog` installs a centred confirmation (from boot-ui's
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
  never silently replaced, because update commands are not supported yet.
- Custom install paths are not supported in this preview. Destinations and
  existing symlinks/junctions must stay inside the selected project.
- Locally edited and untracked destination files are never silently replaced.
- `add` installs a component's dependencies first, in one transaction with a
  single lock-file write. A dependency that is already installed is kept as it
  is, including your edits.
- Ordinary write failures restore original files and remove newly created empty
  directories. Concurrent edits and process termination during installation are
  not covered by that rollback guarantee.
- `init` and `add` for `button`, `dialog`, `confirm-dialog`, and `dropdown-menu` are supported. Additional components, update commands,
  WebAssembly, and configurable paths remain future work.

## React

A React library with the same theme lives in this repository: React 18.3/19 on
Vite 6+ or Next.js 15+ (App Router, no Tailwind), Bootstrap 5.3 SCSS, Radix UI, and a Node CLI (`npx sheenui-react init`,
`npx sheenui-react add button`). It is not published to npm yet. See
[docs/react.md](docs/react.md) for installation, usage, and customization.

## Build and test

Local checks are the default workflow during this development phase. After
`npm ci`, run `npm run check` during development and `npm run check:full` before
merging. See [local verification](docs/local-checks.md) for coverage and prerequisites.
الدليل العربي: [استخدام أدوات الفحص المحلي](docs/local-checks.ar.md).
ولـUbuntu وWSL 2: [الفحص على Linux](docs/local-checks-linux.ar.md).
GitHub CI runs only through **Actions → CI → Run workflow** after this change is
merged; pushes and pull requests do not start hosted jobs automatically.

Requires the .NET 8, 9, and 10 SDKs (the CLI multi-targets and the end-to-end
test builds an app on each) and PowerShell 7 for Playwright's install script.

```sh
dotnet restore SheenUI.slnx
dotnet build SheenUI.slnx -c Release --no-restore
pwsh tests/SheenUI.Integration.Tests/bin/Release/net10.0/playwright.ps1 install chromium
dotnet test SheenUI.slnx -c Release --no-build
dotnet pack src/SheenUI.Cli/SheenUI.Cli.csproj -c Release --no-build -o ./nupkg
dotnet tool install --tool-path ./local-tools --add-source ./nupkg SheenUI.Cli --version 0.1.0-preview.2
```

On Linux, use `install --with-deps chromium` to install browser system dependencies.
The E2E test generates and builds an application, runs it on an ephemeral local
port, checks two interactive clicks and computed styles, and stops the process.

React library (requires Node.js 22):

```sh
npm ci
npm run typecheck
npm test
npx playwright install chromium
npm run test:acceptance       # Vite (CREATE_VITE_VERSION, default 9.3.1)
npm run test:acceptance:next  # Next.js (CREATE_NEXT_APP_VERSION, default 16.4.3)
```

## Releases

Publishing remains deferred. The Release workflow is manual only and requires
the explicit `publish` option and an existing `v*` tag. Creating a tag alone does
not publish anything. When explicitly requested, the workflow builds and tests
the tagged source, packs the CLI, attaches the package to a GitHub Release, and
publishes to NuGet. The owner must configure
the `NUGET_API_KEY` repository secret scoped to `SheenUI.Cli` before tagging.
The tag version controls both the package and registry release identity; component
versions and their content hashes are independent.

See [the project brief](PROJECT_BRIEF.md), [architecture](ARCHITECTURE.md), and
[ADR 004](docs/adr/004-simplified-first-milestone.md) for scope and design decisions.
