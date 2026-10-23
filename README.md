# BlazorUI

Source-owned Blazor components installed into your application by a .NET CLI.
Licensed under [MIT](LICENSE).
The first preview supports **.NET 10 Blazor Web App with Interactive Server**,
the template's Bootstrap, and the **Button** component. Installed components run
without the CLI or a registry connection.

## Quick start

Once the preview is published to NuGet:

```sh
dotnet tool install --global BlazorUI.Cli --version 0.1.0-preview.1
dotnet new blazor --interactivity Server -n MyApp
cd MyApp
blazorui init
blazorui add button
```

In `Components/Pages/Home.razor`, use:

```razor
@page "/"
@rendermode InteractiveServer

<Button OnClick="@(() => count++)">Clicked @count times</Button>

@code {
    private int count;
}
```

The CLI copies Razor and isolated CSS into `Components/UI/Button`, adds its
namespace to `_Imports.razor`, and installs tokens/themes under
`wwwroot/css/blazorui`. Keep the template Bootstrap and application styles links.
Use `Variant` (`primary`, `secondary`, `outline`, `ghost`, `destructive`), `Size`
(`sm`, `md`, `lg`), `Disabled`, `Type`, `Class`, and `OnClick` to customize Button.

## Installation guarantees and limits

- Configuration and lock files pin the CLI's embedded registry release. Use the
  same CLI version when repeating commands; automatic version migration is not supported.
- Custom install paths are not supported in this preview. Destinations and
  existing symlinks/junctions must stay inside the selected project.
- Locally edited and untracked destination files are never silently replaced.
- Ordinary write failures restore original files and remove newly created empty
  directories. Concurrent edits and process termination during installation are
  not covered by that rollback guarantee.
- `init` and `add button` are supported. Additional components, update commands,
  WebAssembly, and configurable paths remain future work.

## Build and test

Requires the .NET 10 SDK and PowerShell 7 for Playwright's install script.

```sh
dotnet restore BlazorUI.slnx
dotnet build BlazorUI.slnx -c Release --no-restore
pwsh tests/BlazorUI.Integration.Tests/bin/Release/net10.0/playwright.ps1 install chromium
dotnet test BlazorUI.slnx -c Release --no-build
dotnet pack src/BlazorUI.Cli/BlazorUI.Cli.csproj -c Release --no-build -o ./nupkg
dotnet tool install --tool-path ./local-tools --add-source ./nupkg BlazorUI.Cli --version 0.1.0-preview.1
```

On Linux, use `install --with-deps chromium` to install browser system dependencies.
The E2E test generates and builds an application, runs it on an ephemeral local
port, checks two interactive clicks and computed styles, and stops the process.

## Releases

The `v*` tag workflow builds and tests the tagged source, packs the CLI, attaches
the package to a GitHub Release, and publishes to NuGet. The owner must configure
the `NUGET_API_KEY` repository secret scoped to `BlazorUI.Cli` before tagging.
The tag version controls both the package and registry release identity; component
versions and their content hashes are independent.

See [the project brief](PROJECT_BRIEF.md), [architecture](ARCHITECTURE.md), and
[ADR 004](docs/adr/004-simplified-first-milestone.md) for scope and design decisions.
