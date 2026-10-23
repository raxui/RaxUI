# Using BlazorUI locally on Windows 11

[العربية](local-development.ar.md) | English

Use this guide to try the library from your local checkout without publishing
packages to npm or NuGet. Run the commands in **PowerShell**. Examples assume
the repository is located at:

```text
C:\Users\saada\source\repos\BlazorUI
```

Adjust the paths for your machine. App creation commands require a new directory;
if you already have an app, go directly to its installation steps.

## 1. Prerequisites

- The .NET 10 SDK to build the repository tools, which target .NET 8, 9, and 10.
- The matching runtime/SDK when running a Blazor application targeting .NET 8 or 9.
- Node.js 22 or later with npm for React and Next.js.
- Internet access for the initial dependency downloads. A local CLI package does
  not include all consumer dependencies, such as Bootstrap and React.

Check your tools:

```powershell
dotnet --list-sdks
dotnet --list-runtimes
node --version
npm --version
```

Currently available: **Button**, a shared theme, a welcome page, and the `init`
and `add button` commands. Components are copied into your application as source
files that you can edit.

## 2. Build the local packages

Run these commands from the checkout you want to test:

```powershell
cd C:\Users\saada\source\repos\BlazorUI

# Blazor CLI package
dotnet pack .\src\BlazorUI.Cli\BlazorUI.Cli.csproj -c Release -o .\nupkg

# React and Next.js CLI package
npm ci
npm pack ./src/react-cli --pack-destination .
```

With the current versions, this produces:

```text
BlazorUI\nupkg\BlazorUI.Cli.0.1.0-preview.2.nupkg
BlazorUI\blazorui-react-0.1.0-preview.1.tgz
```

These commands only create local packages. Do not run `npm publish` or
`dotnet nuget push`. If the versions in the project files change, use the new
version numbers and filenames in the commands below.

## 3. Try Blazor

### Install the tool once

```powershell
cd C:\Users\saada\source\repos\BlazorUI
dotnet tool install --tool-path .\local-tools --add-source .\nupkg BlazorUI.Cli --version 0.1.0-preview.2
```

This installs the tool inside the repository rather than globally. If it is
already installed, use it directly. To test code changes without changing the
package version, run the CLI from source as described in section 7.

### Create a test application

```powershell
cd C:\Users\saada\source\repos
dotnet new blazor -n blazor-test --framework net10.0 --interactivity Server
cd blazor-test
```

For .NET 8 or 9, replace `net10.0` with `net8.0` or `net9.0` and install the
corresponding prerequisites. The supported application model is **Blazor Web App
with Interactive Server**.

### Install into a new or existing application

Open the directory containing your application's `.csproj`, then run:

```powershell
& "C:\Users\saada\source\repos\BlazorUI\local-tools\blazorui.exe" init
& "C:\Users\saada\source\repos\BlazorUI\local-tools\blazorui.exe" add button
dotnet build
dotnet run
```

Open the application URL printed in the terminal. `init` sets up the theme,
layout, and welcome page, and cleans up recognized, unmodified template files,
including the default `app.css`. Files you have changed are preserved and reported.

The component is installed at `Components/UI/Button/Button.razor`, and the theme
at `wwwroot/css/blazorui/blazorui.css`.

### Use Button

Create a page such as `Components/Pages/ButtonTest.razor`:

```razor
@page "/button-test"
@rendermode InteractiveServer

<Button OnClick="@(() => count++)">Clicks: @count</Button>
<Button Variant="outline" Color="success">Another button</Button>

@code {
    private int count;
}
```

Open `/button-test`. If `init` reports missing interactivity, check that
`Program.cs` includes:

```csharp
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
```

Add missing calls to your existing service registration and endpoint mapping;
do not duplicate them. The CLI reports the issue but does not edit `Program.cs`.

## 4. Try React with Vite

Create a TypeScript application using a tested Vite scaffolder version:

```powershell
cd C:\Users\saada\source\repos
npm create vite@6.5.0 react-test -- --template react-ts
cd react-test
npm install
```

Install the library in this application, or in an existing Vite 6+ application:

```powershell
npm install -D --save-exact --ignore-scripts "C:\Users\saada\source\repos\BlazorUI\blazorui-react-0.1.0-preview.1.tgz"
npx blazorui-react init
npm run dev
```

Open the URL printed in the terminal, usually `http://localhost:5173`.
`init` installs Button automatically; running `npx blazorui-react add button`
afterward does not install another copy.

The main installed files are:

```text
src/App.tsx                         Welcome page and application shell
src/components/ui/button.tsx         Component
src/lib/theme.tsx                    Theme provider
src/styles/blazorui.scss             Stylesheet entry point
src/styles/blazorui/                 Theme and component partials
```

Verify the production build:

```powershell
npm run build
```

## 5. Try Next.js

Requirements: **Next.js 15+, App Router, TypeScript, and no Tailwind**.
Create an application with this tested version:

```powershell
cd C:\Users\saada\source\repos
npx create-next-app@15.5.28 next-test --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
cd next-test
```

Inside the application, run:

```powershell
npm install -D --save-exact --ignore-scripts "C:\Users\saada\source\repos\BlazorUI\blazorui-react-0.1.0-preview.1.tgz"
npx blazorui-react init
npm run dev
```

