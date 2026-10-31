# ADR 021 — Blazor render modes

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

ADR 002 deferred static SSR-only apps, Interactive WebAssembly and Interactive Auto until tested. The components already avoid server-only APIs: they inject only `IJSRuntime`, `NavigationManager` and their own services, and import collocated `.razor.js` modules by `./Components/UI/...` paths. What blocked WebAssembly and Auto was installation. `dotnet new blazor --interactivity WebAssembly|Auto` creates two sibling projects. The server project holds `Components/App.razor`, Bootstrap and `Program.cs`. The `.Client` project (`Microsoft.NET.Sdk.BlazorWebAssembly`) holds whatever runs in the browser. Components installed into the server project cannot run in WebAssembly, because the client cannot reference the server.

## Decision

Support every render mode of a Blazor Web App on .NET 8, 9 and 10: static SSR, Interactive Server, Interactive WebAssembly and Interactive Auto, per page or global.

- `init`, `add` and `update` still run in the server project, which keeps `raxui.json`, `raxui.lock.json`, the shared styles and the `App.razor` links.
- When the server project references exactly one Blazor WebAssembly project, that client project receives `Components/UI`. Component usings go into both `_Imports.razor` files, so server pages and client pages can use the components. The namespace is the client's root namespace.
- Lock targets remain project-relative (`Components/UI/...`). Targets under `componentsPath` resolve against the client project; all others resolve against the server project. Every path is still validated against the project that owns it.
- The recovery journal (ADR 018) moves to the folder that holds both projects, so a single transaction covers writes to both. Each command recovers a journal in the project folder and in its parent folder.
- The client must be a sibling folder, as the template creates it. Running RaxUI inside the client project, or in a standalone Blazor WebAssembly app (`dotnet new blazorwasm`, which has `index.html` instead of `App.razor`), fails with a message saying where to run it.
- `init` no longer warns when an app has no interactive render mode. Static SSR is supported, so it prints a note instead. It warns when WebAssembly is registered but no client project is referenced.

The client project serves collocated JavaScript and scoped CSS at the same paths as the server project: `/Components/UI/...` and the bundle imported by `{App}.styles.css`. Components therefore need no changes.

## Consequences

- One install serves pages in any render mode. Services such as `ToastService` must be registered in both `Program.cs` files when they are used from WebAssembly or Auto pages, because prerendering runs on the server.
- The starter layout replaces template files in the server project only. The global WebAssembly template keeps its layout in the client, so the starter leaves that layout in place.
- Browser tests (`GeneratedAppTests.RenderModes`) generate Auto apps on .NET 8, 9 and 10 and a global WebAssembly app on .NET 10. They verify Dialog behavior, including its JavaScript module and .NET callbacks, in WebAssembly, Server and Auto pages, plus a static SSR page. The detailed per-component browser suites still run under Interactive Server.