Open the printed URL, usually `http://localhost:3000`. The CLI detects Next.js
automatically and uses these files:

```text
app/page.tsx                       Welcome page
app/layout.tsx                     Adds the theme import to the existing layout
components/ui/button.tsx           Component
lib/theme.tsx                      Theme provider
styles/blazorui.scss               Stylesheet entry point
```

With `--src-dir`, these files live under `src/` instead of the application root.
Do not import Bootstrap CSS separately; the library compiles it from SCSS.

To test production mode, stop the development server with `Ctrl+C`, then run:

```powershell
npm run build
npm run start
```

## 6. Try the theme and component

The welcome page includes `default`, `flat`, and `glass` appearances, light and
dark modes, accent colors, and LTR/RTL direction controls. Try them before
customizing the page.

Use the following React example in Vite's `src/App.tsx`. For Next.js
`app/page.tsx` without a `src/` directory, change the two imports to
`../components/ui/button` and `../lib/theme`:

```tsx
"use client"

import { Button } from "./components/ui/button"
import { BootThemeProvider } from "./lib/theme"

export default function App() {
  return (
    <BootThemeProvider className="bui-app" mode="dark" appearance="glass" direction="rtl">
      <Button onClick={() => alert("Saved")}>Save</Button>
      <Button variant="outline" appearance="flat">Cancel</Button>
    </BootThemeProvider>
  )
}
```

In Blazor, apply theme attributes to a component's container:

```razor
<div data-bs-theme="dark" data-bui-appearance="glass" dir="rtl">
    <Button>Save</Button>
</div>
```

The dark welcome page has a black background with corner gradients. To set the
page's initial theme, edit the `.bui-app` container in the Blazor layout, or the
state values in the React page.

## 7. Test library changes during development

**Updating the CLI does not automatically update installed component files.**
There is currently no `update` or `diff` command. Installing files from another
registry snapshot can report a conflict, and locally modified files are not
automatically overwritten.

The most reliable way to test a new change is to create a separate test
application, then initialize it from source or a freshly built local package.
Keep your existing application if it contains changes you want to preserve.

### Blazor: run the CLI from source

This bypasses the previously installed tool and package caching when reusing a
version number:

```powershell
cd C:\Users\saada\source\repos\BlazorUI
dotnet run --project .\src\BlazorUI.Cli -c Release -f net10.0 -- init --cwd "C:\Users\saada\source\repos\blazor-test-new"
dotnet run --project .\src\BlazorUI.Cli -c Release -f net10.0 -- add button --cwd "C:\Users\saada\source\repos\blazor-test-new"
```

Create the new application before running these commands.

### React and Next.js: rebuild the package

```powershell
cd C:\Users\saada\source\repos\BlazorUI
npm pack ./src/react-cli --pack-destination .
```

Then follow the installation and initialization steps in the new test
application. Rebuilding the `.tgz` alone does not change existing applications.

### When editing the theme in the library repository

The shared source is in `theme/scss/`. After editing it, run:

```powershell
cd C:\Users\saada\source\repos\BlazorUI
npm run theme:css
node src/react-cli/scripts/update-hashes.mjs
```

The first command regenerates Blazor's CSS; the second updates React file hashes.
Also update the CSS asset's SHA-256 in
`registry/components/button/manifest.json` before testing the Blazor CLI, then
rebuild the tool or run it from source. Make lasting style changes in SCSS and
regenerate the output rather than editing only the generated CSS.

## 8. Warnings and troubleshooting

| Symptom | Action |
| --- | --- |
| `DEP0190` during `init` | Rebuild the package from updated source and install it in your app. The fix runs npm through Node without a Windows shell. |
| Sass deprecation warnings from Bootstrap | The updated CLI adds compatibility settings to plain template configs. These temporarily suppress known deprecation categories; they do not upgrade Bootstrap's source. Other Sass warnings and errors remain enabled. |
| Next.js selects your user directory because of another lockfile | For plain templates, initialization sets `turbopack.root` and `outputFileTracingRoot`. Do not delete an unrelated parent lockfile just to suppress the message. |
| The CLI reports that it kept a customized config | Merge the options manually using the [React guide](react.md#tooling-diagnostics). The CLI does not guess how to edit custom configuration. |
| A conflict mentions an earlier registry release or modified files | Keep the lockfile. Test in a new app, or back up and manually review and merge changes. |
| The app runs but styling differs | Check that the library theme is loaded once, Bootstrap CSS is not duplicated, and template or custom CSS is not overriding the theme. |
| A Blazor button renders but does not respond | Check Interactive Server registration and the page or application's render mode. |

Sass compatibility settings apply to the selected deprecation categories across
the whole application build, including your own SCSS. Review the
[details and limitations](react.md#tooling-diagnostics), especially for monorepos
or linked dependencies outside the Next.js application root.

## 9. Verification checklist

- `dotnet build` or `npm run build` succeeds.
- The welcome page appears and its theme controls work.
- Button click handlers work.
- All three appearances work in light and dark modes and RTL.
- Repeating `init` and `add button` with the same version does not duplicate imports.
- You understand that components are application source files and updating the
  CLI alone does not update them.

For more information, see the [README](../README.md), [React guide](react.md),
and [shared theme guide](../theme/README.md).
